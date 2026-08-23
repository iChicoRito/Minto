---
title: Diagnose Prompt Enhancement Pass-Through
status: complete
created_at: 2026-08-22T14:08:29+08:00
updated_at: 2026-08-22T14:18:55+08:00
---

# Prompt Enhancement Pass-Through Diagnosis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `systematic-debugging` and execute this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. Preserve unrelated working-tree changes and do not invoke speculative fixes.

**Goal:** Confirm and report the root causes that make Prompt Enhancer preserve user wording while adding structure,
including the headed `# Objective` case and the identical behavior across manually selected prompt types.

**Architecture:** Treat this as a diagnostic-only boundary trace. Reproduce the defect through the public
`enhancePrompt` contract, then follow the same data from the workspace through parser, category/template resolution,
content assembly, Markdown formatting, and result display. Use existing modules and in-memory commands only; product
behavior remains unchanged until a separate task defines what “enhanced” output must mean for a deterministic no-AI
engine.

**Tech Stack:** TypeScript 5.9, `ts-node`, Node `assert` harness, pure prompt engine, Next.js/React workspace.

---

## Goal, constraints, and success criteria

### Constraints and boundaries

- The task in `prompts/04.md` requests diagnosis, not remediation. Do not edit product code, tests, configuration,
  documentation, databases, dependencies, or deployment files during execution.
- Do not edit or import from `src/app/(template)/`.
- Preserve the V1 product boundary: processing is local, synchronous, deterministic, and has no AI or network service.
- Do not equate added headings with transformed content. Evaluate objective/body wording separately from Markdown
  structure.
- Do not use subjective similarity thresholds as proof. The decisive checks compare exact strings and trace the branch
  that produced them.
- Preserve the current dirty workspace. The existing prompt and historical plan changes are user work and are not part
  of this diagnosis.
- This diagnostic scope is fully decided and has no external dependency. Defining or implementing remediation is a
  separate product task, not a blocker to a ready diagnosis.

### Success criteria

1. The exact `prompts/04.md` input is reproduced through the public engine and appears byte-for-byte beneath the newly
   generated `# Objective` heading.
2. Replaying that input with each of the 13 explicit task types and the workspace’s default section selection produces
   identical Markdown while `resolved.taskType` changes, confirming the cross-category symptom.
3. An action-led prompt and a non-parser action such as `Rewrite ...` demonstrate both pass-through paths: slot
   reconstruction and raw-text fallback.
4. The report identifies the first responsible branches, the category/section override interaction, and the verification
   coverage gap with file-and-line evidence.
5. UI, storage, classifier scoring, template resolution, and Markdown formatting are either implicated precisely or
   ruled out; no layer is blamed by inference alone.
6. `npm run verify:engine` remains green, proving the defect is compatible with the current golden expectations rather
   than an existing harness failure.
7. Execution ends with a concise diagnosis in the handoff response and no repository changes.

## Focused repository evidence

- `src/app/(main)/_components/enhancer-workspace.tsx:137-155` calls `enhancePrompt` with the selected level, task type,
  and section list. `workspace-state.ts:114-133` copies `result.markdown` directly into both generated and editable
  result fields; `result-panel.tsx:107-123` displays that value. The UI does not append or rewrite engine output.
- `src/lib/preferences/prompt-preferences.ts:4-10,37-42` limits normal workspace section controls to five generic IDs and
  defaults to Objective, Requirements, Constraints, and Verification. The type selector does not replace that list.
- `src/prompt-engine/index.ts:147-185` is the public pipeline. When callers supply sections—as the workspace always
  does—line 154 bypasses `selectSections(template, level, parsed)`. The resolved template still changes metadata, but
  its task-specific section recipe does not control normal workspace output.
- `src/prompt-engine/parser/parse-prompt.ts:56-66,147-177` recognizes an action only when the first word is one of 11
  controlled verbs and derives a subject only from that action. A Markdown document beginning `# Objective` therefore
  has no action or subject. `rewrite` and `summarize` are task types but are absent from `ACTION_VERBS` in
  `parser/vocabularies.ts:11-23`, so their natural imperative inputs also enter fallback behavior.
- `src/prompt-engine/rules/light-polish.ts:48-71` reconstructs non-fix action/subject prompts with nearly the same words,
  and when slots are absent it returns the trimmed raw input with only capitalization/final-period normalization.
