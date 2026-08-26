/**
 * Script: verify-engine.ts
 *
 * Golden-case verification harness for src/prompt-engine/** — no test
 * framework exists in this repo by design (see CLAUDE.md), so this runner is
 * hand-rolled from node:assert plus console output. Dependency-free by rule:
 * it imports only engine modules and node builtins inside plain functions, so
 * it can never affect `next build`.
 *
 * Sections run in order (parser → classifier → templates → rules →
 * generator) and each prints "N/M passed". Every case's engine calls execute exactly twice and
 * both results must serialize byte-identically — a divergence fails the case
 * as "<case> (determinism)". Failures never abort the run; the summary lists
 * every failed name and sets process.exitCode = 1 at the very end.
 *
 * Usage:
 *   npm run verify:engine
 */

import { enhancePrompt } from "../prompt-engine";
import { classifyPrompt } from "../prompt-engine/classifier/classify-prompt";
import { generateMarkdown } from "../prompt-engine/generator/generate-markdown";
import { detectContentSignals, extractFirstFencedCode } from "../prompt-engine/parser/detect-content-signals";
import { parsePrompt } from "../prompt-engine/parser/parse-prompt";
import { polishLight } from "../prompt-engine/rules/light-polish";
import { selectSections } from "../prompt-engine/rules/select-sections";
import { TEMPLATE_REGISTRY } from "../prompt-engine/templates/registry";
import { resolveTemplate } from "../prompt-engine/templates/resolve-template";
import type { PromptTemplate, SectionId } from "../prompt-engine/templates/template-types";
import { ENGINE_DATASET } from "./engine-dataset";
import {
  CLASSIFIER_CASES,
  GENERATOR_CASES,
  PARSER_CASES,
  PIPELINE_CASES,
  RULES_CASES,
  SIGNALS_CASES,
  TEMPLATE_CASES,
} from "./verify-cases";
import assert from "node:assert/strict";

/** Case-table item shapes, derived from ./verify-cases. */
type ParserCase = (typeof PARSER_CASES)[number];
type ClassifierCase = (typeof CLASSIFIER_CASES)[number];
type TemplateCase = (typeof TEMPLATE_CASES)[number];
type RulesCase = (typeof RULES_CASES)[number];
type GeneratorCase = (typeof GENERATOR_CASES)[number];
type PipelineCase = (typeof PIPELINE_CASES)[number];
type SignalsCase = (typeof SIGNALS_CASES)[number];

/** One recorded failure, echoed immediately and listed again in the summary. */
type Failure = {
  section: string;
  name: string;
  lines: string[];
};

/** Per-section tally printed as "N/M passed". */
type SectionResult = {
  name: string;
  passed: number;
  total: number;
};

/** Prints one failure to stderr and records it for the summary. */
function recordFailure(failures: Failure[], section: string, name: string, lines: string[]): void {
  failures.push({ section, name, lines });
  console.error(`FAIL ${section} / ${name}`);
  for (const line of lines) {
    console.error(`    ${line}`);
  }
}

/**
 * Verifies one parser case. Gate 1 (determinism): parse twice, require
 * byte-equal JSON serializations. Gate 2 (expectation): deepStrictEqual
 * against the golden table, which pins explicit-undefined keys exactly as the
 * parser emits them.
 */
function verifyParserCase(testCase: ParserCase, failures: Failure[]): void {
  const firstRun = parsePrompt(testCase.input);
  const secondRun = parsePrompt(testCase.input);

  if (JSON.stringify(firstRun) !== JSON.stringify(secondRun)) {
    recordFailure(failures, "parser", `${testCase.name} (determinism)`, [
      `run 1: ${JSON.stringify(firstRun)}`,
      `run 2: ${JSON.stringify(secondRun)}`,
    ]);
    return;
  }

  try {
    assert.deepStrictEqual(firstRun, testCase.expected);
  } catch {
    recordFailure(failures, "parser", testCase.name, [
      `expected: ${JSON.stringify(testCase.expected)}`,
      `got:      ${JSON.stringify(firstRun)}`,
    ]);
  }
}

