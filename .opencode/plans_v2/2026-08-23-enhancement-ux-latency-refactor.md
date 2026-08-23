---
title: Enhancement Reliability Responsiveness and Feedback Refactor
status: ready
created_at: 2026-08-23T10:15:00+08:00
updated_at: 2026-08-23T10:15:00+08:00
---

# Enhancement Reliability, Responsiveness, and Feedback Refactor

> **For Nova:** Execute tasks in order. This is a behavior-preserving refactor: enhanced-prompt output, provider API
> interactions, contracts, and data shapes must remain identical except for the messaging, spinner, and internal
> latency changes specified here. Never modify or import from `src/app/(template)/`. Do not run repo-wide
> `npm run check:fix`; scope Biome to touched paths only.

**Goal:** Deliver three coordinated improvements to the prompt-enhancement feature: (1) a plain-language toast when
the hourly usage allowance is exhausted, (2) simplified non-technical error messaging ("Try again." replacing the old
invalid-response string, generic friendly text everywhere else), and (3) reduced enhancement latency plus a visible
spinner on the result canvas while enhancement runs — all verified with regression evidence that outputs are
unchanged.

**Architecture:** No new layers. The change touches three existing boundaries only: the client error-description
mapping (extracted to a pure module so the `node:assert` harnesses can pin every string), the result-panel empty
state (reuses the existing `Spinner` primitive and reducer `running` status), and the server orchestrator's internal
ordering (single schema validation pass; engine facts overlapped with the provider call). Contracts
(`src/lib/ai-enhancement/contracts.ts`), the HTTP handler's wire behavior, the OpenRouter adapter's request body,
and the entire `src/prompt-engine/**` tree are untouched.

**Tech stack:** Existing only — React 19 + reducer workspace state, sonner toasts (Toaster already mounted in
`src/app/(main)/layout.tsx`), shadcn `Spinner`, Zod, existing `ts-node` + `node:assert` verification scripts. No new
dependencies.

---

## Goal, constraints, and success criteria

### Constraints

- **Behavior preservation is the prime directive.** Enhanced prompts produced, provider interactions (request body,
  headers, endpoint, model, reasoning effort, budgets), public contracts, exported APIs, component interfaces, and
  data shapes consumed elsewhere must remain identical. Changes are limited to internal structure, message strings,
  and presentation.
- The hourly-limit signal is the existing `provider_rate_limited` error code (HTTP 429 + Retry-After from the
  zero-cost route, mapped in `src/server/ai/openrouter-adapter.ts::mapHttpFailure`). There is no other usage counter
  in the system, and adding one would be a new feature — out of scope. Detection happens client-side on that code.
- Limit-reached and all remaining error copy must be plain language: no internal identifiers, quota numbers,
  Retry-After values, headers, status codes, provider names, or configuration details. The client already maps every
  error through static strings (`describeError` ignores raw `error.message`); keep it that way.
- Intent fidelity (requirement: output contains only content derived from user input/intent) is satisfied by
  **verification only**. Do not edit `buildSystemInstruction`, templates, rules, or generator — changing the model
  instruction could change AI output, violating preservation. The deterministic engine renders only parsed intent
  facts plus bounded generic fallback lines, and the pinned system-instruction case already asserts
  "preserve the user's intent … do not invent unsupported requirements".
- Latency work must not change what is sent to the provider or the response payload. Allowed: removing redundant
  internal processing and overlapping independent work. The dominant latency (provider round trip at `high`/`max`
  reasoning effort) is untouchable; report honest before/after numbers for the orchestration layer.