- `src/prompt-engine/index.ts:44-55,120-140` delegates every non-fix Objective to `polishLight`; Requirements copy the
  parser’s derived list, Constraints copy extracted wording, and all other bodies use generic section phrases. Neither
  `buildObjective` nor `buildContent` receives resolved task type or category, so category cannot influence prose.
- `src/prompt-engine/generator/generate-markdown.ts:33-70` is formatting-only by design. It adds headings/bullets around
  prepared content and is not the source of the preserved wording.
- `src/scripts/verify-cases.ts:503-530,578-601` pins output that copies or minimally normalizes the input, while
  `verify-engine.ts:423-437` checks the 120-item dataset only for task classification and determinism. There is no
  cross-category content-quality assertion.
- Focused execution during planning confirmed all 13 manual task types produce identical Markdown for `prompts/04.md`
  with default workspace sections, while every `resolved.taskType` is correct and the raw prompt is embedded exactly.
  The existing engine harness simultaneously reports `ALL PASS (166 checks)`.
- Git history shows the same authored objective/narrative policy entered with pipeline commit `63686b7`; this is not a
  later result-panel or storage regression.

## Chosen diagnostic approach

Use one exact-input reproduction matrix and one stage trace; do not add instrumentation or permanent diagnostic code.
The public result already exposes `analysis`, `classification`, `resolved`, and `markdown`, which is enough to locate the
first information loss and distinguish content policy from display behavior.

### Root-cause hypotheses to confirm

1. **Primary—pass-through content policy:** the engine’s Objective and Requirements builders intentionally reuse raw text
   or action/subject slots; most “enhancement” consists of generic neighboring sections.
2. **Input-shape trigger:** headed/multi-section Markdown fails the first-word action parser, forcing full raw fallback
   into Objective and producing a nested `# Objective` document.
3. **Cross-category cause:** workspace-supplied generic sections override template recipes, and the content builders are
   task/category blind. Changing category can update resolved metadata without changing Markdown.
4. **Coverage gap:** golden cases prove deterministic formatting/classification and currently bless minimal-copy output;
   they do not assert transformation quality across categories or headed inputs.

### Explicit non-causes

- The result panel and workspace state pass through `result.markdown`; they do not create the copied text.
- The classifier can resolve a different task type, but classification alone has no prose-authoring role.
- Templates contain section IDs only, not content transformation functions.
- The Markdown generator formats already prepared content and correctly preserves its input.
- History/library persistence stores the completed result after generation and cannot affect the first render.

## Interfaces and data flow

### Public diagnostic contract

```ts
enhancePrompt(raw: string, options?: {
  level?: EnhancementLevel;
  taskType?: PromptTaskType;
  sections?: readonly SectionId[];
}): {
  analysis: PromptAnalysis;
  classification: ClassificationResult;
  resolved: ResolvedEnhancement;
  markdown: string;
};
```

No interface change is planned. Use the returned fields to compare parsed understanding, requested/resolved type, chosen
sections, and final text in the same run.

### Runtime trace

```text
textarea raw text
  -> enhancer-workspace passes raw + level + taskType + generic sections
  -> parsePrompt (headed input yields no action/subject)
  -> classifyPrompt (classification metadata)
  -> resolveTemplate(taskType)
  -> supplied sections bypass template section selection
  -> buildObjective / buildContent (raw or slot reuse + generic prose)
  -> generateMarkdown (format only)
  -> documentFromEnhancement copies result.markdown
  -> ResultPanel displays it unchanged
```

## Affected areas

All areas are **read-only evidence targets** for this diagnostic task:

- Defect input: `prompts/04.md`.
- Workspace flow: `src/app/(main)/_components/enhancer-workspace.tsx`, `workspace-state.ts`, and `result-panel.tsx`.
- Workspace defaults: `src/lib/preferences/prompt-preferences.ts` and
  `src/app/(main)/_components/prompt-input-panel.tsx`.
- Engine flow: `src/prompt-engine/index.ts`, `parser/{parse-prompt,vocabularies}.ts`, `rules/light-polish.ts`,
  `rules/select-sections.ts`, `templates/**`, and `generator/generate-markdown.ts`.
- Existing evidence: `src/scripts/{verify-cases,verify-engine,engine-dataset}.ts` and relevant Git history.
- Explicitly unchanged: every product repository path, including `src/app/(template)/**`; only this plan’s status and
  execution evidence may be updated during Nova’s run.

## Ordered execution tasks

### Task 1 — Protect the workspace and establish the green baseline

**Depends on:** none.

