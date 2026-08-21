/**
 * Script: verify-engine.ts
 *
 * Golden-case verification harness for src/prompt-engine/** — no test
 * framework exists in this repo by design (see CLAUDE.md), so this runner is
 * hand-rolled from node:assert plus console output. Dependency-free by rule:
 * it imports only engine modules and node builtins inside plain functions, so
 * it can never affect `next build`.
 *
 * Sections run in order (parser → classifier → rules → generator) and each
 * prints "N/M passed". Every parse call executes exactly twice and both
 * results must serialize byte-identically — a divergence fails the case as
 * "<case> (determinism)". Failures never abort the run; the summary lists
 * every failed name and sets process.exitCode = 1 at the very end.
 *
 * Usage:
 *   npm run verify:engine
 */

import { parsePrompt } from "../prompt-engine/parser/parse-prompt";
import { CLASSIFIER_CASES, GENERATOR_CASES, PARSER_CASES, RULES_CASES } from "./verify-cases";
import assert from "node:assert/strict";

/** Case-table item shape, derived from ./verify-cases. */
type ParserCase = (typeof PARSER_CASES)[number];

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
 * Placeholder for sections whose case table exists but whose engine API has
 * not landed yet (classifier → rules → generator tasks). Empty tables report
 * 0/0 so every section stays visible in the output.
 */
function pendingSection(sectionName: string, cases: ReadonlyArray<never>): SectionResult {
  return { name: sectionName, passed: 0, total: cases.length };
}

function main(): void {
  const failures: Failure[] = [];
  const sections: SectionResult[] = [
    runSection("parser", PARSER_CASES, verifyParserCase, failures),
    pendingSection("classifier", CLASSIFIER_CASES),
    pendingSection("rules", RULES_CASES),
    pendingSection("generator", GENERATOR_CASES),
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
