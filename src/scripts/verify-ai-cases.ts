import { AiEnhancementClientError, createAiEnhancementClient } from "../lib/ai-enhancement/client";
import type { EnhancementRequestV1, EnhancementSelectionV1 } from "../lib/ai-enhancement/contracts";
import {
  ENHANCEMENT_API_VERSION,
  ENHANCEMENT_ERROR_CODES,
  ENHANCEMENT_LEVEL_CONFIG,
  EnhancementRequestV1Schema,
  EnhancementResponseV1Schema,
  MAX_CHARS_PER_ITEM,
  MAX_ITEMS_PER_SECTION,
  MAX_MODEL_OUTPUT_BYTES,
  MAX_NORMALIZED_MARKDOWN_CHARACTERS,
  MAX_PROMPT_CHARACTERS,
  MAX_REQUEST_BODY_BYTES,
  MAX_SELECTED_SECTIONS,
  OPENROUTER_MODEL,
} from "../lib/ai-enhancement/contracts";
import { enhanceDeterministically } from "../lib/ai-enhancement/deterministic-service";
import { getPromptPreset, PROMPT_PRESET_IDS, PROMPT_PRESETS } from "../lib/prompt-presets";
import type { EnhancementLevel, PromptCategory, PromptTaskType, SectionId } from "../prompt-engine";
import { enhancePrompt, resolveTemplate } from "../prompt-engine";
import { SECTION_TITLES } from "../prompt-engine/templates/template-types";
import { DEFAULT_OPENROUTER_TIMEOUT_MS, getAiConfig } from "../server/ai/config";
import { handleAiHttpRequest as apiEnhance, createAiHttpHandler } from "../server/ai/http-handler";
import { type GeneratedDocument, parseModelDocument, renderGeneratedMarkdown } from "../server/ai/model-output";
import { createOpenRouterAdapter } from "../server/ai/openrouter-adapter";
import { buildSystemInstruction, createOrchestrator } from "../server/ai/orchestrator";
import { resolveTrustedPolicy } from "../server/ai/policy-resolver";
import {
  MANUAL_TASK_POLICIES,
  PRESET_AI_POLICIES,
  type ResolvedSectionPolicy,
  type SectionFormat,
} from "../server/ai/preset-policies";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

function runAdapterScript(source: string): void {
  try {
    execFileSync(
      process.execPath,
      [
        require.resolve("ts-node/dist/bin.js"),
        "-P",
        "tsconfig.scripts.json",
        "-e",
        `// @ts-nocheck\n(async () => {\n${source}\n})().catch((error) => { console.error(error); process.exitCode = 1; });`,
      ],
      { cwd: process.cwd(), stdio: "pipe" },
    );
  } catch (error) {
    if (error && typeof error === "object" && "stderr" in error && Buffer.isBuffer(error.stderr)) {
      console.error(error.stderr.toString());
    }
    throw error;
  }
}

const TASK_TYPES = [
  "bug-fix",
  "feature",
  "code-review",
  "refactor",
  "testing",
  "documentation",
  "rewrite",
  "summarize",
  "research",
  "comparison",
  "ui-review",
  "image-prompt",
  "general",
] as const satisfies readonly PromptTaskType[];

const EXPECTED_SECTION_IDS = [
  "objective",
  "problem",
  "scope",
  "requirements",
  "constraints",
  "verification",
  "acceptance-criteria",
  "context",
  "implementation",
  "review-scope",
  "review-areas",
  "output-format",
  "research-scope",
  "key-questions",
  "audience",
  "outline",
  "source-content",
  "style-notes",
  "key-points",
  "comparison-scope",
  "criteria",
  "subject",
  "style-direction",
  "technical-requirements",
] as const satisfies readonly SectionId[];

type ExpectedPresetSnapshot = Readonly<{
  id: string;
  label: string;
  taskType: PromptTaskType;
  category: PromptCategory;
  level: EnhancementLevel;
  sections: readonly SectionId[];
}>;

const EXPECTED_PRESET_SNAPSHOT = [
  {
    id: "bug-fix",
    label: "Bug Fix",
    taskType: "bug-fix",
    category: "development",
    level: "standard",
    sections: ["objective", "requirements", "verification"],
  },
  {
    id: "build-feature",
    label: "Build Feature",
    taskType: "feature",
    category: "development",
    level: "standard",
    sections: ["objective", "requirements", "verification"],
  },
  {
    id: "code-review",
    label: "Code Review",
    taskType: "code-review",
    category: "development",
    level: "standard",
    sections: ["objective", "review-scope", "output-format"],
  },
  {
    id: "refactor",
    label: "Refactor",
    taskType: "refactor",
    category: "development",
    level: "standard",
    sections: ["objective", "requirements", "verification"],
  },
  {
    id: "testing",
    label: "Testing",
    taskType: "testing",
    category: "development",
    level: "standard",
    sections: ["objective", "requirements", "verification"],
  },
  {
    id: "documentation",
    label: "Documentation",
    taskType: "documentation",
    category: "development",
    level: "standard",
    sections: ["objective", "requirements", "output-format"],
  },
  {
    id: "api-design",
    label: "API Design",
    taskType: "feature",
    category: "development",
    level: "standard",
    sections: ["objective", "requirements", "verification"],
  },
  {
    id: "database",
    label: "Database",
    taskType: "feature",
    category: "development",
    level: "standard",
    sections: ["objective", "requirements", "verification"],
  },
  {
    id: "rewrite",
    label: "Rewrite",
    taskType: "rewrite",
    category: "writing",
    level: "standard",
    sections: ["objective", "requirements", "output-format"],
  },
  {
    id: "summarize",
    label: "Summarize",
    taskType: "summarize",
    category: "writing",
    level: "standard",
    sections: ["objective", "key-points", "output-format"],
  },
  {
    id: "improve-writing",
    label: "Improve Writing",
    taskType: "rewrite",
    category: "writing",
    level: "standard",
    sections: ["objective", "requirements", "output-format"],
  },
  {
    id: "research-topic",
    label: "Research Topic",
    taskType: "research",
    category: "research",
    level: "standard",
    sections: ["objective", "key-questions", "output-format"],
  },
  {
    id: "compare-options",
    label: "Compare Options",
    taskType: "comparison",
    category: "research",
    level: "standard",
    sections: ["objective", "criteria", "output-format"],
  },
  {
    id: "analyze-information",
    label: "Analyze Information",
    taskType: "research",
    category: "research",
    level: "standard",
    sections: ["objective", "key-questions", "output-format"],
  },
  {
    id: "ui-design",
    label: "UI Design",
    taskType: "ui-review",
    category: "design",
    level: "standard",
    sections: ["objective", "review-areas", "output-format"],
  },
  {
    id: "ux-review",
    label: "UX Review",
    taskType: "ui-review",
    category: "design",
    level: "standard",
    sections: ["objective", "review-areas", "output-format"],
  },
  {
    id: "image-prompt",
    label: "Image Prompt",
    taskType: "image-prompt",
    category: "design",
    level: "standard",
    sections: ["objective", "style-direction", "output-format"],
  },
] as const satisfies readonly ExpectedPresetSnapshot[];

const EXPECTED_SECTION_FORMATS = {
  objective: "paragraphs",
  problem: "paragraphs",
  scope: "paragraphs",
  requirements: "bullets",
  constraints: "bullets",
  verification: "bullets",
  "acceptance-criteria": "bullets",
  context: "paragraphs",
  implementation: "paragraphs",
  "review-scope": "paragraphs",
  "review-areas": "bullets",
  "output-format": "paragraphs",
  "research-scope": "paragraphs",
  "key-questions": "bullets",
  audience: "paragraphs",
  outline: "bullets",
  "source-content": "paragraphs",
  "style-notes": "paragraphs",
  "key-points": "bullets",
  "comparison-scope": "paragraphs",
  criteria: "bullets",
  subject: "paragraphs",
  "style-direction": "paragraphs",
  "technical-requirements": "bullets",
} as const satisfies Readonly<Record<SectionId, SectionFormat>>;

const SCORES = Object.fromEntries(TASK_TYPES.map((taskType) => [taskType, 0])) as Record<
  (typeof TASK_TYPES)[number],
  number
>;

const ANALYSIS = {
  original: "fix the login flow",
  category: "development",
  taskType: "bug-fix",
  confidence: 90,
  action: "fix",
  subject: "login flow",
  technologies: ["TypeScript"],
  constraints: ["keep the API stable"],
  requirements: ["add verification"],
  enhancementLevel: "standard",
} as const;

const CLASSIFICATION = {
  taskType: "bug-fix",
  category: "development",
  confidence: 90,
  band: "high",
  scores: SCORES,
  fallbackToGeneral: false,
  topMatches: ["bug-fix"],
} as const;

function request(selection: unknown, sections: readonly string[] = ["objective"]) {
  return {
    version: ENHANCEMENT_API_VERSION,
    prompt: "fix the login flow",
    selection,
    level: "standard",
    sections,
  };
}

function policyRequest(
  selection: EnhancementSelectionV1,
  options: { level?: "light" | "standard" | "detailed"; prompt?: string; sections?: readonly SectionId[] } = {},
): EnhancementRequestV1 {
  return {
    version: ENHANCEMENT_API_VERSION,
    prompt: options.prompt ?? "fix the login flow",
    selection,
    level: options.level ?? "standard",
    sections: options.sections ?? ["objective"],
  };
}

const MODEL_POLICY = resolveTrustedPolicy(
  policyRequest({ kind: "manual", taskType: "bug-fix" }, { sections: ["objective", "requirements", "verification"] }),
);

function validModelSections(): Array<{ id: SectionId; content: string[] }> {
  return [
    { id: "objective", content: ["Fix the login flow."] },
    { id: "requirements", content: ["Keep the API stable.", "Add verification."] },
    { id: "verification", content: ["Run the regression checks."] },
  ];
}

function modelJson(sections: unknown): string {
  return JSON.stringify({ sections });
}

function validResult() {
  return {
    analysis: ANALYSIS,
    classification: CLASSIFICATION,
    resolved: {
      presetId: "bug-fix",
      taskType: "bug-fix",
      category: "development",
      level: "standard",
      sections: ["objective"],
      reasoningEffort: "high",
    },
    markdown: "# Objective\n\nResolve the login flow.",
    generation: { kind: "ai", provider: "openrouter", model: OPENROUTER_MODEL },
  };
}

function assertCanonicalSection(
  section: ResolvedSectionPolicy,
  trustedGuidance: Readonly<Partial<Record<SectionId, string>>>,
): void {
  assert.ok(EXPECTED_SECTION_IDS.includes(section.id), `unknown resolved section ${section.id}`);
  assert.equal(section.title, SECTION_TITLES[section.id]);
  assert.equal(section.format, EXPECTED_SECTION_FORMATS[section.id]);

  const guidance = trustedGuidance[section.id];
  assert.ok(typeof guidance === "string" && guidance.trim().length > 0, `missing trusted guidance for ${section.id}`);
  assert.equal(section.guidance, guidance);
}