/** Generic section driver: runs each case, counts it passed when silent. */
function runSection<Case>(
  sectionName: string,
  cases: ReadonlyArray<Case>,
  verifyCase: (item: Case, failures: Failure[]) => void,
  failures: Failure[],
): SectionResult {
  let passed = 0;
  for (const item of cases) {
    const failuresBefore = failures.length;
    verifyCase(item, failures);
    if (failures.length === failuresBefore) {
      passed += 1;
    }
  }
  return { name: sectionName, passed, total: cases.length };
}

/**
 * Verifies one classifier case. Gate 1 (determinism): the full parse →
 * classify pipeline runs twice and both results must serialize
 * byte-identically. Gate 2 (expectation): deepStrictEqual on the reported
 * taskType + category + band triple, then exact score and fallback asserts
 * when the case declares them, followed by inclusive confidence range asserts
 * when bounds are present.
 */
function verifyClassifierCase(testCase: ClassifierCase, failures: Failure[]): void {
  const firstRun = classifyPrompt(parsePrompt(testCase.input), testCase.input);
  const secondRun = classifyPrompt(parsePrompt(testCase.input), testCase.input);

  if (JSON.stringify(firstRun) !== JSON.stringify(secondRun)) {
    recordFailure(failures, "classifier", `${testCase.name} (determinism)`, [
      `run 1: ${JSON.stringify(firstRun)}`,
      `run 2: ${JSON.stringify(secondRun)}`,
    ]);
    return;
  }

  try {
    assert.deepStrictEqual(
      { taskType: firstRun.taskType, category: firstRun.category, band: firstRun.band },
      {
        taskType: testCase.expectedTaskType,
        category: testCase.expectedCategory,
        band: testCase.expectedBand,
      },
    );
    if (testCase.expectedScore !== undefined) {
      assert.strictEqual(
        firstRun.scores[testCase.expectedTaskType],
        testCase.expectedScore,
        `score for ${testCase.expectedTaskType} does not match`,
      );
    }
    if (testCase.expectedFallbackToGeneral !== undefined) {
      assert.strictEqual(
        firstRun.fallbackToGeneral,
        testCase.expectedFallbackToGeneral,
        "fallbackToGeneral does not match",
      );
    }
    if (testCase.minConfidence !== undefined) {
      assert.ok(
        firstRun.confidence >= testCase.minConfidence,
        `confidence ${firstRun.confidence} < min ${testCase.minConfidence}`,
      );
    }
    if (testCase.maxConfidence !== undefined) {
      assert.ok(
        firstRun.confidence <= testCase.maxConfidence,
        `confidence ${firstRun.confidence} > max ${testCase.maxConfidence}`,
      );
    }
  } catch {
    recordFailure(failures, "classifier", testCase.name, [
      `expected: taskType=${testCase.expectedTaskType} category=${testCase.expectedCategory} band=${testCase.expectedBand}`,
      ...(testCase.expectedScore === undefined ? [] : [`expected score=${testCase.expectedScore}`]),
      ...(testCase.expectedFallbackToGeneral === undefined
        ? []
        : [`expected fallbackToGeneral=${testCase.expectedFallbackToGeneral}`]),
      `got:      ${JSON.stringify(firstRun)}`,
    ]);
  }
}

/** Strength lists every template must define, in ascending order. */
const ENHANCEMENT_LEVELS = ["light", "standard", "detailed"] as const;

/**
 * True when every id of `sub` reappears in `superList` at a strictly later
 * index than the previous hit — i.e. an order-preserving subset (template
 * invariant b).
 */
function isOrderedSubset(sub: readonly SectionId[], superList: readonly SectionId[]): boolean {
  let cursor = 0;
  for (const id of sub) {
    const found = superList.indexOf(id, cursor);
    if (found === -1) {
      return false;
    }
    cursor = found + 1;
  }
  return true;
}

/**
 * Verifies one template case against TEMPLATE_REGISTRY. Gate 1
 * (determinism): two independent registry reads must serialize
 * byte-identically — pure data, so trivially true, kept for parity with the
 * parser/classifier gates. Gate 2 (structure): identity fields plus the
 * per-entry invariants (a)-(d):
 *
 *   (a) light is exactly ["objective"] for every task type;
 *   (b) standard is an order-preserving subset of detailed;
 *   (c) objective is the first element of every strength list;
 *   (d) no duplicate ids within any single strength list.
 */