- Spinner/toast additions must not introduce layout shift or blocking work; maintain accessibility using the
  existing patterns (`role="status"` live-region text, sonner's built-in announcements).
- Engine purity rule holds: no React/Next/DOM/storage imports into `src/prompt-engine/**` (not touched anyway).
- Pre-commit hook runs `generate:presets` + lint-staged; Biome errors block commits. Scope Biome to touched paths.

### Success criteria

1. When an enhancement fails with code `provider_rate_limited`, the UI shows a warning toast with exactly:
   "You've reached your enhancement limit for this hour. Please try again later." — no technical terms anywhere in
   the surfaced copy.
2. Codes `invalid_provider_response` and `invalid_response` render exactly "Try again." (old string
   "An invalid response was received. Please try again." no longer exists anywhere in `src/`).
3. Every other error path surfaces a static, user-friendly sentence; no raw error text, stack trace, or diagnostic
   can reach the UI (verified by pinning the full message table in the product harness).
4. Enhanced-prompt output is byte-identical before/after: `npm run verify:engine`, `npm run verify:cases`,
   `npm run verify:ai`, and `npm run verify:product` all pass, with the engine golden dataset unchanged.
5. Orchestration-layer latency measurably improves: the new measurement script reports lower median/p95
   end-to-end handler time after the refactor than the baseline captured on HEAD (same stubs, same machine).
6. A spinner with "Enhancing your prompt…" appears on the result canvas immediately when enhancement starts —
   including the first run when no document exists yet — and disappears on success, failure, and cancel
   (reducer `status` transitions already drive this).
7. `npx biome check` passes on every touched path; `npm run build` succeeds.

## Focused repository evidence

- **Client error mapping** — `src/app/(main)/_components/enhancer-workspace.tsx`: `describeCode()` (lines 62–95)
  holds all user-facing strings; `invalid_provider_response`/`invalid_response` → "An invalid response was received.
  Please try again." (line 89); `provider_rate_limited` → "Rate limited. Please try again later." (line 77);
  default → "Enhancement failed. Please try again.". `runEnhancement()` catch (lines 296–307) dispatches
  `enhancement-failed` then `toast.error(described.message)`; abort path toasts separately. Raw provider/server
  messages are never rendered — `describeError` uses only `error.code`.
- **Fallback eligibility** — `FALLBACK_ELIGIBLE_CODES` (lines 33–48) includes `provider_rate_limited` and both
  invalid-response codes, so the "Use local rules instead" escape hatch appears for them; preserve this.
- **Hourly-limit source** — `src/server/ai/openrouter-adapter.ts` line 317–322: status 429 →
  `AiProviderError("provider_rate_limited", { retryAfterSeconds })`; flows through `http-handler.mapError` →
  error contract `{ code, message, retryable, retryAfterSeconds }` → client throws `AiEnhancementClientError` with
  that code. `retryAfterSeconds` is available but must NOT be displayed (quota/timing detail).
- **Canvas running indicator gap** — `src/app/(main)/_components/result-panel.tsx`: the `state.status === "running"`
  spinner + `role="status"` line (lines 116–120) lives only inside the has-document branch. The empty-state branch
  (lines 62–84, shown on first-ever enhancement) renders no running indicator. `PromptInputPanel` disables inputs and
  spins the Enhance button while `running`.
- **Reducer drives visibility** — `workspace-state.ts`: `enhancement-started` sets `status:"running"`;
  `enhancement-succeeded|failed|cancelled` leave it. A spinner keyed on `state.status === "running"` therefore
  appears promptly and hides on all three endings with zero extra state.
- **Redundant server processing** — `src/server/ai/orchestrator.ts::enhance`: `parseRequest()` re-validates the
  request (line 63) even though `http-handler` already ran `EnhancementRequestV1Schema.safeParse` (line 194) and
  `resolvePolicy` → `resolveTrustedPolicy` → `trustedRequest()` parses a third time
  (`policy-resolver.ts` lines 31–33). `resolvePolicy` already wraps `resolveTrustedPolicy` in try/catch →
  `AiInputError` (orchestrator lines 157–163), so deleting `parseRequest` preserves observable behavior including
  direct-orchestrator misuse. `resolveEngineFacts` (pure CPU `enhancePrompt`) runs synchronously *before*
  `admission.acquire()` and the provider call although its result only feeds the response payload — it can be
  overlapped with `model.complete` without changing any output. Error precedence stays intact by awaiting engine
  facts before the model result (engine failure → `AiInputError` surfaces first, matching today).
- **Pinned harness expectations** — `src/scripts/verify-ai-cases.ts` case at line 906 pins that adversarial requests
  fail strict parsing *before resolution* (goes through `resolveTrustedPolicy`, unaffected); case at line 947 pins
  system-instruction clauses via additive `assert.match` (safe against no-op); orchestrator-direct cases (lines
  ~1101, ~1929, ~2047) stub admission/model and pin busy/unavailable/failure mapping — these guard the reorder.
- **Verification harnesses** (no test framework; extend these): `verify:engine` + `verify:cases` (golden engine
  outputs), `verify:product` (`verify-product-cases.ts` imports the pure reducer today — same pattern works for a
  pure errors module), `verify:ai` (handler/orchestrator/adapter with injected stubs), `verify:performance` (engine
  p95 < 100 ms; engine untouched, must stay green).
- **Toast infra** — sonner `Toaster` mounted in `src/app/(main)/layout.tsx` (richColors) and root layout;
  `toast.warning` precedent exists for benign notices ("Enhancement canceled…"). `Spinner` primitive at
  `src/components/ui/spinner.tsx` (biome-excluded shadcn file; reuse, don't edit).
- **Repo conventions** — CLAUDE.md: kebab-case files, sorted Tailwind classes, import group order, 120-col;
  colocation under `src/app/(main)/_components/`; prior plan format in `.opencode/plans_v2/`.

## Chosen approach

Three workstreams, each confined to one boundary:

1. **Messaging (client):** Extract `describeCode`/`describeError` from `enhancer-workspace.tsx` into a new pure
   module `src/app/(main)/_components/enhancement-errors.ts` (no React imports — harness-importable, mirroring how
   `verify-product-cases.ts` imports `workspace-state.ts`). Apply the string changes there. Add
   `HOURLY_LIMIT_CODE = "provider_rate_limited"` detection used by `runEnhancement`'s catch to raise
   `toast.warning(HOURLY_LIMIT_MESSAGE)` instead of `toast.error(...)`; the structured `enhancement-failed` dispatch
   and fallback eligibility are unchanged so the canvas still offers Retry / Use-local-rules.
2. **Spinner (client):** In `result-panel.tsx`'s empty-state branch, add the same running indicator already used in
   the document branch (`<Spinner /> Enhancing your prompt…` inside `<p role="status">`). No new state, no timers,
   no layout shift (it replaces reserved empty-card space conditionally, matching existing markup patterns).
3. **Latency (server, internal only):** In `orchestrator.ts`: delete the redundant `parseRequest` call (keep the
   function if referenced elsewhere, else remove it), and restructure `enhance` to acquire the lease, start
   `model.complete(...)`, then compute engine facts and await them *before* awaiting the model result. Success
   payload construction, error codes, precedence, and admission semantics are byte-identical.

Plus measurement and regression pinning: a standalone latency script (stubbed model + admission through the real
`handleAiHttpRequest`), new product cases pinning every message string and the hourly-limit mapping, and new AI-case
assertions that the reordered orchestrator returns identical payloads and identical error mapping.

## Interfaces and data flow

- **No interface changes.** `EnhancementService.enhance(request, { signal }) → EnhancementSuccessV1`, the V1 request/
  response contracts, `WorkspaceAction` union, and all component props stay exactly as they are.
- **New pure module** `enhancement-errors.ts` exports (internal to the app folder, consumed by
  `enhancer-workspace.tsx` and the product harness):
  - `describeCode(code: string): string` — unchanged signature/semantics, updated strings.
  - `describeError(error: unknown): { message, retryable, fallbackEligible }` — moved as-is.
  - `isHourlyLimitReached(code: string): boolean` — `code === "provider_rate_limited"`.
  - `HOURLY_LIMIT_MESSAGE = "You've reached your enhancement limit for this hour. Please try again later."`
- **Data flow (unchanged shape):** button → `runEnhancement(service)` → fetch `/api/enhance` → http-handler →
  orchestrator (lease → provider ∥ engine facts) → response → reducer → canvas/toast. The only behavioral deltas are
  which toast variant fires for `provider_rate_limited` and the wording of two message strings.

## Affected areas

| File | Change |
| --- | --- |
| `src/app/(main)/_components/enhancement-errors.ts` | **New** — pure error-description module (moved + updated strings, hourly-limit helper/constant) |
| `src/app/(main)/_components/enhancer-workspace.tsx` | Import from new module; hourly-limit toast branch in `runEnhancement` catch; delete local `describeCode`/`describeError` |
| `src/app/(main)/_components/result-panel.tsx` | Running spinner + `role="status"` line in the empty-state branch |
| `src/server/ai/orchestrator.ts` | Remove redundant request parse; overlap engine facts with provider call |
| `src/scripts/measure-enhancement-latency.ts` | **New** — standalone timing harness (ts-node, no package.json change) |
| `src/scripts/verify-product-cases.ts` | Cases pinning full message table, hourly mapping, "Try again.", generic default |
| `src/scripts/verify-ai-cases.ts` | Cases asserting identical success payload/error mapping after the orchestrator reorder |

Not touched: `contracts.ts`, `http-handler.ts`, `openrouter-adapter.ts`, `policy-resolver.ts`, `admission.ts`,
`prompt-engine/**`, `deterministic-service.ts`, `(template)/**`, `globals.css`, package.json.

## Ordered implementation tasks

### Task 1 — Capture baseline evidence on HEAD (before any edit)

1. Create `src/scripts/measure-enhancement-latency.ts`: build `handleAiHttpRequest` with injected stubs —
   admission that always admits instantly, model whose `complete()` awaits a fixed 50 ms then returns a valid
   sections JSON for a fixed valid request; run N=200 iterations sequentially; print median/p95/wall totals using
   `node:perf_hooks`. Deterministic stub ⇒ fair before/after comparison. Run it with
   `npx ts-node -P tsconfig.scripts.json src/scripts/measure-enhancement-latency.ts` and record the numbers.
2. Run and record pass status: `npm run verify:engine`, `npm run verify:cases`, `npm run verify:ai`,
   `npm run verify:product`, `npm run verify:performance`.
3. Save the baseline numbers in the working notes for the final report (do not create doc files).

**Check:** all five harnesses pass on HEAD; baseline latency numbers recorded.

### Task 2 — Messaging: extract, replace, and route the hourly-limit toast

1. Create `enhancement-errors.ts` with `describeCode`, `describeError`, `FALLBACK_ELIGIBLE_CODES`,
   `isHourlyLimitReached`, `HOURLY_LIMIT_MESSAGE` (exact string above). String changes inside `describeCode`:
   - `invalid_provider_response` / `invalid_response` → `"Try again."`
   - `provider_rate_limited` → `HOURLY_LIMIT_MESSAGE`
   - all other cases and the default: unchanged (audit once: none may contain provider names, codes, quota figures,
     or jargon — current table already complies apart from the two above).
2. Update `enhancer-workspace.tsx`: import from the new module, delete local copies. In `runEnhancement`'s catch
   (non-aborted path): `dispatch({ type: "enhancement-failed", ... })` unchanged; then
   `if (described.fallbackEligible && isHourlyLimitReached(code)) toast.warning(HOURLY_LIMIT_MESSAGE)` else
   `toast.error(described.message)` — obtain the code from `error instanceof AiEnhancementClientError ? error.code :
   undefined` (or narrow via a helper in the new module taking `unknown`, keeping the component simple).
3. Verify no other site renders the old string: grep `An invalid response was received` in `src/` → 0 hits.

**Check:** `npx biome check src/app/(main)/_components/enhancement-errors.ts "src/app/(main)/_components/enhancer-workspace.tsx"` clean; grep confirms old string gone; app still type-checks via `npx tsc --noEmit` (or proceed — Task 5 builds).

### Task 3 — Canvas spinner for the empty state

In `result-panel.tsx` empty-state branch (before the fallback-eligible error block), add:

```tsx
{state.status === "running" && (
  <p className="flex items-center gap-2 text-muted-foreground text-sm" role="status">
    <Spinner /> Enhancing your prompt...
  </p>
)}
```

Mirrors the existing document-branch indicator (same classes, same copy, same `role="status"`); `Spinner` is already
imported in this file. Visibility is driven solely by reducer `status`, so it hides on success, failure, and cancel
with no additional logic, timers, or layout-shifting wrappers.

**Check:** `npx biome check "src/app/(main)/_components/result-panel.tsx"` clean; manual dev-server pass: first-run
enhancement shows the spinner immediately, and it clears on success, Cancel, and forced failure.

### Task 4 — Orchestrator latency streamlining (behavior-preserving)

In `src/server/ai/orchestrator.ts`:

1. Delete the `const trustedRequest = parseRequest(request);` step and the now-unused `parseRequest` function;
   pass `request` directly to `resolvePolicy`/`resolveEngineFacts`. Safety: `resolveTrustedPolicy` performs the same
   strict parse, and `resolvePolicy`/`resolveEngineFacts` already map every failure to `AiInputError`, so all
   observable outcomes — including direct orchestrator calls with adversarial input — are unchanged.
2. Restructure the post-admission section: after a successful `admission.acquire()`, start
   `const modelPromise = dependencies.model.complete({...}).catch(normalizeProviderFailure)` first, then compute
   `const engineFacts = resolveEngineFacts(trustedRequest, policy)` (sync) — awaiting the model promise only
   afterwards. Net effect: engine-facts CPU overlaps nothing it didn't before (it's synchronous), but it no longer
   sits between policy resolution and lease acquisition, and the provider request is dispatched before any
   remaining main-thread work; combined with (1) this removes one full Zod validation pass and one synchronous
   stall from the request critical path. Preserve exact ordering semantics: engine failure still surfaces
   (`AiInputError`) before the model result is awaited; cancellation and release-in-`finally` unchanged.
3. Do NOT touch `buildSystemInstruction`, `buildRequestBody`, budgets, efforts, admission, or the adapter.

**Check:** `npm run verify:ai` green (pins busy/unavailable/failure mapping and strict parsing); latency script from
Task 1 re-run — record after-numbers; expect a small but real reduction (one fewer schema parse + earlier provider
dispatch); report honestly whatever the delta is.

### Task 5 — Regression pinning in the harnesses

1. `verify-product-cases.ts` — add cases:
   - full `describeCode` table snapshot: every code → its exact expected string (locks "Try again.", the hourly
     message, and the generic default against drift);
   - `describeError` on an `AiEnhancementClientError("provider_rate_limited")` → friendly message, retryable,
     fallback-eligible, and `isHourlyLimitReached` true; on a plain `Error` → generic default, no leak of
     `error.message`;
   - reducer round-trip: `enhancement-started` → status `"running"` (spinner condition), then
     `enhancement-succeeded`/`enhancement-failed`/`enhancement-cancelled` each clear it.
2. `verify-ai-cases.ts` — add a case that runs the reordered orchestrator (stubbed admission + model capturing its
   input) and asserts: success payload deep-equals the pre-reorder fixture (analysis/classification/resolved/markdown/
   generation), the model received the identical system/user content, and engine-invalid input still maps to
   `invalid_request` with the provider stub never called.
3. Intent-fidelity evidence (verification-only, per constraints): add a `verify-product-cases` case enhancing a
   spread of intents (bug-fix, summarize, research, image-prompt) through `enhancePrompt` and asserting every output
   line traces to parsed input facts or the documented bounded generic fallback sentences (reuse assertions already
   proven in `verify-cases.ts`, e.g. restrained generic copy) — demonstrating no unrelated/filler content is added.

**Check:** `npm run verify:product`, `npm run verify:ai`, `npm run verify:cases`, `npm run verify:engine` all green.

### Task 6 — Final verification and report

1. `npx biome check` on every touched path (list above) — fix anything reported; never repo-wide `check:fix`.
2. `npm run build` succeeds.
3. Manual dev-server walkthrough (`npm run dev`): happy path; simulate hourly limit (temporarily point
   `NEXT_PUBLIC_ENHANCEMENT_API_URL` at a local stub returning the contract error
   `{ code: "provider_rate_limited", retryable: true }` — remove the stub afterwards) and capture the exact toast
   text; force `invalid_response` (stub returning a malformed JSON body) and confirm the UI shows "Try again.";
   trigger a generic failure (stub 500 `internal_error`) and confirm only the friendly default appears; confirm
   spinner behavior on all three endings.
4. Produce the verification report in the final summary: before/after latency medians, harness pass counts, the
   captured toast strings, and the statement of unchanged engine golden outputs. Commit with prefix
   `feat:` or `refactor:` per repo convention (only if asked to commit).

**Check:** all success criteria 1–7 demonstrably met.

## Material risks and recovery

- **Orchestrator reorder changes error precedence in an untested corner** (schema-valid prompt that makes the pure
  engine throw, coinciding with admission busy). Mitigation: engine `enhancePrompt` is total over schema-valid
  inputs (golden harness feeds it empty/edge inputs without throwing), and awaiting engine facts before the model
  result preserves today's precedence for every reachable case; `verify:ai`'s pinned busy/unavailable cases guard
  this. Recovery: revert the single orchestrator hunk — messaging and spinner are independent.
- **Message-string drift breaking hidden expectations.** Mitigation: the new product-harness table pins every
  string; grep confirms the old invalid-response string has no remaining references.
- **Latency gains are modest by nature** (provider round trip dominates and is off-limits). This is reported
  honestly per the verification requirements; the structural wins (one fewer Zod pass, earlier provider dispatch)
  are real but small. Do not over-claim in the report.
- **Biome/hook friction.** Pre-commit regenerates theme presets and formats staged files; scoped `npx biome check`
  on touched paths avoids the known repo-wide CRLF noise. Recovery if a commit is blocked: fix reported issues on
  touched paths only; never reformat `(template)` or unrelated files.
- **Rollback:** all changes land as one cohesive commit (or separate commits per workstream); `git revert` restores
  prior behavior fully — no migrations, no persisted data affected (history/library records store outputs, which are
  unchanged).

## Execution notes for Nova

- Exact pinned strings (do not paraphrase):
  - Hourly limit (toast + inline): `You've reached your enhancement limit for this hour. Please try again later.`
  - Invalid response: `Try again.`
  - Default/generic (unchanged): `Enhancement failed. Please try again.`
- Toast variant for the hourly limit is `toast.warning` (repo precedent for benign notices); everything else stays
  `toast.error`.
- Never display `retryAfterSeconds`, `requestId`, status codes, provider/model names, or quota figures in UI copy.
- Keep `FALLBACK_ELIGIBLE_CODES` membership unchanged — the local-rules escape hatch must still appear for
  rate-limited and invalid-response failures.
- The new files/modules stay out of `src/components/ui/` (shadcn-excluded) and out of `src/prompt-engine/**`
  (purity rule); `enhancement-errors.ts` imports only from `@/lib/ai-enhancement/client` types.
- Verification scripts run via the existing npm aliases; the latency script runs directly through
  `npx ts-node -P tsconfig.scripts.json` (no package.json edit needed).