- [x] Record `git status --short` and identify every pre-existing modified/untracked path. Do not stage, reset, format,
  or remove any of them.
- [x] Run `npm run verify:engine`.
- [x] Require the current section totals—parser `4/4`, classifier `6/6`, templates `14/14`, rules `7/7`, generator
  `8/8`, pipeline `7/7`, dataset `120/120`—and `verify-engine: ALL PASS (166 checks)`. If counts changed, record the
  actual baseline and stop only if a check fails; do not repair an unrelated failure.

### Task 2 — Reproduce exact Objective preservation and cross-category identity

**Depends on:** Task 1.

- [x] Read `prompts/04.md` as the exact raw string, including its headings and line endings.
- [x] Call `enhancePrompt` once for each explicit `PromptTaskType` using level `standard` and
  `DEFAULT_PROMPT_SECTIONS` from `src/lib/preferences/prompt-preferences.ts`.
- [x] For every run, record only: requested task type, `analysis.action`, `analysis.subject`, `resolved.taskType`,
  `resolved.sections`, and Markdown equality flags. Do not print the complete user prompt into unrelated logs.
- [x] Assert all 13 `resolved.taskType` values match their overrides, all Markdown strings are identical, and each
  Markdown string begins with ``# Objective\n\n${raw.trim()}``. The expected parser fields are absent because `#` is
  the first token.
- [x] Repeat the exact input at `light`, `standard`, and `detailed` with Objective selected. Confirm light returns the raw
  content as prose and standard/detailed wrap the same content beneath a generated Objective heading; strength changes
  structure, not the source wording.
- [x] Run focused controls for `Build a dashboard`, `Research passkeys`, and `Rewrite this paragraph for clarity`.
  Confirm the first two reconstruct the same action/subject wording in Objective/Requirements, while `Rewrite ...`
  falls back to raw because `rewrite` is not a parser action verb.

### Task 3 — Trace the first responsible branch and the category override

**Depends on:** Task 2.

- [x] Trace `prompts/04.md` through `parsePrompt`, `classifyPrompt`, `resolveTemplate`, section resolution,
  `buildObjective`, `buildContent`, and `generateMarkdown`. At each boundary record input/output shape, not a proposed
  fix.
- [x] Mark `parsePrompt` as the first information-loss boundary for headed input: action/subject are absent even though
  the document contains an Objective body.
- [x] Mark `polishLight` raw fallback as the first exact pass-through branch and `buildObjective` as the caller that
  reuses it for standard/detailed output.
- [x] Confirm the normal workspace always supplies `state.controls.sections`; therefore `enhancePrompt` does not call
  `selectSections` for that run. Verify changing the type selector alone does not replace the generic section list.
- [x] Confirm the content builders accept only section ID, parsed slots, and raw input—not task type/category—so even
  preset-selected task-specific headings receive the same generic prose policy.
- [x] Trace `result.markdown` through `documentFromEnhancement` and `ResultPanel` to rule out presentation and storage.

### Task 4 — Compare current verification with the reported quality expectation

**Depends on:** Task 3.

- [x] Map the exact pipeline golden cases that expect copied/minimally changed Objective and Requirements wording.
- [x] Confirm the 120-case dataset asserts only `analysis.taskType` and two-run determinism, not expected enhanced prose.
- [x] State why a fully green harness does not contradict the defect: the suite verifies the implemented scaffold
  contract, while `prompts/04.md` expects content transformation.
- [x] Do not add a failing quality case yet. A permanent expectation requires an approved deterministic output policy;
  otherwise the test would encode an arbitrary rewrite.

### Task 5 — Deliver the root-cause report

**Depends on:** Tasks 1–4.

- [x] Return a concise handoff report with these sections: `Observed behavior`, `Boundary trace`, `Root causes`,
  `Ruled out`, `Coverage gap`, and `Remediation prerequisite`.
- [x] Under `Root causes`, report all four confirmed causes from the chosen approach and cite exact file/line ranges.
- [x] Under `Remediation prerequisite`, explain that a separate remediation scope must define a deterministic
  expected-output corpus for headed documents and each task type, or explicitly authorize an AI-backed rewrite path.
  Merely stripping `# Objective`, adding synonyms, or changing Markdown formatting does not solve the semantic quality
  defect.
- [x] Re-run `git status --short` and confirm execution created no repository changes. Report any pre-existing paths
  separately and leave them untouched.

## Targeted acceptance checks