function verifyTemplateCase(testCase: TemplateCase, failures: Failure[]): void {
  const firstRun: PromptTemplate | undefined = TEMPLATE_REGISTRY[testCase.taskType];
  const secondRun: PromptTemplate | undefined = TEMPLATE_REGISTRY[testCase.taskType];

  if (firstRun === undefined || secondRun === undefined) {
    recordFailure(failures, "templates", testCase.name, [`missing TEMPLATE_REGISTRY entry for "${testCase.taskType}"`]);
    return;
  }

  if (JSON.stringify(firstRun.sections) !== JSON.stringify(secondRun.sections)) {
    recordFailure(failures, "templates", `${testCase.name} (determinism)`, [
      `run 1: ${JSON.stringify(firstRun.sections)}`,
      `run 2: ${JSON.stringify(secondRun.sections)}`,
    ]);
    return;
  }

  try {
    assert.strictEqual(firstRun.id, testCase.taskType, "entry id must equal its registry key");
    assert.strictEqual(firstRun.category, testCase.expectedCategory, "entry category must match its recipe file");

    // (a) light strength is exactly ["objective"] for every task type.
    assert.deepStrictEqual(firstRun.sections.light, ["objective"], 'light must be exactly ["objective"]');

    for (const level of ENHANCEMENT_LEVELS) {
      const list: readonly SectionId[] = firstRun.sections[level];
      // (c) objective opens every strength list.
      assert.strictEqual(list[0], "objective", `"${level}" must open with "objective"`);
      // (d) no duplicate section ids within a strength list.
      assert.strictEqual(new Set(list).size, list.length, `"${level}" repeats a section id: ${JSON.stringify(list)}`);
    }

    // (b) standard is an order-preserving subset of detailed.
    const standard = firstRun.sections.standard;
    const detailed = firstRun.sections.detailed;
    assert.ok(
      isOrderedSubset(standard, detailed),
      `standard ${JSON.stringify(standard)} is not an order-preserving subset of detailed ${JSON.stringify(detailed)}`,
    );
  } catch (error) {
    recordFailure(failures, "templates", testCase.name, [error instanceof Error ? error.message : String(error)]);
  }
}

/**
 * Template invariant (e): the registry holds exactly the declared task
 * types — none missing, none extra — and exactly 13 entries.
 */
function verifyRegistryCompleteness(failures: Failure[]): void {
  try {
    const registeredKeys = Object.keys(TEMPLATE_REGISTRY).sort();
    const expectedKeys = TEMPLATE_CASES.map((entry) => entry.taskType).sort();
    assert.deepStrictEqual(registeredKeys, expectedKeys);
    assert.strictEqual(registeredKeys.length, 13);
  } catch (error) {
    recordFailure(failures, "templates", "registry completeness", [
      error instanceof Error ? error.message : String(error),
      `registered keys: ${JSON.stringify(Object.keys(TEMPLATE_REGISTRY).sort())}`,
    ]);
  }
}

/**
 * Templates section driver: the completeness gate counts as one check
 * alongside the 13 per-case checks, reported as a single section.
 */
function runTemplatesSection(failures: Failure[]): SectionResult {
  const beforeCompleteness = failures.length;
  verifyRegistryCompleteness(failures);

  const cases = runSection("templates", TEMPLATE_CASES, verifyTemplateCase, failures);
  return {
    name: cases.name,
    passed: cases.passed + (failures.length === beforeCompleteness ? 1 : 0),
    total: cases.total + 1,
  };
}

/**
 * Verifies one rules case, dispatched on its kind. Gate 1 (determinism):
 * the full pipeline (parse → polishLight for "light"; resolve → parse →
 * selectSections for "select") runs twice and both results must serialize
 * byte-identically. Gate 2 (expectation): deepStrictEqual against the pinned
 * sentence or ordered section list.
 */