export const AI_CASES = [
  {
    name: "contract constants pin the version, model, and byte/character bounds",
    run: () => {
      assert.equal(ENHANCEMENT_API_VERSION, 1);
      assert.equal(OPENROUTER_MODEL, "stealth/ox-alpha");
      assert.equal(MAX_PROMPT_CHARACTERS, 15_000);
      assert.equal(MAX_REQUEST_BODY_BYTES, 128 * 1024);
      assert.equal(MAX_MODEL_OUTPUT_BYTES, 64 * 1024);
      assert.equal(MAX_NORMALIZED_MARKDOWN_CHARACTERS, 24_000);
      assert.equal(MAX_ITEMS_PER_SECTION, 20);
      assert.equal(MAX_CHARS_PER_ITEM, 2_000);
    },
  },
  {
    name: "every existing preset id is accepted without a second catalogue",
    run: () => {
      assert.equal(PROMPT_PRESET_IDS.length, 17);
      for (const presetId of PROMPT_PRESET_IDS) {
        const parsed = EnhancementRequestV1Schema.safeParse(request({ kind: "preset", presetId }));
        assert.equal(parsed.success, true, `preset ${presetId} was rejected`);
      }
    },
  },
  {
    name: "manual selection accepts auto and every engine task type",
    run: () => {
      for (const taskType of ["auto", ...TASK_TYPES]) {
        const parsed = EnhancementRequestV1Schema.safeParse(request({ kind: "manual", taskType }));
        assert.equal(parsed.success, true, `manual task type ${taskType} was rejected`);
      }
    },
  },
  {
    name: "selection union rejects cross-branch and unknown values",
    run: () => {
      assert.equal(EnhancementRequestV1Schema.safeParse(request({ kind: "preset", taskType: "auto" })).success, false);
      assert.equal(
        EnhancementRequestV1Schema.safeParse(request({ kind: "manual", presetId: "bug-fix" })).success,
        false,
      );
      assert.equal(
        EnhancementRequestV1Schema.safeParse(request({ kind: "other", presetId: "bug-fix" })).success,
        false,
      );
    },
  },
  {
    name: "browser request rejects provider controls and unknown root keys",
    run: () => {
      const forbiddenKeys = [
        "model",
        "provider",
        "messages",
        "tools",
        "plugins",
        "baseUrl",
        "apiKey",
        "policy",
        "taskType",
        "category",
        "purpose",
        "titles",
        "guidance",
        "headers",
      ];
      for (const key of forbiddenKeys) {
        assert.equal(
          EnhancementRequestV1Schema.safeParse({ ...request({ kind: "manual", taskType: "auto" }), [key]: "blocked" })
            .success,
          false,
          `${key} was accepted from the browser`,
        );
      }
    },
  },
  {
    name: "all enhancement levels map to the approved effort and token budget",
    run: () => {
      assert.deepEqual(ENHANCEMENT_LEVEL_CONFIG, {
        light: { reasoningEffort: "low", completionBudget: 2048 },
        standard: { reasoningEffort: "high", completionBudget: 8192 },
        detailed: { reasoningEffort: "max", completionBudget: 32768 },
      });
    },
  },
  {
    name: "blank prompts fail while valid surrounding whitespace is preserved",
    run: () => {
      assert.equal(
        EnhancementRequestV1Schema.safeParse(request({ kind: "manual", taskType: "auto" }, ["objective"])).success,
        true,
      );
      assert.equal(
        EnhancementRequestV1Schema.safeParse({
          ...request({ kind: "manual", taskType: "auto" }),
          prompt: " \t\n ",
        }).success,
        false,
      );
      const prompt = "  fix the login flow  ";
      const parsed = EnhancementRequestV1Schema.parse({
        ...request({ kind: "manual", taskType: "auto" }),
        prompt,
      });
      assert.equal(parsed.prompt, prompt);
    },
  },
  {
    name: "prompt maximum is inclusive and uses JavaScript string characters",
    run: () => {
      const atLimit = EnhancementRequestV1Schema.safeParse(
        request({ kind: "manual", taskType: "auto" }, ["objective"]),
      );
      const boundary = EnhancementRequestV1Schema.safeParse({
        ...request({ kind: "manual", taskType: "auto" }),
        prompt: "x".repeat(MAX_PROMPT_CHARACTERS),
      });
      const overLimit = EnhancementRequestV1Schema.safeParse({
        ...request({ kind: "manual", taskType: "auto" }),
        prompt: "x".repeat(MAX_PROMPT_CHARACTERS + 1),
      });
      assert.equal(atLimit.success, true);
      assert.equal(boundary.success, true);
      assert.equal(overLimit.success, false);
    },
  },
  {
    name: "selected sections may omit objective and cannot repeat",
    run: () => {
      // Objective may be omitted; users choose their own section mix.
      assert.equal(
        EnhancementRequestV1Schema.safeParse(request({ kind: "manual", taskType: "auto" }, ["requirements"])).success,
        true,
      );
      assert.equal(
        EnhancementRequestV1Schema.safeParse(request({ kind: "manual", taskType: "auto" }, ["objective", "objective"]))
          .success,
        false,
      );
    },
  },
  {
    name: "selected sections accept reordered controls and are canonicalized with objective first",
    run: () => {
      const parsed = EnhancementRequestV1Schema.safeParse(
        request({ kind: "manual", taskType: "bug-fix" }, ["verification", "objective", "requirements"]),
      );
      assert.equal(parsed.success, true);
      if (!parsed.success) return;

      const resolved = resolveTrustedPolicy(parsed.data);
      assert.deepEqual(
        resolved.sections.map((section) => section.id),
        ["objective", "requirements", "verification"],
      );
    },
  },
  {
    name: "selected sections have a bounded, known vocabulary",
    run: () => {
      assert.ok(MAX_SELECTED_SECTIONS <= EXPECTED_SECTION_IDS.length);
      assert.equal(
        EnhancementRequestV1Schema.safeParse(
          request({ kind: "manual", taskType: "auto" }, EXPECTED_SECTION_IDS.slice(0, MAX_SELECTED_SECTIONS)),
        ).success,
        true,
      );
      assert.equal(
        EnhancementRequestV1Schema.safeParse(
          request({ kind: "manual", taskType: "auto" }, [...EXPECTED_SECTION_IDS, "not-a-section"]),
        ).success,
        false,
      );
    },
  },
  {
    name: "success response parses deterministic and AI generation descriptors",
    run: () => {
      const ai = EnhancementResponseV1Schema.safeParse({
        version: ENHANCEMENT_API_VERSION,
        ok: true,
        requestId: "req-1",
        result: validResult(),
      });
      const deterministic = EnhancementResponseV1Schema.safeParse({
        version: ENHANCEMENT_API_VERSION,
        ok: true,
        requestId: "req-2",
        result: { ...validResult(), generation: { kind: "deterministic" } },
      });
      assert.equal(ai.success, true);
      assert.equal(deterministic.success, true);
    },
  },
  {
    name: "error response parses every approved error code and retry metadata",
    run: () => {
      for (const code of ENHANCEMENT_ERROR_CODES) {
        const parsed = EnhancementResponseV1Schema.safeParse({
          version: ENHANCEMENT_API_VERSION,
          ok: false,
          requestId: `req-${code}`,
          error: { code, message: "contract test", retryable: code === "service_busy", retryAfterSeconds: 3 },
        });
        assert.equal(parsed.success, true, `error code ${code} was rejected`);
      }
    },
  },
  {
    name: "response parser rejects malformed success and error payloads",
    run: () => {
      assert.equal(
        EnhancementResponseV1Schema.safeParse({
          version: ENHANCEMENT_API_VERSION,
          ok: true,
          requestId: "req-1",
          result: { ...validResult(), generation: { kind: "ai", provider: "other", model: OPENROUTER_MODEL } },
        }).success,
        false,
      );
      assert.equal(
        EnhancementResponseV1Schema.safeParse({
          version: ENHANCEMENT_API_VERSION,
          ok: false,
          requestId: "req-2",
          error: { code: "not-an-error", message: "bad", retryable: false },
        }).success,
        false,
      );
    },
  },
  {
    name: "trusted policy records cover every preset and manual task",
    run: () => {
      assert.deepEqual(Object.keys(PRESET_AI_POLICIES), PROMPT_PRESET_IDS);
      assert.deepEqual(Object.keys(MANUAL_TASK_POLICIES), TASK_TYPES);

      for (const policy of Object.values(PRESET_AI_POLICIES)) {
        assert.ok(policy.purpose.length > 0);
        assert.ok(policy.sections.length > 0);
      }
      for (const policy of Object.values(MANUAL_TASK_POLICIES)) {
        assert.ok(policy.purpose.length > 0);
        assert.ok(policy.sections.length > 0);
      }
    },
  },
  {
    name: "preset registry matches the immutable expected snapshot",
    run: () => {
      const expectedIds = EXPECTED_PRESET_SNAPSHOT.map((preset) => preset.id);
      assert.deepEqual(PROMPT_PRESET_IDS, expectedIds);
      assert.deepEqual(
        PROMPT_PRESETS.map(({ id, label, taskType, category, level, sections }) => ({
          id,
          label,
          taskType,
          category,
          level,
          sections,
        })),
        EXPECTED_PRESET_SNAPSHOT,
      );
      assert.deepEqual(Object.keys(PRESET_AI_POLICIES), expectedIds);

      for (const expected of EXPECTED_PRESET_SNAPSHOT) {
        const preset = getPromptPreset(expected.id);
        assert.ok(preset);
        assert.deepEqual(preset, expected);

        const trustedPolicy = PRESET_AI_POLICIES[expected.id];
        assert.equal(trustedPolicy.presetId, expected.id);
        assert.deepEqual(
          trustedPolicy.sections.map((section) => section.id),
          expected.sections,
        );

        const resolved = resolveTrustedPolicy(
          policyRequest(
            { kind: "preset", presetId: expected.id },
            { level: expected.level, sections: expected.sections },
          ),
        );
        assert.deepEqual(
          {
            presetId: resolved.presetId,
            taskType: resolved.taskType,
            category: resolved.category,
            level: resolved.level,
            sections: resolved.sections.map((section) => section.id),
          },
          {
            presetId: expected.id,
            taskType: expected.taskType,
            category: expected.category,
            level: expected.level,
            sections: expected.sections,
          },
        );
        for (const section of resolved.sections) assertCanonicalSection(section, trustedPolicy.sectionGuidance);
      }
    },
  },
  {
    name: "preset resolution uses the server registry task category level and standard sections",
    run: () => {
      for (const presetId of PROMPT_PRESET_IDS) {
        const preset = getPromptPreset(presetId);
        assert.ok(preset);
        const trustedPolicy = PRESET_AI_POLICIES[presetId];
        const resolved = resolveTrustedPolicy(
          policyRequest({ kind: "preset", presetId }, { level: preset.level, sections: preset.sections }),
        );

        assert.equal(resolved.presetId, preset.id);
        assert.equal(resolved.taskType, preset.taskType);
        assert.equal(resolved.category, preset.category);
        assert.deepEqual(
          resolved.sections.map((section) => section.id),
          preset.sections,
        );
        for (const section of resolved.sections) assertCanonicalSection(section, trustedPolicy.sectionGuidance);
      }
    },
  },
  {
    name: "label-specific preset aliases retain distinct purpose and guidance",
    run: () => {
      const pairs = [
        { leftId: "api-design", rightId: "build-feature", fields: ["objective", "requirements", "verification"] },
        { leftId: "api-design", rightId: "database", fields: ["objective", "requirements", "verification"] },
        { leftId: "database", rightId: "build-feature", fields: ["objective", "requirements", "verification"] },
        { leftId: "improve-writing", rightId: "rewrite", fields: ["objective", "requirements", "output-format"] },
        {
          leftId: "analyze-information",
          rightId: "research-topic",
          fields: ["objective", "key-questions", "output-format"],
        },
        { leftId: "ui-design", rightId: "ux-review", fields: ["objective", "review-areas", "output-format"] },
      ] as const;

      for (const { leftId, rightId, fields } of pairs) {
        const left = PRESET_AI_POLICIES[leftId];
        const right = PRESET_AI_POLICIES[rightId];
        assert.notEqual(left.purpose, right.purpose, `${leftId} and ${rightId} share a purpose`);
        assert.notDeepEqual(left.sections, right.sections, `${leftId} and ${rightId} share section guidance`);
        for (const field of fields) {
          assert.notEqual(
            left.sectionGuidance[field],
            right.sectionGuidance[field],
            `${leftId} and ${rightId} share ${field} guidance`,
          );
        }
      }
    },
  },
  {
    name: "manual explicit task types resolve through all thirteen task policies",
    run: () => {
      for (const taskType of TASK_TYPES) {
        const resolved = resolveTrustedPolicy(policyRequest({ kind: "manual", taskType }));
        assert.equal(resolved.presetId, null);
        assert.equal(resolved.taskType, taskType);
        assert.equal(resolved.category, MANUAL_TASK_POLICIES[taskType].category);
        const standardSections = MANUAL_TASK_POLICIES[taskType].sections.map((section) => section.id);
        const standardResolved = resolveTrustedPolicy(
          policyRequest({ kind: "manual", taskType }, { sections: standardSections }),
        );
        assert.deepEqual(
          standardResolved.sections.map((section) => section.id),
          standardSections,
        );
        for (const section of standardResolved.sections) {
          assertCanonicalSection(section, MANUAL_TASK_POLICIES[taskType].sectionGuidance);
        }
      }
    },
  },
  {
    name: "every resolved section uses canonical titles formats and trusted guidance",
    run: () => {
      assert.deepEqual(Object.keys(SECTION_TITLES), EXPECTED_SECTION_IDS);
      assert.deepEqual(Object.keys(EXPECTED_SECTION_FORMATS), EXPECTED_SECTION_IDS);

      for (const taskType of TASK_TYPES) {
        const policy = MANUAL_TASK_POLICIES[taskType];
        for (const level of ["light", "standard", "detailed"] as const) {
          const sections = resolveTemplate(taskType).sections[level];
          const resolved = resolveTrustedPolicy(policyRequest({ kind: "manual", taskType }, { level, sections }));
          for (const section of resolved.sections) assertCanonicalSection(section, policy.sectionGuidance);
        }
      }
    },
  },
  {
    name: "manual Auto uses pure classification facts and the classified task policy",
    run: () => {
      const resolved = resolveTrustedPolicy(
        policyRequest(
          { kind: "manual", taskType: "auto" },
          {
            prompt: "Compare the options and explain the trade-off.",
            sections: ["objective", "output-format", "criteria"],
          },
        ),
      );

      assert.equal(resolved.presetId, null);
      assert.equal(resolved.taskType, "comparison");
      assert.equal(resolved.category, "research");
      assert.deepEqual(
        resolved.sections.map((section) => section.id),
        ["objective", "criteria", "output-format"],
      );
      for (const section of resolved.sections) {
        assertCanonicalSection(section, MANUAL_TASK_POLICIES.comparison.sectionGuidance);
      }
    },
  },
  {
    name: "manual Auto accepts the current default controls and retains sections across level changes",
    run: () => {
      const auto = resolveTrustedPolicy(
        policyRequest(
          { kind: "manual", taskType: "auto" },
          {
            prompt: "Fix my login because it sometimes fails",
            level: "standard",
            sections: ["objective", "requirements", "constraints", "verification"],
          },
        ),
      );
      assert.equal(auto.taskType, "bug-fix");
      assert.deepEqual(
        auto.sections.map((section) => section.id),
        ["objective", "requirements", "verification", "constraints"],
      );

      const retained = resolveTrustedPolicy(
        policyRequest(
          { kind: "manual", taskType: "bug-fix" },
          {
            level: "standard",
            sections: ["verification", "problem", "objective", "constraints", "requirements", "scope"],
          },
        ),
      );
      assert.deepEqual(
        retained.sections.map((section) => section.id),
        ["objective", "requirements", "verification", "problem", "scope", "constraints"],
      );
    },
  },
  {
    name: "trusted section resolution drops disallowed ids and preserves canonical order",
    run: () => {
      const reversed = resolveTrustedPolicy(
        policyRequest(
          { kind: "manual", taskType: "bug-fix" },
          {
            sections: ["objective", "verification", "requirements"],
          },
        ),
      );
      assert.deepEqual(
        reversed.sections.map((section) => section.id),
        ["objective", "requirements", "verification"],
      );
      for (const section of reversed.sections) {
        assertCanonicalSection(section, MANUAL_TASK_POLICIES["bug-fix"].sectionGuidance);
      }

      // Disallowed-but-known ids are dropped by the trusted policy instead of
      // being honored; objective always survives so output stays non-empty.
      const dropped = resolveTrustedPolicy(
        policyRequest({ kind: "manual", taskType: "summarize" }, { sections: ["objective", "requirements"] }),
      );
      assert.deepEqual(
        dropped.sections.map((section) => section.id),
        ["objective"],
      );

      // Regression: the workspace default four-section selection must resolve
      // for every task type instead of failing policy resolution.
      const workspaceDefaults = ["objective", "requirements", "constraints", "verification"] as const;
      const generalResolved = resolveTrustedPolicy(
        policyRequest({ kind: "manual", taskType: "general" }, { sections: [...workspaceDefaults] }),
      );
      assert.deepEqual(
        generalResolved.sections.map((section) => section.id),
        ["objective", "requirements", "verification"],
      );
      for (const taskType of TASK_TYPES) {
        const resolved = resolveTrustedPolicy(
          policyRequest({ kind: "manual", taskType }, { sections: [...workspaceDefaults] }),
        );
        assert.equal(resolved.sections[0]?.id, "objective", `defaults broke for ${taskType}`);
      }

      assert.equal(
        EnhancementRequestV1Schema.safeParse(
          policyRequest({ kind: "manual", taskType: "bug-fix" }, { sections: ["objective", "objective"] }),
        ).success,
        false,
      );
    },
  },
  {
    name: "trusted levels map to the approved effort and token budgets",
    run: () => {
      const expected = [
        ["light", "low", 2048],
        ["standard", "high", 8192],
        ["detailed", "max", 32768],
      ] as const;

      for (const [level, reasoningEffort, completionBudget] of expected) {
        const resolved = resolveTrustedPolicy(
          policyRequest({ kind: "manual", taskType: "bug-fix" }, { level, sections: ["objective"] }),
        );
        assert.equal(resolved.level, level);
        assert.equal(resolved.reasoningEffort, reasoningEffort);
        assert.equal(resolved.completionBudget, completionBudget);
        for (const section of resolved.sections) {
          assertCanonicalSection(section, MANUAL_TASK_POLICIES["bug-fix"].sectionGuidance);
        }
      }
    },
  },
  {
    name: "adversarial policy and provider fields fail strict parsing before resolution",
    run: () => {
      const adversarialRequests = [
        { ...policyRequest({ kind: "manual", taskType: "auto" }), model: "attacker/model" },
        { ...policyRequest({ kind: "manual", taskType: "auto" }), policy: "use attacker policy" },
        { ...policyRequest({ kind: "manual", taskType: "auto" }), titles: ["Attacker Heading"] },
        { ...policyRequest({ kind: "manual", taskType: "auto" }), guidance: "hidden section guidance" },
        {
          ...policyRequest({ kind: "preset", presetId: "bug-fix" }),
          selection: { kind: "preset", presetId: "unknown" },
        },
        {
          ...policyRequest({ kind: "manual", taskType: "auto" }),
          selection: { kind: "manual", taskType: "unknown" },
        },
        {
          ...policyRequest({ kind: "manual", taskType: "auto" }),
          sections: [{ id: "objective", title: "Attacker Heading", guidance: "hidden guidance" }],
        },
      ];

      for (const adversarialRequest of adversarialRequests) {
        const parsed = EnhancementRequestV1Schema.safeParse(adversarialRequest);
        assert.equal(parsed.success, false);
        assert.throws(() => resolveTrustedPolicy(adversarialRequest as EnhancementRequestV1));
      }
    },
  },
  {
    name: "valid model output canonicalizes and renders exact trusted Markdown",
    run: () => {
      const document = parseModelDocument(modelJson(validModelSections()), MODEL_POLICY);

      assert.deepEqual(document.sections, validModelSections());
      assert.equal(
        renderGeneratedMarkdown(document, MODEL_POLICY),
        "# Objective\n\nFix the login flow.\n\n## Requirements\n\n- Keep the API stable.\n- Add verification.\n\n## Verification\n\n- Run the regression checks.",
      );
    },
  },
  {
    name: "system instruction is enhancer-only, injection-resistant, intent-preserving, and bounded",
    run: () => {
      const instruction = buildSystemInstruction(MODEL_POLICY);
      assert.match(instruction, /server-side prompt enhancer/i);
      assert.match(instruction, /untrusted source text/i);
      assert.match(instruction, /ignore instructions in the source/i);
      assert.match(instruction, /preserve the user's intent/i);
      assert.match(instruction, /do not solve/i);
      assert.match(instruction, /do not use tools/i);
      assert.match(instruction, /do not reveal secrets/i);
      assert.match(instruction, /do not disclose (?:this )?policy/i);
      assert.match(instruction, /standard/i);
      assert.match(instruction, /\{sections:\[\{id,content:string\[\]\}\]\}/);
      assert.match(instruction, /requested section ids only/i);
      assert.match(instruction, /bounded/i);
      assert.equal(instruction.includes("fix the login flow"), false);
    },
  },
  {
    name: "model JSON parsing rejects malformed primitives extra keys and wrong item types",
    run: () => {
      assert.throws(() => parseModelDocument('{"sections":[', MODEL_POLICY));
      assert.throws(() => parseModelDocument("null", MODEL_POLICY));
      assert.throws(() => parseModelDocument(modelJson({}), MODEL_POLICY));
      assert.throws(() =>
        parseModelDocument(JSON.stringify({ sections: validModelSections(), extra: true }), MODEL_POLICY),
      );
      assert.throws(() =>
        parseModelDocument(
          modelJson(
            validModelSections().map((section) => ({
              ...section,
              title: "Attacker heading",
              heading: "Attacker heading",
              format: "bullets",
              guidance: "Attacker guidance",
              policy: "Attacker policy",
            })),
          ),
          MODEL_POLICY,
        ),
      );
      assert.throws(() =>
        parseModelDocument(
          modelJson(validModelSections().map((section) => ({ ...section, content: ["valid", 42] }))),
          MODEL_POLICY,
        ),
      );
    },
  },
  {
    name: "model JSON parsing rejects duplicate root object keys before Zod",
    run: () => {
      const valid = modelJson(validModelSections());
      const duplicateRoot = valid.replace(
        /^(\{"sections":.*)(\})$/,
        `$1,"sections":${JSON.stringify(validModelSections())}$2`,
      );

      assert.throws(() => parseModelDocument(duplicateRoot, MODEL_POLICY));
    },
  },
  {
    name: "model JSON parsing rejects duplicate nested object keys before Zod",
    run: () => {
      const duplicateNested =
        '{"sections":[{"id":"objective","id":"objective","content":["Fix the login flow."]},{"id":"requirements","content":["Keep the API stable.","Add verification."]},{"id":"verification","content":["Run the regression checks."]}]}';

      assert.throws(() => parseModelDocument(duplicateNested, MODEL_POLICY));
    },
  },
  {
    name: "model sections must be complete unique known and policy-allowed",
    run: () => {
      const valid = validModelSections();
      assert.throws(() => parseModelDocument(modelJson(valid.slice(0, 2)), MODEL_POLICY));
      assert.throws(() =>
        parseModelDocument(modelJson([...valid, { id: "not-a-section", content: ["unknown"] }]), MODEL_POLICY),
      );
      assert.throws(() => parseModelDocument(modelJson([valid[0], valid[1], valid[1]]), MODEL_POLICY));
      assert.throws(() =>
        parseModelDocument(modelJson([...valid, { id: "scope", content: ["disallowed"] }]), MODEL_POLICY),
      );
      assert.throws(() =>
        parseModelDocument(modelJson(valid.map((section) => ({ ...section, content: [" "] }))), MODEL_POLICY),
      );
    },
  },
  {
    name: "public renderer validates documents and preserves trusted policy order",
    run: () => {
      const valid = validModelSections();
      const validDocument: GeneratedDocument = { sections: [...valid].reverse() };
      const expected =
        "# Objective\n\nFix the login flow.\n\n## Requirements\n\n- Keep the API stable.\n- Add verification.\n\n## Verification\n\n- Run the regression checks.";

      assert.equal(renderGeneratedMarkdown(validDocument, MODEL_POLICY), expected);

      const invalidDocuments: unknown[] = [
        { sections: [valid[0], valid[1], valid[1], valid[2]] },
        { sections: [...valid, { id: "not-a-section", content: ["unknown"] }] },
        { sections: valid.slice(0, 2) },
        { sections: [...valid, { id: "scope", content: ["disallowed"] }] },
        { sections: valid.map((section) => ({ ...section, content: [" "] })) },
        { sections: valid.map((section) => ({ ...section, content: [42] })) },
        { sections: valid.map((section) => ({ ...section, content: ["x".repeat(MAX_CHARS_PER_ITEM + 1)] })) },
        {
          sections: valid.map((section) => ({
            ...section,
            content: Array.from({ length: MAX_ITEMS_PER_SECTION + 1 }, () => "item"),
          })),
        },
        {
          sections: valid.map((section) => ({
            ...section,
            content: Array.from({ length: 20 }, () => "x".repeat(2_000)),
          })),
        },
      ];

      for (const invalidDocument of invalidDocuments) {
        assert.throws(() => renderGeneratedMarkdown(invalidDocument as GeneratedDocument, MODEL_POLICY));
      }
    },
  },
  {
    name: "model item and raw output limits reject oversized responses",
    run: () => {
      const overItems = validModelSections().map((section) =>
        section.id === "requirements" ? { ...section, content: Array.from({ length: 21 }, () => "item") } : section,
      );
      assert.throws(() => parseModelDocument(modelJson(overItems), MODEL_POLICY));

      const overCharacters = validModelSections().map((section) =>
        section.id === "objective" ? { ...section, content: ["x".repeat(MAX_CHARS_PER_ITEM + 1)] } : section,
      );
      assert.throws(() => parseModelDocument(modelJson(overCharacters), MODEL_POLICY));

      assert.throws(() => parseModelDocument("x".repeat(MAX_MODEL_OUTPUT_BYTES + 1), MODEL_POLICY));

      const normalizedOverflow = validModelSections().map((section) => ({
        ...section,
        content: Array.from({ length: 10 }, () => "x".repeat(1_000)),
      }));
      const normalizedOverflowRaw = modelJson(normalizedOverflow);
      assert.ok(new TextEncoder().encode(normalizedOverflowRaw).byteLength <= MAX_MODEL_OUTPUT_BYTES);
      assert.throws(() => parseModelDocument(normalizedOverflowRaw, MODEL_POLICY));
    },
  },
  {
    name: "rendered output overflow maps to output_too_large",
    run: () => {
      runAdapterScript(`
        const assert = require("node:assert/strict");
        const { createOrchestrator } = require("./src/server/ai/orchestrator");

        const content = Array.from({ length: 5 }, () => "x".repeat(1_900));
        const orchestrator = createOrchestrator({
          admission: {
            acquire: async () => ({ status: "admitted", leaseId: "lease-output", expiresAt: 1, retryAfterMs: 0, retryAfterSeconds: 0, activeCount: 1, prunedCount: 0 }),
            release: async () => undefined,
          },
          model: {
            complete: async () => JSON.stringify({
              sections: [
                { id: "objective", content },
                { id: "requirements", content },
                { id: "verification", content },
              ],
            }),
          },
          requestId: () => "req-output",
        });
        await assert.rejects(
          orchestrator.enhance({
            version: 1,
            prompt: "fix the login flow",
            selection: { kind: "manual", taskType: "bug-fix" },
            level: "standard",
            sections: ["objective", "requirements", "verification"],
          }, { signal: new AbortController().signal }),
          (error) => error.code === "output_too_large",
        );
      `);
    },
  },
  {
    name: "model order is canonicalized to trusted policy order",
    run: () => {
      const reversed = validModelSections().reverse();
      const document = parseModelDocument(modelJson(reversed), MODEL_POLICY);

      assert.deepEqual(
        document.sections.map((section) => section.id),
        ["objective", "requirements", "verification"],
      );
      assert.match(
        renderGeneratedMarkdown(document, MODEL_POLICY),
        /^# Objective\n\n[\s\S]*\n\n## Requirements\n\n[\s\S]*\n\n## Verification\n\n/,
      );
    },
  },
  {
    name: "model text remains inert after control and Markdown HTML link image and fence escaping",
    run: () => {
      const hostile =
        '\u0000line\r\n# heading\n<script>alert(1)</script> ![image](https://example.test) [link](javascript:alert(1)) `code` ```fence``` {"fake": "value"}';
      const document = parseModelDocument(
        modelJson(validModelSections().map((section) => ({ ...section, content: [hostile] }))),
        MODEL_POLICY,
      );
      const markdown = renderGeneratedMarkdown(document, MODEL_POLICY);

      assert.equal(/\p{Cc}/u.test(markdown.replace(/[\r\n]/g, "")), false);
      assert.equal(markdown.includes("<script>"), false);
      assert.equal(markdown.includes("![image]"), false);
      assert.equal(markdown.includes("]("), false);
      assert.equal(markdown.includes("```"), false);
      assert.equal(
        /^#{1,6}\s/m.test(markdown.replace(/^(?:# Objective|## Requirements|## Verification)$/gm, "")),
        false,
      );
      assert.equal(markdown.includes("javascript\\:"), true);
      assert.equal(markdown.endsWith("\n"), false);
    },
  },
  {
    name: "AI config and adapter fail closed without an exact enable flag and nonblank key",
    run: () => {
      assert.equal(getAiConfig({ OPENROUTER_API_KEY: "secret" }), null);
      assert.equal(getAiConfig({ AI_ENHANCEMENT_ENABLED: "TRUE", OPENROUTER_API_KEY: "secret" }), null);
      assert.equal(getAiConfig({ AI_ENHANCEMENT_ENABLED: "true", OPENROUTER_API_KEY: "   " }), null);
      const fetchMustNotRun = (() => {
        throw new Error("disabled configuration attempted a provider call");
      }) as typeof fetch;
      assert.throws(
        () => createOpenRouterAdapter({ apiKey: "   ", fetchImpl: fetchMustNotRun }),
        (error) => error instanceof Error && "code" in error && error.code === "service_disabled",
      );

      const config = getAiConfig({ AI_ENHANCEMENT_ENABLED: "true", OPENROUTER_API_KEY: " secret " });
      assert.deepEqual(config, {
        apiKey: "secret",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        model: "stealth/ox-alpha",
        provider: "stealth",
        timeoutMs: DEFAULT_OPENROUTER_TIMEOUT_MS,
      });
    },
  },
  {
    name: "adapter builds the fixed zero-price request for every approved level",
    run: () => {
      runAdapterScript(`
        const assert = require("node:assert/strict");
        const { createOpenRouterAdapter } = require("./src/server/ai/openrouter-adapter");

         const levels = [
           ["low", 2048],
           ["high", 8192],
           ["max", 32768],
         ];
         const calls = [];
         const metadata = [];
        const fakeFetch = async (input, init) => {
          calls.push({ input, init });
          return new Response(JSON.stringify({
            id: "gen-unsafe-provider-data",
            model: "stealth/ox-alpha",
            choices: [{ finish_reason: "stop", message: { content: "{\\"sections\\":[]}" } }],
            usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5, cost: "0" },
            provider: "untrusted-provider-name",
            reasoning: "do not expose",
          }), { status: 200, headers: { "content-type": "application/json" } });
        };
        const adapter = createOpenRouterAdapter({ apiKey: "server-secret", fetchImpl: fakeFetch });

         for (const [effort, completionBudget] of levels) {
          const content = await adapter.complete({
            systemInstruction: "trusted system instruction",
            userContent: "source prompt only",
            reasoningEffort: effort,
             completionBudget,
           }, { signal: new AbortController().signal, onMetadata: (value) => metadata.push(value) });
          assert.equal(content, "{\\"sections\\":[]}");
        }

        assert.equal(calls.length, 3);
        for (const { input, init } of calls) {
          assert.equal(input, "https://openrouter.ai/api/v1/chat/completions");
          assert.equal(init.method, "POST");
          assert.equal(init.cache, "no-store");
           assert.deepEqual(Object.keys(init.headers).sort(), [
             "Accept",
             "Authorization",
             "Content-Type",
             "HTTP-Referer",
             "X-OpenRouter-Metadata",
             "X-Title",
           ]);
           assert.equal(init.headers.Authorization, "Bearer server-secret");
           assert.equal(init.headers.Accept, "application/json");
           assert.equal(init.headers["Content-Type"], "application/json");
           assert.equal(init.headers["HTTP-Referer"], "https://ichicorito.github.io/prompt-enhancer/");
           assert.equal(init.headers["X-Title"], "Prompt Enhancer");
           assert.equal(init.headers["X-OpenRouter-Metadata"], "true");

          const body = JSON.parse(init.body);
          assert.deepEqual(Object.keys(body).sort(), [
             "max_tokens", "messages", "model", "provider", "reasoning", "response_format", "service_tier", "stream",
          ]);
          assert.equal(body.model, "stealth/ox-alpha");
          assert.equal(body.service_tier, "default");
          assert.equal(body.stream, false);
          assert.deepEqual(body.messages, [
            { role: "system", content: "trusted system instruction" },
            { role: "user", content: "source prompt only" },
          ]);
          assert.deepEqual(body.reasoning, { effort: body.reasoning.effort, exclude: true });
          assert.deepEqual(body.response_format, { type: "json_object" });
          assert.deepEqual(body.provider, {
            only: ["stealth"],
            allow_fallbacks: false,
            require_parameters: true,
            max_price: { prompt: "0", completion: "0", request: "0", image: "0", audio: "0" },
          });
           assert.equal("user" in body, false);
          assert.equal("tools" in body, false);
          assert.equal("plugins" in body, false);
          assert.equal("models" in body, false);
        }
         assert.deepEqual(calls.map(({ init }) => JSON.parse(init.body).reasoning.effort), ["low", "high", "max"]);
         assert.deepEqual(calls.map(({ init }) => JSON.parse(init.body).max_tokens), [2048, 8192, 32768]);
         assert.deepEqual(metadata, [
           {
             provider: "openrouter",
             model: "stealth/ox-alpha",
             generationId: "gen-unsafe-provider-data",
             inputTokens: 2,
             outputTokens: 3,
             totalTokens: 5,
             cost: 0,
           },
           {
             provider: "openrouter",
             model: "stealth/ox-alpha",
             generationId: "gen-unsafe-provider-data",
             inputTokens: 2,
             outputTokens: 3,
             totalTokens: 5,
             cost: 0,
           },
           {
             provider: "openrouter",
             model: "stealth/ox-alpha",
             generationId: "gen-unsafe-provider-data",
             inputTokens: 2,
             outputTokens: 3,
             totalTokens: 5,
             cost: 0,
           },
         ]);
      `);
    },
  },
  {
    name: "adapter maps documented failures without exposing provider data",
    run: () => {
      runAdapterScript(`
        const assert = require("node:assert/strict");
        const { createOpenRouterAdapter } = require("./src/server/ai/openrouter-adapter");

        const cases = [
          [400, "provider_refused"],
          [401, "provider_unavailable"],
          [402, "priced_route_unavailable"],
          [403, "provider_unavailable"],
          [408, "provider_timeout"],
          [413, "provider_refused"],
          [422, "provider_refused"],
          [429, "provider_rate_limited"],
          [500, "provider_unavailable"],
          [502, "provider_unavailable"],
          [503, "provider_unavailable"],
          [504, "provider_timeout"],
          [524, "provider_timeout"],
          [529, "provider_unavailable"],
        ];
        for (const [status, expectedCode] of cases) {
          const adapter = createOpenRouterAdapter({
            apiKey: "server-secret",
            fetchImpl: async () => new Response(JSON.stringify({
              error: {
                code: status === 429 ? "quota" : "upstream-secret-code",
                message: status === 429 ? "quota exceeded" : "upstream secret",
              },
            }), {
              status,
              headers: { "Retry-After": status === 429 ? "999999" : "0" },
            }),
          });
          try {
            await adapter.complete({
              systemInstruction: "trusted",
              userContent: "source",
              reasoningEffort: "high",
               completionBudget: 8192,
            }, { signal: new AbortController().signal });
            assert.fail("status unexpectedly succeeded: " + status);
          } catch (error) {
            assert.equal(error.code, expectedCode);
            assert.equal(error.message.includes("upstream"), false);
            assert.equal(error.message.includes("secret"), false);
            if (status === 429) assert.equal(error.retryAfterSeconds, 3600);
          }
        }

        const notFound = createOpenRouterAdapter({
          apiKey: "server-secret",
          fetchImpl: async () => new Response(JSON.stringify({ error: { code: "model_not_found", message: "secret model" } }), { status: 404 }),
        });
        await assert.rejects(
          notFound.complete({ systemInstruction: "trusted", userContent: "source", reasoningEffort: "low", completionBudget: 2048 }, { signal: new AbortController().signal }),
          (error) => error.code === "model_unavailable" && !error.message.includes("secret"),
        );

        const authBody = createOpenRouterAdapter({
          apiKey: "server-secret",
          fetchImpl: async () => new Response(JSON.stringify({ error: { code: "invalid_api_key", message: "secret auth" } }), { status: 400 }),
        });
        await assert.rejects(
          authBody.complete({ systemInstruction: "trusted", userContent: "source", reasoningEffort: "low", completionBudget: 2048 }, { signal: new AbortController().signal }),
          (error) => error.code === "provider_unavailable",
        );

        const paymentBody = createOpenRouterAdapter({
          apiKey: "server-secret",
          fetchImpl: async () => new Response(JSON.stringify({ error: { code: "payment_required", message: "secret billing" } }), { status: 400 }),
        });
        await assert.rejects(
          paymentBody.complete({ systemInstruction: "trusted", userContent: "source", reasoningEffort: "low", completionBudget: 2048 }, { signal: new AbortController().signal }),
          (error) => error.code === "priced_route_unavailable",
        );
      `);
    },
  },
  {
    name: "adapter rejects malformed success envelopes and nonzero costs",
    run: () => {
      runAdapterScript(`
        const assert = require("node:assert/strict");
        const { createOpenRouterAdapter } = require("./src/server/ai/openrouter-adapter");

        const valid = {
          id: "gen-safe-id",
          model: "stealth/ox-alpha",
          choices: [{ finish_reason: "stop", message: { content: "{\\"sections\\":[]}" } }],
          usage: { cost: 0 },
        };
        const cases = [
          ["embedded error", { ...valid, error: { code: 400, message: "secret" } }],
          ["wrong model", { ...valid, model: "other/model" }],
          ["missing choices", { ...valid, choices: [] }],
          ["missing content", { ...valid, choices: [{ finish_reason: "stop", message: {} }] }],
          ["empty content", { ...valid, choices: [{ finish_reason: "stop", message: { content: "  " } }] }],
          ["length finish", { ...valid, choices: [{ finish_reason: "length", message: { content: "x" } }] }],
          ["filter finish", { ...valid, choices: [{ finish_reason: "content_filter", message: { content: "x" } }] }],
          ["error finish", { ...valid, choices: [{ finish_reason: "error", message: { content: "x" } }] }],
          ["missing cost", { ...valid, usage: {} }],
          ["nonzero numeric cost", { ...valid, usage: { cost: 0.0001 } }],
          ["nonzero string cost", { ...valid, usage: { cost: "0.01" } }],
          ["string zero variant", { ...valid, usage: { cost: "0.0" } }],
        ];
        for (const [name, payload] of cases) {
          const adapter = createOpenRouterAdapter({
            apiKey: "server-secret",
            fetchImpl: async () => new Response(JSON.stringify(payload), { status: 200 }),
          });
          await assert.rejects(
            adapter.complete({ systemInstruction: "trusted", userContent: "source", reasoningEffort: "high", completionBudget: 8192 }, { signal: new AbortController().signal }),
            (error) => error.code === "invalid_provider_response" && !error.message.includes("secret"),
            String(name),
          );
        }

        const malformed = createOpenRouterAdapter({
          apiKey: "server-secret",
          fetchImpl: async () => new Response("{not-json", { status: 200 }),
        });
        await assert.rejects(
           malformed.complete({ systemInstruction: "trusted", userContent: "source", reasoningEffort: "high", completionBudget: 8192 }, { signal: new AbortController().signal }),
          (error) => error.code === "invalid_provider_response",
        );

         const oversized = createOpenRouterAdapter({
          apiKey: "server-secret",
          fetchImpl: async () => new Response("x".repeat(128 * 1024), { status: 200 }),
        });
        await assert.rejects(
           oversized.complete({ systemInstruction: "trusted", userContent: "source", reasoningEffort: "high", completionBudget: 8192 }, { signal: new AbortController().signal }),
           (error) => error.code === "output_too_large",
         );
      `);
    },
  },
  {
    name: "adapter composes timeout and caller abort signals without retrying",
    run: () => {
      runAdapterScript(`
        const assert = require("node:assert/strict");
        const { createOpenRouterAdapter } = require("./src/server/ai/openrouter-adapter");

        let calls = 0;
        const timeoutAdapter = createOpenRouterAdapter({
          apiKey: "server-secret",
          timeoutMs: 5,
          fetchImpl: (_input, init) => {
            calls += 1;
            return new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true }));
          },
        });
        await assert.rejects(
           timeoutAdapter.complete({ systemInstruction: "trusted", userContent: "source", reasoningEffort: "high", completionBudget: 8192 }, { signal: new AbortController().signal }),
          (error) => error.code === "provider_timeout",
        );
        assert.equal(calls, 1);

        let callerSignal;
        const caller = new AbortController();
        const callerAdapter = createOpenRouterAdapter({
          apiKey: "server-secret",
          timeoutMs: 1000,
          fetchImpl: (_input, init) => {
            callerSignal = init.signal;
            return new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true }));
          },
        });
         const pending = callerAdapter.complete({ systemInstruction: "trusted", userContent: "source", reasoningEffort: "low", completionBudget: 2048 }, { signal: caller.signal });
        caller.abort();
         await assert.rejects(pending, (error) => {
           assert.equal(error.name, "AiCancellationError");
           assert.equal(error.code, "internal_error");
           assert.equal(error.retryable, false);
           return error.code !== "provider_timeout" && !error.message.includes("upstream");
         });
         assert.equal(callerSignal.aborted, true);
       `);
    },
  },
  {
    name: "adapter short-circuits an already-aborted caller with a public-safe cancellation error",
    run: () => {
      runAdapterScript(`
         const assert = require("node:assert/strict");
         const { createOpenRouterAdapter } = require("./src/server/ai/openrouter-adapter");
         const { AiCancellationError, publicAiError } = require("./src/server/ai/errors");

         const caller = new AbortController();
         caller.abort();
         let calls = 0;
         const adapter = createOpenRouterAdapter({
           apiKey: "server-secret",
           timeoutMs: 1,
           fetchImpl: async () => {
             calls += 1;
             throw new Error("fetch must not run");
           },
         });

         await assert.rejects(
           adapter.complete({
             systemInstruction: "trusted",
             userContent: "source",
             reasoningEffort: "low",
             completionBudget: 2048,
           }, { signal: caller.signal }),
           (error) => {
             assert.equal(error instanceof AiCancellationError, true);
             assert.equal(error.code, "internal_error");
             assert.equal(error.retryable, false);
             assert.deepEqual(publicAiError(error), {
               code: "internal_error",
               message: "The AI request was cancelled.",
               retryable: false,
             });
             return true;
           },
         );
         assert.equal(calls, 0);
       `);
    },
  },
  {
    name: "adapter caps chunked provider bodies and cancels the overflowing stream",
    run: () => {
      runAdapterScript(`
         const assert = require("node:assert/strict");
         const { createOpenRouterAdapter } = require("./src/server/ai/openrouter-adapter");

         let cancelled = false;
         let requestSignal;
         const chunk = new TextEncoder().encode("x".repeat(32 * 1024));
         const body = new ReadableStream({
           start(controller) {
             controller.enqueue(chunk);
             controller.enqueue(new Uint8Array([...chunk, 120]));
           },
           cancel() {
             cancelled = true;
           },
         });
         const adapter = createOpenRouterAdapter({
           apiKey: "server-secret",
           fetchImpl: async (_input, init) => {
             requestSignal = init.signal;
             const response = new Response(body, { status: 200 });
             assert.equal(response.headers.get("content-length"), null);
             return response;
           },
         });

         await assert.rejects(
            adapter.complete({ systemInstruction: "trusted", userContent: "source", reasoningEffort: "low", completionBudget: 2048 }, { signal: new AbortController().signal }),
           (error) => error.code === "output_too_large",
         );
         assert.equal(cancelled, true);
         assert.equal(requestSignal.aborted, true);
       `);
    },
  },
  {
    name: "adapter accepts only exact HTTP 200 and rejects 201 and 202 success envelopes",
    run: () => {
      runAdapterScript(`
         const assert = require("node:assert/strict");
         const { createOpenRouterAdapter } = require("./src/server/ai/openrouter-adapter");

         const payload = JSON.stringify({
           model: "stealth/ox-alpha",
           choices: [{ finish_reason: "stop", message: { content: "{\\"sections\\":[]}" } }],
           usage: { cost: 0 },
         });
         for (const status of [201, 202]) {
           const adapter = createOpenRouterAdapter({
             apiKey: "server-secret",
             fetchImpl: async () => new Response(payload, { status }),
           });
           await assert.rejects(
            adapter.complete({ systemInstruction: "trusted", userContent: "source", reasoningEffort: "low", completionBudget: 2048 }, { signal: new AbortController().signal }),
             (error) => error.code === "invalid_provider_response" && error.status === status,
           );
         }
       `);
    },
  },
  {
    name: "adapter requires JSON-mode message content to be a JSON object",
    run: () => {
      runAdapterScript(`
         const assert = require("node:assert/strict");
         const { createOpenRouterAdapter } = require("./src/server/ai/openrouter-adapter");

         for (const content of ["not-json", "1", "null", "[]", "\\"text\\""]) {
           const adapter = createOpenRouterAdapter({
             apiKey: "server-secret",
             fetchImpl: async () => new Response(JSON.stringify({
               model: "stealth/ox-alpha",
               choices: [{ finish_reason: "stop", message: { content } }],
               usage: { cost: 0 },
             }), { status: 200 }),
           });
           await assert.rejects(
            adapter.complete({ systemInstruction: "trusted", userContent: "source", reasoningEffort: "low", completionBudget: 2048 }, { signal: new AbortController().signal }),
             (error) => error.code === "invalid_provider_response",
             content,
           );
         }

         const valid = createOpenRouterAdapter({
           apiKey: "server-secret",
           fetchImpl: async () => new Response(JSON.stringify({
             model: "stealth/ox-alpha",
             choices: [{ finish_reason: "stop", message: { content: "{\\"sections\\":[]}" } }],
             usage: { cost: 0 },
           }), { status: 200 }),
         });
         assert.equal(
            await valid.complete({ systemInstruction: "trusted", userContent: "source", reasoningEffort: "low", completionBudget: 2048 }, { signal: new AbortController().signal }),
           "{\\"sections\\":[]}",
         );
       `);
    },
  },
  {
    name: "adapter preserves and clamps Retry-After for retryable timeout and 5xx responses",
    run: () => {
      runAdapterScript(`
         const assert = require("node:assert/strict");
         const { createOpenRouterAdapter } = require("./src/server/ai/openrouter-adapter");

         for (const [status, expectedCode] of [[408, "provider_timeout"], [504, "provider_timeout"], [524, "provider_timeout"], [500, "provider_unavailable"], [503, "provider_unavailable"], [599, "provider_unavailable"]]) {
           const adapter = createOpenRouterAdapter({
             apiKey: "server-secret",
             fetchImpl: async () => new Response(JSON.stringify({ error: { message: "safe" } }), {
               status,
               headers: { "Retry-After": "999999" },
             }),
           });
           await assert.rejects(
            adapter.complete({ systemInstruction: "trusted", userContent: "source", reasoningEffort: "low", completionBudget: 2048 }, { signal: new AbortController().signal }),
             (error) => error.code === expectedCode && error.retryable === true && error.retryAfterSeconds === 3600,
             String(status),
           );
         }
       `);
    },
  },
  {
    name: "adapter rejects redirect responses without replaying credentials or prompt content",
    run: () => {
      runAdapterScript(`
          const assert = require("node:assert/strict");
          const { createOpenRouterAdapter } = require("./src/server/ai/openrouter-adapter");

          for (const status of [301, 302, 307, 308]) {
            const calls = [];
            const fakeFetch = async (input, init) => {
              calls.push({ input, init });
              if (calls.length === 1 && init.redirect !== "error") {
                return fakeFetch("https://attacker.example/replay", init);
              }
              if (calls.length > 1) {
                assert.equal(init.headers.Authorization, undefined, "redirect replay carried Authorization");
                assert.equal(JSON.parse(init.body).messages[1].content, undefined, "redirect replay carried prompt");
              }
              return new Response(null, {
                status,
                headers: { Location: "https://attacker.example/replay" },
              });
            };
            const adapter = createOpenRouterAdapter({ apiKey: "server-secret", fetchImpl: fakeFetch });

            await assert.rejects(
              adapter.complete({
                systemInstruction: "trusted instruction",
                userContent: "private prompt",
                reasoningEffort: "low",
                 completionBudget: 2048,
              }, { signal: new AbortController().signal }),
              (error) => error.code === "provider_unavailable" && error.status === status,
              String(status),
            );
            assert.equal(calls.length, 1, "status " + status + " caused a redirect replay");
            assert.equal(calls[0].input, "https://openrouter.ai/api/v1/chat/completions");
            assert.equal(calls[0].init.redirect, "error");
            assert.equal(calls[0].init.headers.Authorization, "Bearer server-secret");
            assert.equal(JSON.parse(calls[0].init.body).messages[1].content, "private prompt");
          }
       `);
    },
  },
  {
    name: "adapter aborts before best-effort cancellation and does not await a hanging cancel",
    run: () => {
      runAdapterScript(`
          const assert = require("node:assert/strict");
          const { createOpenRouterAdapter } = require("./src/server/ai/openrouter-adapter");

          let requestSignal;
          let cancelStarted = false;
          let abortedWhenCancelStarted;
          const chunk = new TextEncoder().encode("x".repeat(64 * 1024));
          let reads = 0;
          const body = {
            getReader() {
              return {
                async read() {
                  reads += 1;
                  return reads === 1 ? { done: false, value: chunk } : { done: false, value: new Uint8Array([120]) };
                },
                cancel() {
                  cancelStarted = true;
                  abortedWhenCancelStarted = requestSignal.aborted;
                  return new Promise(() => {});
                },
                releaseLock() {},
              };
            },
          };
          const adapter = createOpenRouterAdapter({
            apiKey: "server-secret",
            fetchImpl: async (_input, init) => {
              requestSignal = init.signal;
              return { status: 200, headers: new Headers(), body };
            },
          });

          const outcome = await Promise.race([
            adapter.complete({
              systemInstruction: "trusted",
              userContent: "source",
              reasoningEffort: "low",
              completionBudget: 2048,
            }, { signal: new AbortController().signal }).then(
              () => "resolved",
              (error) => error,
            ),
            new Promise((resolve) => setTimeout(() => resolve("timed-out"), 50)),
          ]);
          assert.notEqual(outcome, "timed-out", "complete awaited an unbounded reader cancellation");
          assert.equal(outcome.code, "output_too_large");
          assert.equal(cancelStarted, true);
          assert.equal(abortedWhenCancelStarted, true, "reader cancellation started before request abort");
          assert.equal(requestSignal.aborted, true);
       `);
    },
  },
  {
    name: "adapter preserves status and bounded Retry-After for oversized non-200 bodies",
    run: () => {
      runAdapterScript(`
          const assert = require("node:assert/strict");
          const { createOpenRouterAdapter } = require("./src/server/ai/openrouter-adapter");

          for (const [status, expectedCode, retryAfterSeconds] of [
            [429, "provider_rate_limited", 17],
            [503, "provider_unavailable", 23],
          ]) {
            const adapter = createOpenRouterAdapter({
              apiKey: "server-secret",
              fetchImpl: async () => new Response("provider-secret ".repeat(8 * 1024), {
                status,
                headers: { "Retry-After": String(retryAfterSeconds) },
              }),
            });
            await assert.rejects(
              adapter.complete({
                systemInstruction: "trusted",
                userContent: "source",
                reasoningEffort: "low",
                completionBudget: 2048,
              }, { signal: new AbortController().signal }),
              (error) => {
                assert.equal(error.code, expectedCode);
                assert.equal(error.status, status);
                assert.equal(error.retryable, true);
                assert.equal(error.retryAfterSeconds, retryAfterSeconds);
                assert.equal(error.message.includes("provider-secret"), false);
                return true;
              },
              String(status),
            );
          }
       `);
    },
  },
  {
    name: "adapter classifies auth and permission failures as non-retryable public-safe errors",
    run: () => {
      runAdapterScript(`
          const assert = require("node:assert/strict");
          const { createOpenRouterAdapter } = require("./src/server/ai/openrouter-adapter");
          const { publicAiError } = require("./src/server/ai/errors");

          const cases = [
            [401, { code: "upstream_auth_secret", message: "provider auth secret" }],
            [403, { code: "upstream_permission_secret", message: "provider permission secret" }],
            [400, { code: "invalid_api_key", message: "provider auth secret" }],
            [429, { code: "permission_denied", message: "provider permission secret" }],
            [500, { code: "expired_api_key", message: "provider auth secret" }],
          ];
          for (const [status, providerError] of cases) {
            const adapter = createOpenRouterAdapter({
              apiKey: "server-secret",
              fetchImpl: async () => new Response(JSON.stringify({ error: providerError }), { status }),
            });
            await assert.rejects(
              adapter.complete({
                systemInstruction: "trusted",
                userContent: "source",
                reasoningEffort: "low",
                 completionBudget: 2048,
              }, { signal: new AbortController().signal }),
              (error) => {
                assert.equal(error.code, "provider_unavailable");
                assert.equal(error.retryable, false);
                assert.equal(error.status, status);
                assert.equal(error.message, "The AI provider is currently unavailable.");
                assert.deepEqual(publicAiError(error), {
                  code: "provider_unavailable",
                  message: "The AI provider is currently unavailable.",
                  retryable: false,
                });
                return true;
              },
              String(status),
            );
          }
      `);
    },
  },
  {
    name: "admission sends one keyed atomic prune-check-add script and releases best effort",
    run: () => {
      runAdapterScript(`
        const assert = require("node:assert/strict");
        const { ACTIVE_LEASE_KEY, ADMISSION_SCRIPT, CONCURRENCY_LIMIT, LEASE_TTL_MS, createAdmission } = require("./src/server/ai/admission");

        const calls = [];
        const removals = [];
        const redis = {
          eval: async (script, keys, args) => {
            calls.push({ script, keys, args });
            return ["admitted", "lease-1", LEASE_TTL_MS, 2, 1];
          },
          zrem: async (key, member) => removals.push({ key, member }),
        };
        const admission = createAdmission({ redis, clock: () => 10_000, uuid: () => "lease-1" });
        const result = await admission.acquire();

        assert.equal(result.status, "admitted");
        assert.equal(result.leaseId, "lease-1");
        assert.equal(result.expiresAt, 10_000 + LEASE_TTL_MS);
        assert.equal(result.prunedCount, 2);
        assert.equal(result.activeCount, 1);
        assert.deepEqual(calls[0].keys, [ACTIVE_LEASE_KEY]);
        assert.deepEqual(calls[0].args, ["10000", "lease-1", String(LEASE_TTL_MS), "120", String(CONCURRENCY_LIMIT)]);
        assert.match(calls[0].script, /^#!lua flags=allow-key-locking/);
        assert.ok(calls[0].script.indexOf("ZREMRANGEBYSCORE") < calls[0].script.indexOf("ZCARD"));
        assert.ok(calls[0].script.indexOf("ZCARD") < calls[0].script.indexOf("ZADD"));
        assert.equal(calls[0].script.includes("local active_key = KEYS[1]"), true);
        await admission.release("lease-1");
        assert.deepEqual(removals, [{ key: ACTIVE_LEASE_KEY, member: "lease-1" }]);
      `);
    },
  },
  {
    name: "admission rejects the ninth active call and expires leases after ninety seconds",
    run: () => {
      runAdapterScript(`
        const assert = require("node:assert/strict");
        const { CONCURRENCY_LIMIT, LEASE_TTL_MS, createAdmission } = require("./src/server/ai/admission");

        let now = 1_000;
        let nextId = 0;
        const leases = new Map();
        const redis = {
          eval: async (_script, _keys, args) => {
            const current = Number(args[0]);
            for (const [id, expiry] of leases) if (expiry <= current) leases.delete(id);
            if (leases.size >= CONCURRENCY_LIMIT) {
              const retryAt = Math.min(...leases.values());
              return ["busy", "", Math.max(1, retryAt - current), 0, leases.size];
            }
            const id = args[1];
            leases.set(id, current + LEASE_TTL_MS);
            return ["admitted", id, LEASE_TTL_MS, 0, leases.size];
          },
          zrem: async (_key, id) => leases.delete(id),
        };
        const admission = createAdmission({ redis, clock: () => now, uuid: () => "lease-" + ++nextId });
        const admitted = [];
        for (let index = 0; index < CONCURRENCY_LIMIT; index += 1) admitted.push(await admission.acquire());
        assert.equal(admitted.filter((entry) => entry.status === "admitted").length, CONCURRENCY_LIMIT);
        const busy = await admission.acquire();
        assert.equal(busy.status, "busy");
        assert.equal(busy.activeCount, CONCURRENCY_LIMIT);
        assert.equal(busy.retryAfterMs, LEASE_TTL_MS);

        now += LEASE_TTL_MS;
        const afterExpiry = await admission.acquire();
        assert.equal(afterExpiry.status, "admitted");
        assert.equal(afterExpiry.expiresAt, now + LEASE_TTL_MS);
      `);
    },
  },
  {
    name: "redis admission failures fail closed and never call the provider",
    run: () => {
      runAdapterScript(`
        const assert = require("node:assert/strict");
        const { createAdmission } = require("./src/server/ai/admission");
        const { createOrchestrator } = require("./src/server/ai/orchestrator");

        const admission = createAdmission({
          redis: { eval: async () => { throw new Error("redis secret"); }, zrem: async () => 1 },
          clock: () => 1_000,
          uuid: () => "lease-1",
        });
        assert.equal((await admission.acquire()).status, "unavailable");

        let providerCalls = 0;
        const orchestrator = createOrchestrator({
          admission,
          model: { complete: async () => { providerCalls += 1; return "{}"; } },
          requestId: () => "req-redis",
        });
        await assert.rejects(
          orchestrator.enhance({
            version: 1,
            prompt: "fix the login flow",
            selection: { kind: "manual", taskType: "bug-fix" },
            level: "standard",
            sections: ["objective", "requirements", "verification"],
          }, { signal: new AbortController().signal }),
          (error) => error.code === "service_unavailable" && error.retryable === true,
        );
        assert.equal(providerCalls, 0);
      `);
    },
  },
  {
    name: "http handler uses the configured origin instead of a hard-coded deployment origin",
    run: () => {
      runAdapterScript(`
        const assert = require("node:assert/strict");
        const { createAiHttpHandler } = require("./src/server/ai/http-handler");

        const handler = createAiHttpHandler({
          environment: { ALLOWED_ORIGIN: "https://custom.example", AI_ENHANCEMENT_ENABLED: "false" },
          requestId: () => "req-origin",
        });
        const response = await handler(new Request("https://api.example/enhance", {
          method: "OPTIONS",
          headers: { Origin: "https://custom.example" },
        }));
        assert.equal(response.status, 204);
        assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://custom.example");

        const rejected = await handler(new Request("https://api.example/enhance", {
          method: "OPTIONS",
          headers: { Origin: "https://ichicorito.github.io" },
        }));
        assert.equal(rejected.status, 403);
        assert.equal(rejected.headers.get("Access-Control-Allow-Origin"), null);
      `);
    },
  },
  {
    name: "admission stays fail-closed by default and opens only with the local-development flag",
    run: () => {
      runAdapterScript(`
        const assert = require("node:assert/strict");
        const { createAdmission } = require("./src/server/ai/admission");

        const closed = createAdmission({ environment: {} });
        assert.equal((await closed.acquire()).status, "unavailable");

        const opened = createAdmission({
          environment: { AI_ADMISSION_OPEN: "true" },
          uuid: () => "lease-open",
        });
        const acquired = await opened.acquire();
        assert.equal(acquired.status, "admitted");
        assert.equal(acquired.leaseId, "lease-open");
        await assert.doesNotReject(opened.release("lease-open"));

        const explicitRedis = createAdmission({
          redis: { eval: async () => { throw new Error("down"); }, zrem: async () => 1 },
          environment: { AI_ADMISSION_OPEN: "true" },
        });
        assert.equal((await explicitRedis.acquire()).status, "unavailable");
      `);
    },
  },
  {
    name: "admission bounds Redis failures and never hangs release cleanup",
    run: () => {
      runAdapterScript(`
        const assert = require("node:assert/strict");
        const { createAdmission } = require("./src/server/ai/admission");

        const admission = createAdmission({
          operationTimeoutMs: 10,
          redis: {
            eval: async () => new Promise(() => {}),
            zrem: async () => new Promise(() => {}),
          },
          uuid: () => "lease-hanging",
        });
        const acquired = await Promise.race([
          admission.acquire(),
          new Promise((resolve) => setTimeout(() => resolve("timed-out"), 100)),
        ]);
        assert.notEqual(acquired, "timed-out");
        assert.equal(acquired.status, "unavailable");

        const released = await Promise.race([
          admission.release("lease-hanging").then(() => "released"),
          new Promise((resolve) => setTimeout(() => resolve("timed-out"), 100)),
        ]);
        assert.equal(released, "released");
      `);
    },
  },
  {
    name: "orchestration releases an interrupted lease and keeps policy data server-owned",
    run: () => {
      runAdapterScript(`
        const assert = require("node:assert/strict");
        const { createOrchestrator } = require("./src/server/ai/orchestrator");

        const calls = [];
        const released = [];
        const orchestrator = createOrchestrator({
          admission: {
            acquire: async () => ({ status: "admitted", leaseId: "lease-1", expiresAt: 91_000, retryAfterMs: 0, retryAfterSeconds: 0, activeCount: 1, prunedCount: 0 }),
            release: async (leaseId) => released.push(leaseId),
          },
          model: {
            complete: async (input) => {
              calls.push(input);
              throw new Error("raw provider secret");
            },
          },
          requestId: () => "req-interrupted",
        });
        await assert.rejects(
          orchestrator.enhance({
            version: 1,
            prompt: "private prompt",
            selection: { kind: "manual", taskType: "bug-fix" },
            level: "standard",
            sections: ["objective", "requirements", "verification"],
           }, { signal: new AbortController().signal }),
          (error) => error.code === "provider_unavailable",
        );
        assert.equal(calls.length, 1);
        assert.equal(calls[0].systemInstruction.includes("private prompt"), false);
        assert.equal(calls[0].systemInstruction.includes("State the intended fix"), true);
        assert.equal(calls[0].userContent.includes("private prompt"), true);
        assert.deepEqual(released, ["lease-1"]);
      `);
    },
  },
  {
    name: "HTTP body reading enforces the 128-KiB byte limit despite missing or false lengths",
    run: () => {
      runAdapterScript(`
        const assert = require("node:assert/strict");
        const { createAiHttpHandler } = require("./src/server/ai/http-handler");

        let orchestratorCalls = 0;
        const handler = createAiHttpHandler({
          requestId: () => "req-body",
          orchestrator: { enhance: async () => { orchestratorCalls += 1; throw new Error("must not run"); } },
        });
         const oversized = new TextEncoder().encode(JSON.stringify({ version: 1, prompt: "x".repeat(135_000) }));
        for (const contentLength of [undefined, "1"]) {
          const headers = {
            Origin: "https://ichicorito.github.io",
            "Content-Type": "application/json",
            ...(contentLength === undefined ? {} : { "Content-Length": contentLength }),
          };
          const request = new Request("https://api.example/enhance", {
            method: "POST",
            headers,
            body: new ReadableStream({
              start(controller) {
                for (let offset = 0; offset < oversized.byteLength; offset += 1_024) controller.enqueue(oversized.slice(offset, offset + 1_024));
                controller.close();
              },
            }),
            duplex: "half",
          });
          const response = await handler(request);
          const payload = await response.json();
          assert.equal(response.status, 413);
          assert.equal(payload.error.code, "input_too_large");
        }
        assert.equal(orchestratorCalls, 0);
      `);
    },
  },
  {
    name: "HTTP CORS preflight is origin-exact, no-store, and never touches orchestration",
    run: () => {
      runAdapterScript(`
        const assert = require("node:assert/strict");
        const { createAiHttpHandler } = require("./src/server/ai/http-handler");

        let calls = 0;
        const handler = createAiHttpHandler({
          orchestrator: { enhance: async () => { calls += 1; throw new Error("must not run"); } },
        });
        const allowed = await handler(new Request("https://api.example/enhance", { method: "OPTIONS", headers: { Origin: "https://ichicorito.github.io" } }));
        assert.equal(allowed.status, 204);
        assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), "https://ichicorito.github.io");
        assert.equal(allowed.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
        assert.equal(allowed.headers.get("Access-Control-Allow-Headers"), "Content-Type");
        assert.equal(allowed.headers.get("Vary"), "Origin");
        assert.equal(allowed.headers.get("Cache-Control"), "no-store");
        for (const origin of [undefined, "null", "https://ichicorito.github.io/prompt-enhancer", "https://evil.example"]) {
          const headers = origin === undefined ? {} : { Origin: origin };
          const rejected = await handler(new Request("https://api.example/enhance", { method: "OPTIONS", headers }));
          assert.equal(rejected.status, 403, String(origin));
          assert.equal(rejected.headers.get("Cache-Control"), "no-store");
        }
        assert.equal(calls, 0);
      `);
    },
  },
  {
    name: "HTTP success forwards the request signal and logs validated metadata without prompt data",
    run: () => {
      runAdapterScript(`
        const assert = require("node:assert/strict");
        const { createAiHttpHandler } = require("./src/server/ai/http-handler");

        let seen;
        const events = [];
        const handler = createAiHttpHandler({
          requestId: () => "unsafe request id secret",
          log: (event) => events.push(event),
          orchestrator: {
             enhance: async (request, context) => {
               seen = { request, context };
               context.onCompletionMetadata?.({
                 provider: "openrouter",
                 model: "stealth/ox-alpha",
                 generationId: "gen-safe-id",
                 inputTokens: 12,
                 outputTokens: 34,
                 totalTokens: 46,
                 cost: 0,
               });
              return {
                version: 1,
                ok: true,
                requestId: "backend-id",
                result: {
                  analysis: { original: request.prompt, category: "development", taskType: "bug-fix", confidence: 90, technologies: [], constraints: [], requirements: [], enhancementLevel: "standard" },
                  classification: { taskType: "bug-fix", category: "development", confidence: 90, band: "high", scores: Object.fromEntries(["bug-fix", "feature", "code-review", "refactor", "testing", "documentation", "rewrite", "summarize", "research", "comparison", "ui-review", "image-prompt", "general"].map((key) => [key, key === "bug-fix" ? 1 : 0])), fallbackToGeneral: false, topMatches: ["bug-fix"] },
                  resolved: { presetId: null, taskType: "bug-fix", category: "development", level: "standard", sections: ["objective"], reasoningEffort: "high" },
                  markdown: "# Objective\\n\\nSafe output",
                  generation: { kind: "ai", provider: "openrouter", model: "stealth/ox-alpha" },
                },
              };
            },
          },
        });
        const caller = new AbortController();
        const request = new Request("https://api.example/enhance", {
          method: "POST",
           headers: { Origin: "https://ichicorito.github.io", "Content-Type": "application/json" },
          body: JSON.stringify({ version: 1, prompt: "prompt secret", selection: { kind: "manual", taskType: "bug-fix" }, level: "standard", sections: ["objective"] }),
        });
        Object.defineProperty(request, "signal", { value: caller.signal });
        const response = await handler(request);
        const payload = await response.json();
        assert.equal(response.status, 200);
        assert.equal(payload.requestId, "unsafe-request-id-secret");
        assert.equal(response.headers.get("Cache-Control"), "no-store");
        assert.equal(seen.context.signal, caller.signal);
        assert.equal(JSON.stringify(events).includes("prompt secret"), false);
        assert.equal(JSON.stringify(events).includes("Safe output"), false);
        assert.equal(events[0].cost, 0);
         assert.equal(events[0].code, "success");
         assert.equal(events[0].generationId, "gen-safe-id");
         assert.equal(events[0].inputTokens, 12);
         assert.equal(events[0].outputTokens, 34);
         assert.equal(events[0].totalTokens, 46);
        assert.equal(events[0].requestId, "unsafe-request-id-secret");
      `);
    },
  },
  {
    name: "HTTP rejects strict schema without requiring user or network identity fields",
    run: () => {
      runAdapterScript(`
        const assert = require("node:assert/strict");
        const { EnhancementRequestV1Schema } = require("./src/lib/ai-enhancement/contracts");
        const { createAiHttpHandler } = require("./src/server/ai/http-handler");

        let calls = 0;
        const request = (body) => new Request("https://api.example/enhance", {
          method: "POST",
          headers: { Origin: "https://ichicorito.github.io", "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const validBody = { version: 1, prompt: "x", selection: { kind: "manual", taskType: "bug-fix" }, level: "standard", sections: ["objective"] };
        assert.equal(EnhancementRequestV1Schema.safeParse(validBody).success, true);
        const strictHandler = createAiHttpHandler({
          requestId: () => "req-strict",
          orchestrator: { enhance: async () => { calls += 1; throw new Error("must not run"); } },
        });
        const invalid = await strictHandler(request({ ...validBody, model: "attacker/model" }));
        assert.equal(invalid.status, 400);
        assert.equal((await invalid.json()).error.code, "invalid_request");
        assert.equal(calls, 0);
      `);
    },
  },
  {
    name: "HTTP maps provider and admission failures to stable safe statuses and bounded retry headers",
    run: () => {
      runAdapterScript(`
        const assert = require("node:assert/strict");
        const { AiProviderError } = require("./src/server/ai/errors");
         const { AdmissionBusyError, AdmissionUnavailableError } = require("./src/server/ai/admission");
        const { createAiHttpHandler } = require("./src/server/ai/http-handler");

        const body = JSON.stringify({ version: 1, prompt: "source", selection: { kind: "manual", taskType: "bug-fix" }, level: "standard", sections: ["objective"] });
        const makeRequest = () => new Request("https://api.example/enhance", {
          method: "POST",
         headers: { Origin: "https://ichicorito.github.io", "Content-Type": "application/json" },
          body,
        });
        for (const [error, status] of [
          [new AiProviderError("provider_timeout"), 504],
          [new AiProviderError("provider_rate_limited", { retryAfterSeconds: 9_999 }), 429],
          [new AiProviderError("provider_unavailable"), 503],
           [new AiProviderError("provider_refused"), 502],
           [new AiProviderError("invalid_provider_response"), 502],
           [new AiProviderError("output_too_large"), 502],
           [new AdmissionBusyError(999), 503],
           [new AdmissionUnavailableError(), 503],
        ]) {
          const handler = createAiHttpHandler({
            requestId: () => "req-status",
            orchestrator: { enhance: async () => { throw error; } },
          });
          const response = await handler(makeRequest());
          const payload = await response.json();
          assert.equal(response.status, status, error.code);
          assert.equal(payload.ok, false);
          assert.equal(payload.requestId, "req-status");
          assert.equal(payload.error.message.includes("source"), false);
          assert.equal(payload.error.message.includes("9999"), false);
          if (status === 503) assert.equal(Number(response.headers.get("Retry-After")) <= 3 || response.headers.get("Retry-After") === null, true);
        }
      `);
    },
  },
  {
    name: "browser client sends only the versioned request and omits credentials",
    run: async () => {
      const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
      const fakeFetch: typeof fetch = async (input, init) => {
        calls.push({ input, init });
        return new Response(JSON.stringify({ version: 1, ok: true, requestId: "req-client", result: validResult() }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };
      const client = createAiEnhancementClient({ endpoint: "https://api.example/enhance", fetchImpl: fakeFetch });
      const requestWithExtra = {
        ...policyRequest({ kind: "manual", taskType: "bug-fix" }),
        apiKey: "must-not-send",
        model: "attacker/model",
      } as unknown as EnhancementRequestV1;

      const response = await client.enhance(requestWithExtra);
      assert.equal(response.ok, true);
      assert.equal(calls.length, 1);
      assert.equal(calls[0]?.input, "https://api.example/enhance");
      assert.equal(calls[0]?.init?.method, "POST");
      assert.equal(calls[0]?.init?.credentials, "omit");
      const body = JSON.parse(String(calls[0]?.init?.body)) as Record<string, unknown>;
      assert.deepEqual(Object.keys(body).sort(), ["level", "prompt", "sections", "selection", "version"]);
      assert.equal("apiKey" in body, false);
      assert.equal("model" in body, false);
    },
  },
  {
    name: "browser client accepts HTTPS endpoints and only explicitly injected local test HTTP endpoints",
    run: async () => {
      const fakeFetch: typeof fetch = async () =>
        new Response(JSON.stringify({ version: 1, ok: true, requestId: "req-endpoint", result: validResult() }), {
          status: 200,
        });

      assert.throws(
        () => createAiEnhancementClient({ endpoint: "http://127.0.0.1:3000/api/enhance", fetchImpl: fakeFetch }),
        (error) => error instanceof AiEnhancementClientError && error.code === "invalid_endpoint",
      );
      assert.throws(
        () =>
          createAiEnhancementClient({
            endpoint: "http://attacker.example/api/enhance",
            allowLocalHttpForTests: true,
            fetchImpl: fakeFetch,
          }),
        (error) => error instanceof AiEnhancementClientError && error.code === "invalid_endpoint",
      );

      const localClient = createAiEnhancementClient({
        endpoint: "http://127.0.0.1:3000/api/enhance",
        allowLocalHttpForTests: true,
        fetchImpl: fakeFetch,
      });
      const response = await localClient.enhance(policyRequest({ kind: "manual", taskType: "bug-fix" }));
      assert.equal(response.requestId, "req-endpoint");
    },
  },
  {
    name: "browser client accepts same-origin relative endpoints",
    run: async () => {
      const calls: Array<{ input: RequestInfo | URL; init: RequestInit | undefined }> = [];
      const fakeFetch: typeof fetch = async (input, init) => {
        calls.push({ input, init });
        return new Response(
          JSON.stringify({ version: 1, ok: true, requestId: "req-relative", result: validResult() }),
          {
            status: 200,
          },
        );
      };
      const client = createAiEnhancementClient({ endpoint: "/api/enhance", fetchImpl: fakeFetch });
      const response = await client.enhance(policyRequest({ kind: "manual", taskType: "bug-fix" }));
      assert.equal(response.ok, true);
      assert.equal(calls.length, 1);
      assert.equal(calls[0]?.input, "/api/enhance");
      assert.equal(calls[0]?.init?.method, "POST");
    },
  },
  {
    name: "browser client normalizes abort timeout network and invalid response failures",
    run: async () => {
      const request = policyRequest({ kind: "manual", taskType: "bug-fix" });
      const abortController = new AbortController();
      abortController.abort();
      let abortedCalls = 0;
      const aborted = createAiEnhancementClient({
        endpoint: "https://api.example/enhance",
        fetchImpl: async () => {
          abortedCalls += 1;
          throw new Error("fetch must not run");
        },
      });
      await assert.rejects(
        aborted.enhance(request, { signal: abortController.signal }),
        (error) => error instanceof AiEnhancementClientError && error.code === "aborted",
      );
      assert.equal(abortedCalls, 0);

      const timedOut = createAiEnhancementClient({
        endpoint: "https://api.example/enhance",
        timeoutMs: 5,
        fetchImpl: (_input, init) =>
          new Promise((_, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), {
              once: true,
            });
          }),
      });
      await assert.rejects(
        timedOut.enhance(request),
        (error) => error instanceof AiEnhancementClientError && error.code === "timeout",
      );

      const network = createAiEnhancementClient({
        endpoint: "https://api.example/enhance",
        fetchImpl: async () => {
          throw new Error("network secret");
        },
      });
      await assert.rejects(
        network.enhance(request),
        (error) =>
          error instanceof AiEnhancementClientError && error.code === "network" && !error.message.includes("secret"),
      );

      const invalidResponse = createAiEnhancementClient({
        endpoint: "https://api.example/enhance",
        fetchImpl: async () => new Response(JSON.stringify({ ok: true, requestId: "missing-result" }), { status: 200 }),
      });
      await assert.rejects(
        invalidResponse.enhance(request),
        (error) => error instanceof AiEnhancementClientError && error.code === "invalid_response",
      );
    },
  },
  {
    name: "browser client exposes validated server errors without provider details",
    run: async () => {
      const client = createAiEnhancementClient({
        endpoint: "https://api.example/enhance",
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              version: 1,
              ok: false,
              requestId: "req-disabled",
              error: { code: "service_disabled", message: "AI enhancement is unavailable.", retryable: false },
            }),
            { status: 503 },
          ),
      });

      await assert.rejects(
        client.enhance(policyRequest({ kind: "manual", taskType: "bug-fix" })),
        (error) =>
          error instanceof AiEnhancementClientError &&
          error.code === "service_disabled" &&
          error.message === "AI enhancement is unavailable.",
      );
    },
  },
  {
    name: "deterministic service adapts the engine result to the shared generation contract",
    run: () => {
      const response = enhanceDeterministically(
        policyRequest(
          { kind: "manual", taskType: "bug-fix" },
          { prompt: "fix the login flow", sections: ["objective", "requirements", "verification"] },
        ),
        { requestId: () => "req-deterministic" },
      );

      assert.equal(response.ok, true);
      assert.equal(response.requestId, "req-deterministic");
      assert.deepEqual(response.result.generation, { kind: "deterministic" });
      assert.equal(response.result.analysis.original, "fix the login flow");
      assert.deepEqual(response.result.resolved.sections, ["objective", "requirements", "verification"]);
      assert.equal(response.result.markdown.length > 0, true);
      assert.equal(JSON.stringify(response).includes("openrouter"), false);
    },
  },
  {
    name: "missing API configuration disables the HTTP service before an injected model can run",
    run: async () => {
      let providerCalls = 0;
      const handler = createAiHttpHandler({
        allowedOrigin: "https://test.example",
        environment: { AI_ENHANCEMENT_ENABLED: "true", ALLOWED_ORIGIN: "https://ignored.example" },
        model: {
          complete: async () => {
            providerCalls += 1;
            return "{}";
          },
        },
        requestId: () => "req-disabled",
      });
      const response = await handler(
        new Request("https://api.example/enhance", {
          method: "POST",
          headers: { Origin: "https://test.example", "Content-Type": "application/json" },
          body: JSON.stringify(policyRequest({ kind: "manual", taskType: "bug-fix" })),
        }),
      );
      const payload = await response.json();
      assert.equal(response.status, 503);
      assert.equal(payload.error.code, "service_disabled");
      assert.equal(providerCalls, 0);
    },
  },
  {
    name: "the Vercel API wrapper delegates to the HTTP boundary and remains disabled without configuration",
    run: async () => {
      const previous = {
        AI_ENHANCEMENT_ENABLED: process.env.AI_ENHANCEMENT_ENABLED,
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN,
      };
      process.env.AI_ENHANCEMENT_ENABLED = "false";
      delete process.env.OPENROUTER_API_KEY;
      process.env.ALLOWED_ORIGIN = "https://test.example";

      try {
        const response = await apiEnhance(
          new Request("https://api.example/enhance", {
            method: "POST",
            headers: { Origin: "https://test.example", "Content-Type": "application/json" },
            body: JSON.stringify(policyRequest({ kind: "manual", taskType: "bug-fix" })),
          }),
        );
        const payload = await response.json();
        assert.equal(response.status, 503);
        assert.equal(payload.error.code, "service_disabled");
      } finally {
        if (previous.AI_ENHANCEMENT_ENABLED === undefined) delete process.env.AI_ENHANCEMENT_ENABLED;
        else process.env.AI_ENHANCEMENT_ENABLED = previous.AI_ENHANCEMENT_ENABLED;
        if (previous.OPENROUTER_API_KEY === undefined) delete process.env.OPENROUTER_API_KEY;
        else process.env.OPENROUTER_API_KEY = previous.OPENROUTER_API_KEY;
        if (previous.ALLOWED_ORIGIN === undefined) delete process.env.ALLOWED_ORIGIN;
        else process.env.ALLOWED_ORIGIN = previous.ALLOWED_ORIGIN;
      }
    },
  },
  {
    name: "orchestrator dispatches the provider before local facts and keeps payloads stable",
    run: async () => {
      const order: string[] = [];
      const seenInputs: Array<{
        systemInstruction: string;
        userContent: string;
        reasoningEffort: string;
        completionBudget: number;
      }> = [];
      const orchestrator = createOrchestrator({
        admission: {
          acquire: async () => {
            order.push("acquire");
            return {
              status: "admitted" as const,
              leaseId: "lease-order",
              expiresAt: 1,
              retryAfterMs: 0,
              retryAfterSeconds: 0,
              activeCount: 1,
              prunedCount: 0,
            };
          },
          release: async () => {
            order.push("release");
          },
        },
        model: {
          complete: async (input) => {
            order.push("model-start");
            seenInputs.push(input);
            return JSON.stringify({
              sections: [
                { id: "objective", content: ["Fix the login flow."] },
                { id: "requirements", content: ["Keep the API stable."] },
              ],
            });
          },
        },
        requestId: () => "req-order",
      });
      const request = policyRequest(
        { kind: "manual", taskType: "bug-fix" },
        { sections: ["objective", "requirements"] },
      );
      const result = await orchestrator.enhance(request, { signal: new AbortController().signal });

      // The lease is taken first, the provider request is dispatched before
      // any remaining local work, and the lease is always released.
      assert.deepEqual(order, ["acquire", "model-start", "release"]);

      // The provider receives exactly the trusted instruction and content.
      assert.equal(seenInputs.length, 1);
      assert.equal(seenInputs[0].systemInstruction.includes("State the intended fix"), true);
      assert.equal(seenInputs[0].systemInstruction.includes("fix the login flow"), false);
      assert.equal(seenInputs[0].userContent.includes("fix the login flow"), true);
      assert.equal(seenInputs[0].reasoningEffort, "high");
      assert.equal(seenInputs[0].completionBudget, 8192);

      // The success payload stays exactly the pure-engine facts plus the
      // canonicalized render of the model output.
      const engine = enhancePrompt(request.prompt, {
        level: "standard",
        taskType: "bug-fix",
        sections: ["objective", "requirements"],
      });
      assert.deepEqual(result.result.analysis, engine.analysis);
      assert.deepEqual(result.result.classification, engine.classification);
      assert.deepEqual(result.result.resolved.sections, ["objective", "requirements"]);
      assert.deepEqual(result.result.generation, { kind: "ai", provider: "openrouter", model: OPENROUTER_MODEL });
      assert.equal(result.ok, true);
      assert.match(
        result.result.markdown,
        /^# Objective\n\nFix the login flow\.\n\n## Requirements\n\n- Keep the API stable\.$/,
      );

      // Invalid requests still fail closed as invalid_request with no provider call.
      let guardedProviderCalls = 0;
      const guarded = createOrchestrator({
        admission: {
          acquire: async () => ({
            status: "admitted" as const,
            leaseId: "lease-guarded",
            expiresAt: 1,
            retryAfterMs: 0,
            retryAfterSeconds: 0,
            activeCount: 1,
            prunedCount: 0,
          }),
          release: async () => {
            // Lease expiry is the crash-safe cleanup path in this stub.
          },
        },
        model: {
          complete: async () => {
            guardedProviderCalls += 1;
            return "{}";
          },
        },
      });
      await assert.rejects(
        guarded.enhance({ ...request, prompt: "" }, { signal: new AbortController().signal }),
        (error: { code?: string }) => error.code === "invalid_request",
      );
      assert.equal(guardedProviderCalls, 0);
    },
  },
] as const;