- **Exact headed input:** generated Markdown contains the complete `prompts/04.md` text unchanged immediately beneath a
  second generated Objective heading.
- **All task types:** the 13 manual overrides resolve correctly but produce identical Markdown with default workspace
  sections.
- **Strengths:** light/standard/detailed alter wrapping/section count while preserving the same Objective source.
- **Parser split:** recognized leading actions use slot reconstruction; headed input and unsupported `Rewrite` action use
  raw fallback.
- **Category split:** omitting `options.sections` allows templates to change section IDs; supplying workspace defaults
  makes those recipes inactive. In both cases, prose remains task/category blind.
- **UI pass-through:** `result.markdown === document.generatedMarkdown === initial document.markdown` before manual edit.
- **Regression baseline:** `npm run verify:engine` reports all 166 current checks passing.
- **Scope:** final `git status --short` differs from the initial snapshot by no path.

## Material risks, recovery, and follow-up boundary

| Risk | Mitigation and recovery |
|---|---|
| “Enhancement” is subjective in a no-AI engine | Base this diagnosis on exact preservation and call paths, not prose preference. A future fix needs approved before/after fixtures per task type. |
| A headed document may intentionally be source content | Diagnose the fallback without deleting user text. Future design must distinguish “enhance this document” from “use this document as context/source.” |
| Category symptoms could be misattributed to classification | Compare `resolved.taskType` with identical Markdown and inspect the supplied-sections bypass; do not retune classifier weights. |
| A quick string rewrite masks the defect | Keep remediation out of scope. Do not strip headings, prepend adjectives, or add synonyms as a proxy for semantic transformation. |
| Diagnostic commands expose prompt contents | Log booleans, slot summaries, and hashes/equality results where possible; keep execution local and do not persist diagnostic output. |
| Accidental workspace writes | No task requires a file write. If a temporary file is accidentally created, report it and remove only that known artifact; never reset pre-existing user changes. |

No migration, data recovery, or rollback is required because this plan changes no runtime or persisted data. A later
remediation plan should preserve the existing engine/UI/storage boundaries, replace the pass-through content policy at
its source, and add approved cross-category prose fixtures before implementation.

## Execution evidence

- **Task 1 baseline:** initial and final `git status --short` contain the same pre-existing paths:
  `.opencode/plans/2026-08-21-2325-phases-2-3-understanding-and-structure.md`,
  `.opencode/plans/2026-08-22-0724-phases-2-3-current-state-completion.md`,
  `.opencode/plans/2026-08-22-0814-phases-4-5-workspace-memory.md`, `prompts/02.md`, `prompts/03.md`, and
  `prompts/04.md`, plus this plan. No product path was changed.
- **Regression:** `npm run verify:engine` passed parser `4/4`, classifier `6/6`, templates `14/14`, rules `7/7`,
  generator `8/8`, pipeline `7/7`, dataset `120/120`; total `166` checks.
- **Exact-input matrix:** an in-memory `ts-node` reproduction read `prompts/04.md` at 1,702 characters, found no
  parsed action or subject, verified all 13 explicit task-type overrides, verified identical Markdown for all 13 runs,
  and verified the raw input occurs exactly under the generated Objective heading.
- **Strength/path controls:** light output was 1,702 characters of raw prose; standard and detailed Objective-only
  output were 1,715 characters with the same raw body under the generated heading. `Build a dashboard` and
  `Research passkeys` reconstructed action/subject requirements; `Rewrite this paragraph for clarity` had no parsed
  action/subject and used raw fallback.
- **Boundary trace:** static source inspection confirmed workspace control sections are passed at
  `enhancer-workspace.tsx:146-149`, supplied sections bypass template selection at `prompt-engine/index.ts:154`, raw
  fallback occurs at `light-polish.ts:66-71`, and result Markdown is copied/displayed without rewriting at
  `workspace-state.ts:127-128` and `result-panel.tsx:111-120`.
- **Coverage:** existing pipeline cases assert deterministic Markdown and the dataset asserts task type plus
  determinism; no cross-category transformation-quality or headed-input case exists. No test or product file was added.

## Execution notes for Nova

- Use the existing public engine and default-section constant; do not duplicate production logic in a scratch module.
- Keep the reproduction matrix in memory or outside the workspace. Do not add package scripts or dependencies.
- The stop condition is an unexplained mismatch between the public run and the traced branch. Return to the preceding
  boundary and gather evidence rather than guessing.
- Completion means an evidence-backed diagnosis and a clean workspace delta, not a behavioral patch.