function verifyRulesCase(testCase: RulesCase, failures: Failure[]): void {
  if (testCase.kind === "light") {
    const firstRun = polishLight(parsePrompt(testCase.input), testCase.input);
    const secondRun = polishLight(parsePrompt(testCase.input), testCase.input);

    if (JSON.stringify(firstRun) !== JSON.stringify(secondRun)) {
      recordFailure(failures, "rules", `${testCase.name} (determinism)`, [
        `run 1: ${JSON.stringify(firstRun)}`,
        `run 2: ${JSON.stringify(secondRun)}`,
      ]);
      return;
    }

    try {
      assert.deepStrictEqual(firstRun, testCase.expectedSentence);
    } catch {
      recordFailure(failures, "rules", testCase.name, [
        `expected: ${JSON.stringify(testCase.expectedSentence)}`,
        `got:      ${JSON.stringify(firstRun)}`,
      ]);
    }
    return;
  }

  const template = resolveTemplate(testCase.taskType);
  const firstRun = selectSections(template, testCase.level, parsePrompt(testCase.input));
  const secondRun = selectSections(template, testCase.level, parsePrompt(testCase.input));

  if (JSON.stringify(firstRun) !== JSON.stringify(secondRun)) {
    recordFailure(failures, "rules", `${testCase.name} (determinism)`, [
      `run 1: ${JSON.stringify(firstRun)}`,
      `run 2: ${JSON.stringify(secondRun)}`,
    ]);
    return;
  }

  try {
    assert.deepStrictEqual(firstRun, testCase.expectedSections);
  } catch {
    recordFailure(failures, "rules", testCase.name, [
      `expected: ${JSON.stringify(testCase.expectedSections)}`,
      `got:      ${JSON.stringify(firstRun)}`,
    ]);
  }
}

/** Verifies exact Markdown output and the generator's two-run determinism gate. */
function verifyGeneratorCase(testCase: GeneratorCase, failures: Failure[]): void {
  const options = { level: testCase.level };
  const firstRun = generateMarkdown(testCase.content, options);
  const secondRun = generateMarkdown(testCase.content, options);

  if (firstRun !== secondRun) {
    recordFailure(failures, "generator", `${testCase.name} (determinism)`, [
      `run 1: ${JSON.stringify(firstRun)}`,
      `run 2: ${JSON.stringify(secondRun)}`,
    ]);
    return;
  }

  try {
    assert.strictEqual(firstRun, testCase.expectedMarkdown);
  } catch {
    recordFailure(failures, "generator", testCase.name, [
      `expected: ${JSON.stringify(testCase.expectedMarkdown)}`,
      `got:      ${JSON.stringify(firstRun)}`,
    ]);
  }
}

/**
 * Verifies one content-signal case. Gate 1 (determinism): the scanner and
 * fence extractor each run twice per case and both results must serialize
 * byte-identically. Gate 2 (expectation): deepStrictEqual on the full signal
 * record, plus the exact first-fence extraction when the case declares it.
 */
function verifySignalsCase(testCase: SignalsCase, failures: Failure[]): void {
  const firstSignals = detectContentSignals(testCase.input);
  const secondSignals = detectContentSignals(testCase.input);
  const firstFence = extractFirstFencedCode(testCase.input);
  const secondFence = extractFirstFencedCode(testCase.input);

  if (
    JSON.stringify(firstSignals) !== JSON.stringify(secondSignals) ||
    JSON.stringify(firstFence) !== JSON.stringify(secondFence)
  ) {
    recordFailure(failures, "signals", `${testCase.name} (determinism)`, [
      `run 1 signals: ${JSON.stringify(firstSignals)}`,
      `run 2 signals: ${JSON.stringify(secondSignals)}`,
    ]);
    return;
  }

  try {
    assert.deepStrictEqual(firstSignals, testCase.expected);
    if (testCase.expectedFirstFence !== undefined) {
      assert.deepStrictEqual(firstFence, testCase.expectedFirstFence);
    }
  } catch {
    recordFailure(failures, "signals", testCase.name, [
      `expected signals: ${JSON.stringify(testCase.expected)}`,
      `got signals:      ${JSON.stringify(firstSignals)}`,
      ...(testCase.expectedFirstFence === undefined
        ? []
        : [
            `expected fence: ${JSON.stringify(testCase.expectedFirstFence)}`,
            `got fence:      ${JSON.stringify(firstFence)}`,
          ]),
    ]);
  }
}

/** Verifies the public pipeline's analysis contract, output structure, and no-throw behavior. */
function verifyPipelineCase(testCase: PipelineCase, failures: Failure[]): void {
  let firstRun: ReturnType<typeof enhancePrompt>;
  let secondRun: ReturnType<typeof enhancePrompt>;
  const sectionsBefore = testCase.options?.sections === undefined ? undefined : [...testCase.options.sections];

  try {
    const options = testCase.options ?? (testCase.level === undefined ? undefined : { level: testCase.level });
    firstRun = enhancePrompt(testCase.input, options);
    secondRun = enhancePrompt(testCase.input, options);
  } catch (error) {
    recordFailure(failures, "pipeline", testCase.name, [error instanceof Error ? error.message : String(error)]);
    return;
  }

  if (JSON.stringify(firstRun) !== JSON.stringify(secondRun)) {
    recordFailure(failures, "pipeline", `${testCase.name} (determinism)`, [
      `run 1: ${JSON.stringify(firstRun)}`,
      `run 2: ${JSON.stringify(secondRun)}`,
    ]);
    return;
  }

  try {
    if (sectionsBefore !== undefined) {
      assert.deepStrictEqual(testCase.options?.sections, sectionsBefore, "caller sections must not be mutated");
    }
    assert.deepStrictEqual(firstRun.analysis, testCase.expectedAnalysis);
    if (testCase.expectedResolved !== undefined) {
      assert.deepStrictEqual(firstRun.resolved, testCase.expectedResolved);
    }
    if (testCase.expectedMarkdown !== undefined) {
      assert.strictEqual(firstRun.markdown, testCase.expectedMarkdown);
    }
    if (testCase.expectedHeadings !== undefined) {
      const headings = firstRun.markdown.split("\n").filter((line) => line.startsWith("#"));
      assert.deepStrictEqual(headings, testCase.expectedHeadings);
    }
    if (testCase.input.trim().length > 0) {
      assert.ok(firstRun.markdown.length > 0, "non-empty input must produce non-empty Markdown");
    }
  } catch (error) {
    recordFailure(failures, "pipeline", testCase.name, [
      error instanceof Error ? error.message : String(error),
      `expected analysis: ${JSON.stringify(testCase.expectedAnalysis)}`,
      `got analysis:      ${JSON.stringify(firstRun.analysis)}`,
      `expected Markdown: ${JSON.stringify(testCase.expectedMarkdown)}`,
      `got Markdown:      ${JSON.stringify(firstRun.markdown)}`,
    ]);
  }
}

function verifyDatasetCase(testCase: (typeof ENGINE_DATASET)[number], failures: Failure[]): void {
  let firstRun: ReturnType<typeof enhancePrompt> | undefined;
  let secondRun: ReturnType<typeof enhancePrompt> | undefined;
  try {
    firstRun = enhancePrompt(testCase.input);
    secondRun = enhancePrompt(testCase.input);
    assert.equal(firstRun.analysis.taskType, testCase.expectedTaskType);
    assert.equal(JSON.stringify(firstRun), JSON.stringify(secondRun), "dataset case is not deterministic");
  } catch (error) {
    recordFailure(failures, "dataset", testCase.id, [
      error instanceof Error ? error.message : String(error),
      `expected task type: ${testCase.expectedTaskType}`,
      `got: ${JSON.stringify(firstRun ?? null)}`,
    ]);
  }
}

function main(): void {
  const failures: Failure[] = [];
  const sections: SectionResult[] = [
    runSection("parser", PARSER_CASES, verifyParserCase, failures),
    runSection("signals", SIGNALS_CASES, verifySignalsCase, failures),
    runSection("classifier", CLASSIFIER_CASES, verifyClassifierCase, failures),
    runTemplatesSection(failures),
    runSection("rules", RULES_CASES, verifyRulesCase, failures),
    runSection("generator", GENERATOR_CASES, verifyGeneratorCase, failures),
    runSection("pipeline", PIPELINE_CASES, verifyPipelineCase, failures),
    runSection("dataset", ENGINE_DATASET, verifyDatasetCase, failures),
  ];

  for (const section of sections) {
    console.log(`${section.name}: ${section.passed}/${section.total} passed`);
  }

  if (failures.length === 0) {
    const totalChecks = sections.reduce((sum, section) => sum + section.total, 0);
    console.log(`verify-engine: ALL PASS (${totalChecks} checks)`);
    return;
  }

  console.error(`verify-engine: ${failures.length} FAILURE(S)`);
  for (const failure of failures) {
    console.error(`  - ${failure.section} / ${failure.name}`);
  }
  process.exitCode = 1;
}

main();
