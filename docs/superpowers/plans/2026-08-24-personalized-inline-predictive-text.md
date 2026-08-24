# Personalized Inline Predictive Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local-first inline predictive text to the Enhance prompt textarea, ranking continuations from prompt history before using an optional AI fallback, with faded ghost text and Tab acceptance.

**Architecture:** Read the existing IndexedDB history reactively, pass structurally typed history entries to a pure deterministic ranker, and display its suffix through a textarea mirror. Only when the ranker returns no sufficiently relevant result should a debounced, abortable client call the existing enhancement API endpoint using a new discriminated predictive-text request; prompt history never leaves the browser.

**Tech Stack:** Next.js 16 App Router, React 19, strict TypeScript, Dexie/IndexedDB, existing OpenRouter server adapter, Zod, Tailwind v4, shadcn/ui, Node `assert` verification scripts, Biome.

---

## Plan Destination

Save this document verbatim to:

`docs/superpowers/plans/2026-08-24-personalized-inline-predictive-text.md`

## Repository Findings and Decisions

- `src/app/(main)/_components/prompt-input-panel.tsx` owns the current controlled shadcn `Textarea`; prompt changes are dispatched to the workspace reducer.
- `src/app/(main)/_components/enhancer-workspace.tsx` owns prompt state, the current AI endpoint, and `MemoryRepository`. Successful enhancements create `HistoryRecord` entries.
- History is already local and usable: `HistoryRecord.originalPrompt` and `createdAt` are stored in Dexie and `memoryRepository.listHistory()` returns newest-first records. History is capped at 100–1000 entries, so an in-memory ranker needs no database migration or index.
- Predictions use only `HistoryRecord.originalPrompt`. Enhanced Markdown and saved-library records are not prediction sources.
- The existing `history_enabled` setting is documented as preventing new history writes, but the current workspace does not read it before `addHistoryAndPrune`. Correct that integration while adding prediction history access. Turning it off does not delete or stop use of existing history; users can clear existing history through current controls.
- The current `/api/enhance` endpoint already provides CORS, request bounds, admission control, OpenRouter access, cancellation, safe errors, and static-host indirection through `NEXT_PUBLIC_ENHANCEMENT_API_URL`. Extend that endpoint with a strictly discriminated predictive request instead of creating a second route or public environment variable.
- Static export removes `src/app/api/**`, while the browser uses the configured external endpoint. No dynamic API, cookie read, or server action will be added under `src/app/(main)/`.
- Contextual history matching will be deterministic lexical matching plus the existing prompt classifier’s task/category signal. Do not add embeddings, vector storage, a worker, or another dependency.
- A suggestion is offered only when the textarea is focused, the selection is collapsed, the caret is at the end, and IME composition is inactive. Moving the caret or selecting text suppresses prediction rather than attempting insertion in the middle.
- Empty input produces no suggestion. Exact history prefix matching starts at two non-whitespace characters; contextual matching starts at eight characters with at least two meaningful tokens; AI fallback starts at twelve characters.
- AI fallback sends only the current draft prefix, never history. It is enabled only when the existing public AI endpoint is configured. Failure is silent because prediction is optional and must not interrupt typing.
- The current About page contains absolute local-only claims that conflict with the already-shipped AI path. Update those claims and disclose predictive fallback accurately.
- No test framework is added. Pure ranking, contracts, client, orchestration, and endpoint dispatch use a dedicated `ts-node` plus `node:assert/strict` harness, following existing `verify:product` and `verify:ai` patterns.

## Data Flow and Boundaries

1. `EnhancerWorkspace` observes local history with `useLiveQuery()` and creates a predictive-text client from the same endpoint used for enhancement.
2. `PromptInputPanel` passes the controlled prompt, history state, and prediction service to `PredictivePromptInput`.
3. `PredictivePromptInput` tracks focus, selection, scroll, and composition state and calls `usePredictiveSuggestion`.
4. `usePredictiveSuggestion` runs `findHistorySuggestion()` synchronously.
5. If local history is resolved and no history result crosses its threshold, the hook waits 600 ms and invokes the AI service.
6. The existing `/api/enhance` handler identifies `{ kind: "predictive-text" }`, validates it independently from the unchanged enhancement request schema, and delegates to `PredictiveTextOrchestrator`.
7. The orchestrator uses existing admission and OpenRouter infrastructure and returns a bounded append-only suffix.
8. The hook applies a response only when it is still keyed to the exact current input and request generation.
9. The textarea mirror renders `value` invisibly for layout and renders only `completion` in muted text. The real textarea remains the sole editable/accessibility control.
10. Unmodified Tab accepts a visible suggestion. Shift+Tab and modified Tab retain normal focus behavior. Escape dismisses the current suggestion so keyboard users can leave the field.

## Core Interfaces

Create these public contracts and keep names consistent across all tasks:

```ts
export type PredictiveHistoryEntry = {
  id: string;
  createdAt: number;
  originalPrompt: string;
  taskType: PromptTaskType;
  category: PromptCategory;
};

export type HistorySuggestion = {
  source: "history";
  match: "prefix" | "contextual";
  completion: string;
  historyId: string;
  score: number;
};

export function findHistorySuggestion(
  input: string,
  history: readonly PredictiveHistoryEntry[],
  now: number,
): HistorySuggestion | null;
```

```ts
export const PREDICTIVE_TEXT_API_VERSION = 1 as const;
export const PREDICTIVE_TEXT_REQUEST_KIND = "predictive-text" as const;
export const MIN_AI_PREDICTION_INPUT_CHARACTERS = 12;
export const MAX_AI_PREDICTION_CHARACTERS = 240;
export const MAX_AI_PREDICTION_WORDS = 24;

export type PredictiveTextRequestV1 = {
  kind: "predictive-text";
  version: 1;
  input: string;
};

export type PredictiveTextSuccessV1 = {
  version: 1;
  ok: true;
  requestId: string;
  completion: string;
};

export type PredictiveTextResponseV1 = PredictiveTextSuccessV1 | PredictiveTextErrorV1;
```

`PredictiveTextErrorV1` must use the existing `EnhancementErrorCode` values and the same error payload shape already returned by the endpoint.

```ts
export type PredictiveTextService = {
  complete(
    request: PredictiveTextRequestV1,
    options?: { signal?: AbortSignal },
  ): Promise<PredictiveTextSuccessV1>;
};
```

```ts
export type PredictiveSuggestion =
  | { source: "history"; completion: string }
  | { source: "ai"; completion: string };

export function usePredictiveSuggestion(options: {
  input: string;
  eligible: boolean;
  history: readonly PredictiveHistoryEntry[];
  historyResolved: boolean;
  service: PredictiveTextService | null;
}): {
  suggestion: PredictiveSuggestion | null;
  dismiss: () => void;
};
```

## File Map

### Create

- `src/lib/predictive-text/history-ranker.ts` — pure history normalization, prefix/context matching, recency/frequency scoring, and deterministic selection.
- `src/lib/predictive-text/contracts.ts` — strict predictive API types, constants, and Zod schemas.
- `src/lib/predictive-text/client.ts` — HTTPS/same-origin predictive client with timeout, cancellation, and response validation.
- `src/server/ai/predictive-text-orchestrator.ts` — admission-controlled OpenRouter continuation generation and output normalization.
- `src/app/(main)/_components/use-predictive-suggestion.ts` — local-first selection, debounce, cancellation, stale-response protection, dismissal, and small session cache.
- `src/app/(main)/_components/predictive-prompt-input.tsx` — textarea mirror, caret/composition state, keyboard handling, accessibility semantics, and scroll synchronization.
- `src/scripts/verify-predictive-text-cases.ts` — deterministic feature verification cases.
- `src/scripts/verify-predictive-text.ts` — dependency-light verification runner.

### Modify

- `package.json` — add `verify:predictive-text`.
- `src/server/ai/http-handler.ts` — dispatch the new discriminated request while leaving existing enhancement parsing unchanged.
- `src/app/(main)/_components/enhancer-workspace.tsx` — observe history, create the prediction service, honor `history_enabled` on writes, and pass prediction inputs down.
- `src/app/(main)/_components/prompt-input-panel.tsx` — replace the bare textarea with `PredictivePromptInput` and add truthful inline data-use copy.
- `README.md` — document local-history prediction and optional online fallback.
- `.env.example` — clarify that the existing public endpoint handles enhancement and predictive fallback.
- `src/app/(main)/about/page.tsx` — replace false absolute local-only claims with accurate local-first/optional-AI language.

### Explicitly Unchanged

- `src/app/(template)/**`
- `src/prompt-engine/**`
- `src/lib/browser-memory/database.client.ts`
- Backup formats and Dexie schema
- Preference configuration/boot machinery
- `src/app/api/enhance/route.ts`
- `vercel.json`
- `.github/workflows/deploy-pages.yml`
- `src/components/ui/textarea.tsx`

## Task 1: Establish Baseline and Guardrails

**Files:** No product changes.

- [ ] **Step 1: Confirm the working tree and frozen subtree**

Run:

```powershell
git status --short
git diff --name-only -- "src/app/(template)"
```

Expected:

- Existing unrelated changes are identified before implementation.
- The second command prints nothing.
- Do not modify, stage, discard, or overwrite unrelated work.

- [ ] **Step 2: Run the current targeted verification baseline**

Run:

```powershell
npm run verify:product
npm run verify:ai
npx tsc --noEmit
```

Expected:

- Product and AI harnesses report all current cases passed.
- TypeScript exits with code 0.
- Record any pre-existing failure before changing files; do not attribute it to this feature.

- [ ] **Step 3: Reconfirm architectural exclusions**

Verify that implementation will not require a storage migration or dynamic main route:

```powershell
git grep -n "listHistory" -- "src/lib/browser-memory/repository.client.ts"
git grep -nE "cookies\(|headers\(|draftMode\(" -- "src/app/(main)"
```

Expected:

- `listHistory()` already exists.
- No new dynamic API is needed in `(main)`.

## Task 2: Implement and Verify Deterministic History Ranking

**Files:**
- Create: `src/lib/predictive-text/history-ranker.ts`
- Create: `src/scripts/verify-predictive-text-cases.ts`
- Create: `src/scripts/verify-predictive-text.ts`
- Modify: `package.json`

**Dependencies:** Task 1.

- [ ] **Step 1: Add the dedicated verification command**

Add:

```json
"verify:predictive-text": "ts-node -P tsconfig.scripts.json src/scripts/verify-predictive-text.ts"
```

Keep package script ordering consistent with the existing verification scripts.

- [ ] **Step 2: Create the Node assertion runner**

Follow the existing `verify-product.ts` style. The runner must await synchronous or asynchronous cases, print individual failures, and finish with:

```text
predictive-text: 18/18 passed
verify-predictive-text: ALL PASS (18 checks)
```

It must set a nonzero exit code on any failure.

- [ ] **Step 3: Add failing ranking cases before the implementation**

The first cases must assert:

1. Empty, whitespace-only, and one-character input return `null`.
2. `"Create a weekly"` against `"Create a weekly sales report for the management team"` returns exactly `" sales report for the management team"`.
3. Matching is case-insensitive while preserving the user’s typed prefix and the historical suffix.
4. Exact prefix candidates are considered before every contextual candidate.
5. With equal frequency, a recent exact candidate outranks an old exact candidate.
6. A strongly repeated prompt/continuation can outrank a single moderately newer candidate.
7. `"Draft a weekly"` can use the historical anchor in `"Create a weekly sales report for management"` and return `" sales report for management"`.
8. Weak contextual overlap below the threshold returns `null`.
9. Trailing spaces and multiline suffixes join without doubled boundary whitespace.
10. A history record equal to the current input, blank history text, or a result over the 15,000-character prompt limit is ignored.

Run:

```powershell
npm run verify:predictive-text
```

Expected: TypeScript fails because `history-ranker.ts` or its exports do not yet exist.

- [ ] **Step 4: Implement normalization and tokenization**

Use these rules:

- Preserve original text for returned suffixes.
- Use `normalize("NFKC").toLowerCase()` only for comparison keys.
- Collapse comparison whitespace to a single space.
- Tokenize Unicode letters/numbers with original start/end offsets.
- Maintain a compact common stop-word set so words such as “the”, “a”, “to”, and “for” do not establish relevance alone.
- A meaningful token is non-stop-word text with at least three alphanumeric characters.
- Never mutate the provided history array.
- Reject any suggestion where `input + completion` exceeds `MAX_PROMPT_CHARACTERS`.

- [ ] **Step 5: Implement strict exact-prefix selection**

An exact candidate is eligible when:

- The trimmed input contains at least two characters.
- `history.originalPrompt` begins with the raw input under case-insensitive comparison.
- The remaining suffix is nonempty.
- The accepted result remains within the existing prompt character limit.

If at least one exact candidate exists, do not consider contextual candidates.

Rank exact candidates with:

```text
exactRank = 0.55 × recency + 0.45 × frequency
```

Use:

```text
recency = exp(-ln(2) × ageInDays / 30)
```

This gives recency a 30-day half-life.

- [ ] **Step 6: Implement frequency signals**

Build per-invocation corpus maps for the bounded history set:

- Full normalized prompt count.
- Distinct one-, two-, and three-token meaningful phrase counts per history record.
- Non-general task-type counts.

For each candidate:

- Build a phrase key from the first one to three meaningful tokens in its proposed completion.
- `phraseCount` is the larger of the full-prompt duplicate count and matching leading-phrase count.
- Normalize counts with `log2(count + 1) / log2(history.length + 1)`.
- Compute frequency as 75% phrase/full-prompt frequency plus 25% non-general task frequency.

This makes repeated wording and recurring tasks material without allowing the ubiquitous `general` task to dominate.

- [ ] **Step 7: Implement contextual suffix matching**

Only attempt contextual matching when:

- Trimmed input length is at least eight.
- The input has at least two meaningful tokens.
- The candidate is not an exact prefix.
- A completion remains after the anchor.

For each history record:

1. Find the longest suffix of the current token sequence, up to four tokens, that appears contiguously in the historical prompt.
2. Require the anchor to contain at least one meaningful token.
3. Derive completion from the original character immediately after that historical anchor.
4. If the input already ends in whitespace, remove overlapping leading whitespace from the completion.
5. Compare meaningful current tokens with meaningful historical tokens up to and including the anchor.
6. Compute:
   - `coverage`: meaningful current-token overlap divided by meaningful current-token count.
   - `anchorStrength`: `min(1, anchorTokenCount / 3)`.
   - `intent`: `1` for the same non-general task type, `0.5` for the same non-general category, otherwise `0`. Use the existing pure parser/classifier once for the current input; do not modify the engine.
7. Compute:

```text
relevance = 0.55 × coverage + 0.30 × anchorStrength + 0.15 × intent
```

A contextual candidate is sufficiently relevant at `relevance >= 0.45`.

Rank qualified contextual candidates with:

```text
contextRank = 0.70 × relevance + 0.20 × recency + 0.10 × frequency
```

Break equal scores by newest `createdAt`, then stable lexical `id`.

- [ ] **Step 8: Run the ranking checks**

Run:

```powershell
npm run verify:predictive-text
```

Expected: Ranking cases pass; contract/client/server cases added later may remain absent, but the final harness must contain exactly 18 cases.

## Task 3: Add Predictive API Contracts and Browser Client

**Files:**
- Create: `src/lib/predictive-text/contracts.ts`
- Create: `src/lib/predictive-text/client.ts`
- Modify: `src/scripts/verify-predictive-text-cases.ts`

**Dependencies:** Task 2.

- [ ] **Step 1: Add failing contract cases**

Test strict acceptance and rejection for:

- `{ kind: "predictive-text", version: 1, input }`.
- Twelve characters as the inclusive AI minimum.
- The existing 15,000-character input maximum.
- Whitespace-only input rejection.
- Unknown root keys and missing/wrong `kind` rejection.
- Success completion length of 1–240 characters.
- Existing public AI error codes and retry metadata.
- Malformed success/error payload rejection.

Run the harness and expect failure because schemas are not implemented.

- [ ] **Step 2: Implement strict contracts**

Use Zod `.strict()` objects.

The predictive request must include `kind` so the shared endpoint can dispatch without weakening `EnhancementRequestV1Schema`. Do not add a discriminator or optional property to the existing enhancement request.

Reuse `ENHANCEMENT_ERROR_CODES` and `EnhancementErrorCode` for public failure compatibility. Keep predictive success limited to a suffix string; do not include history, prompts, policies, models, provider controls, or server instructions in the browser contract.

- [ ] **Step 3: Add failing browser-client cases**

Assert that the client:

- Sends one JSON POST to the configured existing endpoint.
- Uses `credentials: "omit"` and `cache: "no-store"`.
- Sends only `kind`, `version`, and `input`.
- Accepts same-origin relative URLs and HTTPS URLs.
- Rejects non-local HTTP URLs.
- Allows local HTTP only when explicitly enabled for development checks.
- Validates the response schema before returning it.
- Distinguishes caller abort, timeout, network failure, and malformed response.
- Does not expose raw server/provider response bodies in thrown messages.

- [ ] **Step 4: Implement `createPredictiveTextClient`**

Use this factory shape:

```ts
export function createPredictiveTextClient(config: {
  endpoint: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  allowLocalHttpForTests?: boolean;
}): PredictiveTextService;
```

Decisions:

- Default timeout: 8,000 ms.
- Forward the caller signal into an internal timeout controller.
- Remove listeners and clear the timer in `finally`.
- Parse JSON once and validate with `PredictiveTextResponseV1Schema`.
- Throw a typed safe client error for failures.
- Never retry automatically; typing changes and server admission already provide natural retry boundaries.

- [ ] **Step 5: Run contract/client verification**

Run:

```powershell
npm run verify:predictive-text
```

Expected: All completed ranking, contract, and client cases pass.

## Task 4: Extend the Existing AI Endpoint for Predictive Requests

**Files:**
- Create: `src/server/ai/predictive-text-orchestrator.ts`
- Modify: `src/server/ai/http-handler.ts`
- Modify: `src/scripts/verify-predictive-text-cases.ts`

**Dependencies:** Task 3.

- [ ] **Step 1: Add failing orchestrator cases**

Use fake admission and model implementations to verify:

- Admission is acquired before model execution.
- Busy/unavailable admission errors propagate through existing safe mappings.
- The lease is released after success and failure.
- The system instruction never contains the user input.
- `userContent` contains only JSON-wrapped untrusted `sourcePrefix`.
- Model invocation uses low reasoning, the existing 2,048 low-effort budget, and JSON response mode.
- A valid model object such as `{"completion":" sales report"}` returns the exact append-only suffix.
- A model that repeats the complete input has that exact prefix removed before validation.
- Boundary whitespace is normalized without corrupting multiline text.
- Empty, malformed, over-240-character, over-24-word, control-character, or over-total-prompt-limit output is rejected safely.

- [ ] **Step 2: Implement the prediction orchestrator**

Expose:

```ts
export interface PredictiveTextOrchestrator {
  complete(
    request: PredictiveTextRequestV1,
    context: {
      signal: AbortSignal;
      onCompletionMetadata?: (metadata: ModelCompletionMetadata) => void;
    },
  ): Promise<PredictiveTextSuccessV1>;
}
```

Use the existing `ModelAdapter`, `Admission`, cancellation, provider errors, request IDs, and `OPENROUTER_MODEL` infrastructure.

The fixed system instruction must require:

- A short continuation appended directly to the supplied prefix.
- JSON only: `{"completion":"..."}`.
- No repetition of the prefix.
- No task solution, tools, Markdown wrapper, commentary, hidden-policy disclosure, or invented sensitive details.
- At most 24 words and 240 characters.
- Treatment of the source prefix as untrusted data.

Parse the model JSON as an exact one-key object. Normalize CRLF to LF, strip an accidentally repeated source prefix case-insensitively, remove trailing whitespace, resolve one boundary whitespace overlap, and validate all limits. Preserve a meaningful leading space/newline when needed for appending.

- [ ] **Step 3: Add failing shared-handler dispatch cases**

Verify:

1. A valid predictive request reaches only the predictive orchestrator.
2. A normal existing enhancement request reaches only the enhancement orchestrator.
3. Unknown or malformed `kind` values return `invalid_request`.
4. Predictive requests retain existing origin, method, content-type, body-size, service-enabled, CORS, and error behavior.
5. Predictive success validates before response.
6. Existing enhancement response shape remains unchanged.

- [ ] **Step 4: Extend `AiHttpHandlerOptions` and runtime**

Add an optional injected `predictor` for verification. Construct the default predictor from the same model and admission instances as enhancement.

After JSON parsing:

- If the value is an object with `kind === "predictive-text"`, validate only with `PredictiveTextRequestV1Schema` and call the predictor.
- Otherwise, validate only with the unchanged `EnhancementRequestV1Schema`.
- Never accept predictive fields in the enhancement contract.
- Continue using the existing common error response, CORS headers, request-size checks, provider metadata, safe logging, and status mapping.

- [ ] **Step 5: Run predictive and regression AI checks**

Run:

```powershell
npm run verify:predictive-text
npm run verify:ai
npx tsc --noEmit
```

Expected:

- Predictive checks completed so far pass.
- Existing AI checks remain fully green.
- The strict enhancement request tests still reject unknown root keys.

## Task 5: Add Local-First Suggestion Coordination

**Files:**
- Create: `src/app/(main)/_components/use-predictive-suggestion.ts`
- Modify: `src/scripts/verify-predictive-text-cases.ts`

**Dependencies:** Tasks 2–4.

- [ ] **Step 1: Implement immediate local selection**

Call `findHistorySuggestion(input, history, Date.now())` with `useMemo`.

Return a history suggestion immediately whenever it exists. Never start or retain an AI request while a history result is available.

Suppress all prediction when `eligible` is false.

- [ ] **Step 2: Implement AI eligibility and debounce**

AI fallback may begin only when all conditions are true:

- `historyResolved` is true.
- The local ranker returned `null`.
- `service` is non-null.
- Input contains at least 12 characters.
- Input is below the existing prompt maximum.
- The exact input was not dismissed.
- The exact input is not already represented in the session cache.

Wait 600 ms after the last eligible input change before calling the service.

- [ ] **Step 3: Implement race and stale-response protection**

Use both an `AbortController` and a monotonically increasing request generation:

- Abort the prior request on input, eligibility, history result, service, dismissal, or unmount changes.
- Capture the exact input and generation when dispatching.
- Apply a completion only if the hook is still mounted, the signal is not aborted, the generation is current, and the hook’s current input equals the captured input.
- Keep AI state keyed as `{ input, completion }`; never render an AI completion against another input.
- Clear stale AI state synchronously when inputs no longer match.
- Swallow optional prediction failures without toast, field error, or focus changes.

- [ ] **Step 4: Add a bounded session cache**

Use an insertion-ordered `Map<string, string | null>` held in a ref:

- Cache successful AI completions by exact input.
- Cache a `null` outcome for malformed/failed exact inputs so blur/refocus does not repeatedly transmit the same text.
- Retain at most 20 entries by deleting the oldest.
- Always check current history before a cached AI value so newly added local history takes precedence.

- [ ] **Step 5: Implement dismissal**

`dismiss()` must:

- Mark only the exact current input as dismissed.
- Abort its pending request.
- Clear its visible suggestion.
- Allow prediction again after the text changes.

- [ ] **Step 6: Complete the 18-case harness**

Add the remaining cases for orchestration and handler routing so the final list contains exactly the 18 scenarios defined across Tasks 2–4.

Run:

```powershell
npm run verify:predictive-text
```

Expected:

```text
predictive-text: 18/18 passed
verify-predictive-text: ALL PASS (18 checks)
```

The React timing layer remains manually verified because the repository has no DOM test framework; do not install one for this feature.

## Task 6: Build the Inline Predictive Textarea

**Files:**
- Create: `src/app/(main)/_components/predictive-prompt-input.tsx`
- Modify: `src/app/(main)/_components/prompt-input-panel.tsx`

**Dependencies:** Task 5.

- [ ] **Step 1: Create the focused textarea component**

Use a narrow prop surface:

```ts
type PredictivePromptInputProps = {
  id: string;
  value: string;
  disabled: boolean;
  history: readonly PredictiveHistoryEntry[];
  historyResolved: boolean;
  predictionService: PredictiveTextService | null;
  onValueChange: (value: string) => void;
};
```

Keep workspace reducer/storage details outside this component.

- [ ] **Step 2: Track prediction eligibility**

Track:

- Focus state.
- `selectionStart` and `selectionEnd`.
- Composition state.
- The textarea ref.
- Mirror scroll position and measured content width.

Prediction is eligible only when focused, enabled, not composing, selection is collapsed, and both selection positions equal `value.length`.

Refresh selection state on focus, select, click, keyup, composition end, and accepted insertion. Clear eligibility on blur and composition start.

- [ ] **Step 3: Render the ghost-text mirror**

Use a relative wrapper containing:

1. An `aria-hidden="true"`, pointer-events-none mirror viewport.
2. The real controlled shadcn `Textarea` above it.

The mirror must:

- Use the same font size, line height, padding, width, wrapping, and whitespace behavior as the textarea.
- Render the current `value` with transparent text so it occupies identical layout.
- Render only `suggestion.completion` with faded muted foreground text.
- Preserve spaces and newlines with pre-wrap behavior.
- Match the textarea’s `clientWidth` using `ResizeObserver` so a vertical scrollbar does not shift wrapping.
- Synchronize `scrollTop` and `scrollLeft` from the textarea’s `onScroll`.
- Remain non-interactive and absent from the accessibility tree.

Do not modify the generated `src/components/ui/textarea.tsx` or add global CSS.

- [ ] **Step 4: Implement keyboard semantics**

In `onKeyDown`:

- Ignore events during composition.
- On unmodified, non-Shift Tab with a visible suggestion:
  - Call `preventDefault()`.
  - Append the complete suffix.
  - Call `onValueChange(value + completion)`.
  - Restore a collapsed caret at the new end on the next animation frame.
- On Escape with a visible/pending suggestion:
  - Call `preventDefault()`.
  - Dismiss the exact current input.
- Do not intercept normal printable keys, Enter, Backspace, arrows, modified Tab, or Shift+Tab.
- If no suggestion is visible, Tab retains normal browser focus traversal.

Typing any character must update the controlled value normally; stale ghost text disappears through the keyed hook state.

- [ ] **Step 5: Add accessibility metadata**

The real textarea must have:

- A real label, visually hidden if needed: “Prompt to enhance”.
- `aria-autocomplete="inline"`.
- `aria-keyshortcuts="Tab"` only while a suggestion is visible.
- `aria-describedby` referencing:
  - A persistent short prediction/data-use explanation.
  - A polite status node that says “Prediction available. Press Tab to accept, or Escape to dismiss.” without reading the full private completion aloud.

Keep the ghost text `aria-hidden`. Do not use combobox/listbox roles because there is no selectable suggestion list.

- [ ] **Step 6: Replace the existing bare textarea**

In `PromptInputPanel`:

- Remove its direct `Textarea` import and JSX.
- Render `PredictivePromptInput` with the same `id`, prompt value, disabled/running state, and prompt-change dispatch.
- Extend props with `history`, `historyResolved`, and `predictionService`.
- Preserve the existing card layout, prompt length counter, controls, button behavior, and running-state disablement.
- Add visible subdued copy below the textarea:

```text
Predictions use local history first. When no history match is relevant, the current draft—not your history—may be sent to the configured AI service.
```

- [ ] **Step 7: Run scoped component checks**

Run:

```powershell
npx biome check "src/app/(main)/_components/predictive-prompt-input.tsx" "src/app/(main)/_components/use-predictive-suggestion.ts" "src/app/(main)/_components/prompt-input-panel.tsx"
npx tsc --noEmit
```

Expected: No Biome or TypeScript errors.

## Task 7: Integrate Live History, AI Service, and History Privacy

**Files:**
- Modify: `src/app/(main)/_components/enhancer-workspace.tsx`

**Dependencies:** Task 6.

- [ ] **Step 1: Observe current history reactively**

Use `useLiveQuery`:

```ts
const historyRecords = useLiveQuery(
  () => (memoryStatus === "ready" ? repository.listHistory() : Promise.resolve([])),
  [memoryStatus, repository],
);
```

Derive:

- `history = historyRecords ?? []`.
- `historyResolved = memoryStatus === "unavailable" || (memoryStatus === "ready" && historyRecords !== undefined)`.

Do not run AI while local memory is still loading. If local memory is known to be unavailable, allow optional AI fallback with an empty history set.

- [ ] **Step 2: Create the prediction service from the existing endpoint**

Reuse the current module-level `ENDPOINT`. Create a stable ref-backed `PredictiveTextService` with:

```ts
createPredictiveTextClient({
  endpoint: ENDPOINT,
  allowLocalHttpForTests: process.env.NODE_ENV !== "production",
});
```

When `ENDPOINT` is null, pass `null`; local history prediction continues without network fallback.

Do not add `NEXT_PUBLIC_PREDICTION_API_URL`.

- [ ] **Step 3: Pass prediction dependencies to the input panel**

Provide:

- `history`
- `historyResolved`
- `predictionService`

Do not move prompt state out of the existing reducer.

- [ ] **Step 4: Honor the existing history setting**

Select `historyEnabled` from the preferences store.

At the start of `saveToHistory`, return without adding or showing an “Added to local history” toast when `historyEnabled` is false. Successful enhancement remains successful and the current result remains usable.

Existing records remain available to prediction until the user clears them. This matches the setting’s current wording: it controls saving new history, not retention/use of existing entries.

- [ ] **Step 5: Verify live precedence behavior structurally**

Confirm the workspace order is:

1. Enhancement succeeds.
2. A history record is added when enabled.
3. Dexie live query refreshes.
4. New local data becomes available to future predictions.

No history array may be included in a predictive network request.

- [ ] **Step 6: Run integration checks**

Run:

```powershell
npm run verify:product
npm run verify:predictive-text
npx biome check "src/app/(main)/_components/enhancer-workspace.tsx" "src/app/(main)/_components/prompt-input-panel.tsx" "src/app/(main)/_components/predictive-prompt-input.tsx" "src/app/(main)/_components/use-predictive-suggestion.ts"
npx tsc --noEmit
```

Expected: All commands pass.

## Task 8: Correct Privacy and Deployment Documentation

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `src/app/(main)/about/page.tsx`

**Dependencies:** Tasks 4 and 7.

- [ ] **Step 1: Document local-first prediction in README**

State explicitly:

- Exact and contextual history ranking runs in the browser.
- Prompt history remains in IndexedDB and is never included in predictive API requests.
- Only the current draft prefix may be sent to the configured API after local history produces no sufficiently relevant suggestion.
- AI prediction is unavailable when `NEXT_PUBLIC_ENHANCEMENT_API_URL` is blank.
- Provider retention and sensitivity warnings already documented for enhancement also apply to predictive fallback.

- [ ] **Step 2: Clarify the environment variable**

Change `.env.example` comments so `NEXT_PUBLIC_ENHANCEMENT_API_URL` is described as the public endpoint for both explicit enhancement and optional predictive fallback. Do not add a secret or second endpoint variable.

- [ ] **Step 3: Correct About-page claims**

Replace claims such as “Nothing is sent anywhere,” “Your prompts never leave your device,” and “All processing happens locally” with accurate statements:

- History, library, folders, settings, and local ranking stay in the browser.
- Explicit AI enhancement and unmatched predictive drafts may use the configured online provider.
- History is not transmitted for prediction.
- No analytics/tracking database is introduced.
- Sensitive or confidential prompts should not be used with online AI features.

Preserve the page’s current visual structure.

- [ ] **Step 4: Run documentation-adjacent checks**

Run:

```powershell
npx biome check "src/app/(main)/about/page.tsx"
npx tsc --noEmit
git grep -nE "Nothing is sent anywhere|prompts never leave|All processing happens locally" -- "src/app/(main)/about/page.tsx" "README.md"
```

Expected:

- Biome and TypeScript pass.
- The grep prints no obsolete absolute privacy claim.

## Task 9: Final Scoped Verification

**Files:** All files listed in the file map.

**Dependencies:** Tasks 1–8.

- [ ] **Step 1: Run all targeted feature/regression harnesses**

```powershell
npm run verify:predictive-text
npm run verify:product
npm run verify:ai
```

Expected:

- Predictive text: 18/18 checks passed.
- Product and existing AI checks remain fully passed.

- [ ] **Step 2: Run strict type checks**

```powershell
npx tsc -p tsconfig.engine.json --noEmit
npx tsc --noEmit
```

Expected: Both exit with code 0.

- [ ] **Step 3: Run Biome only on touched code/config paths**

```powershell
npx biome check "package.json" "src/lib/predictive-text" "src/server/ai/http-handler.ts" "src/server/ai/predictive-text-orchestrator.ts" "src/app/(main)/_components/enhancer-workspace.tsx" "src/app/(main)/_components/prompt-input-panel.tsx" "src/app/(main)/_components/predictive-prompt-input.tsx" "src/app/(main)/_components/use-predictive-suggestion.ts" "src/app/(main)/about/page.tsx" "src/scripts/verify-predictive-text.ts" "src/scripts/verify-predictive-text-cases.ts"
```

Expected: No errors. Do not run repo-wide `npm run check:fix`.

- [ ] **Step 4: Verify normal and static builds**

```powershell
npm run build
$env:NEXT_PUBLIC_ENHANCEMENT_API_URL = "https://example.invalid/api/enhance"
npm run build:static
Remove-Item Env:NEXT_PUBLIC_ENHANCEMENT_API_URL
```

Expected:

- Normal Next build includes the API route and succeeds.
- Static build succeeds, emits enhancer routes, and excludes API/template server code.
- A configured HTTPS endpoint is embedded without exposing server credentials.

- [ ] **Step 5: Verify architecture and secret boundaries**

```powershell
git diff --name-only -- "src/app/(template)"
git diff --name-only -- "src/prompt-engine"
git grep -nE "cookies\(|headers\(|draftMode\(" -- "src/app/(main)"
git grep -nE "OPENROUTER_API_KEY|UPSTASH_REDIS_REST_TOKEN|Bearer [A-Za-z0-9_-]{10,}" -- "src/app/(main)" "src/lib/predictive-text"
git diff --check
```

Expected:

- Frozen template and prompt engine diffs are empty.
- No dynamic API appears in `(main)`.
- No server secret appears in browser-owned files.
- No whitespace errors are reported.

- [ ] **Step 6: Inspect only intended changes**

```powershell
git status --short
git diff --stat
git diff -- "package.json" ".env.example" "README.md" "src/lib/predictive-text" "src/server/ai/http-handler.ts" "src/server/ai/predictive-text-orchestrator.ts" "src/app/(main)/_components" "src/app/(main)/about/page.tsx" "src/scripts/verify-predictive-text.ts" "src/scripts/verify-predictive-text-cases.ts"
```

Expected: Only the planned files and any pre-existing unrelated changes appear. Do not stage or commit as part of this planning handoff.

## Manual Verification Matrix

Run `npm run dev` with a working local AI configuration when testing fallback. Complete these checks with keyboard-only interaction and again at 200% zoom.

1. **Exact prefix**
   - Submit `Create a weekly sales report for the management team` once so it enters history.
   - Return to the Enhance input and type `Create a weekly`.
   - Expected: ` sales report for the management team` appears faded directly after the typed text.

2. **Tab acceptance**
   - Press unmodified Tab while that suggestion is visible.
   - Expected: The full suffix becomes editable textarea text, the caret is at the end, and no extra or missing whitespace appears.

3. **Uninterrupted typing**
   - Instead of accepting, type another character.
   - Expected: The keystroke appears normally; the prior ghost text disappears or recomputes without focus loss.

4. **History before AI**
   - Open DevTools Network and repeat an exact or qualified contextual history match.
   - Expected: No predictive network request is sent while the history suggestion exists.

5. **Contextual similarity**
   - With the weekly-report history entry present, type `Draft a weekly`.
   - Expected: The compatible historical continuation appears even though the entire prompt is not an exact prefix.

6. **Recency/frequency**
   - Rely on `verify:predictive-text` for deterministic timestamp/frequency assertions.
   - In UI, repeat one prompt several times and ensure its continuation is selected over otherwise comparable wording.

7. **AI fallback**
   - Type at least 12 characters that do not match history and pause for more than 600 ms.
   - Expected: At most one request is sent with `{ kind, version, input }`; no history array, enhanced prompt, settings, provider controls, or API credentials are present.
   - If successful, only a short append-only suffix appears.

8. **Race/staleness**
   - Use network throttling, pause long enough to start prediction for one input, then type more before it returns.
   - Expected: The old completion never appears against the newer input. The old request is aborted where supported.

9. **Failure behavior**
   - Disable the endpoint or go offline and type an unmatched input.
   - Expected: Normal typing, enhancement controls, and local history prediction continue. No toast, blocking error, or stale ghost text appears.

10. **Empty and short inputs**
    - Focus an empty field, type one character, then enter whitespace.
    - Expected: No prediction.
    - Type a two-character exact history prefix.
    - Expected: History may suggest; AI does not run before 12 characters.

11. **Caret and selection**
    - Move the caret into the middle or select a range.
    - Expected: Ghost text disappears and Tab follows normal focus behavior.
    - Return a collapsed caret to the end.
    - Expected: Prediction resumes.

12. **Multiline and scrolling**
    - Enter multiple lines until the textarea scrolls, then type at the final caret.
    - Expected: Ghost text wraps and scrolls in exact alignment.
    - Accept a continuation containing a newline.
    - Expected: Text and caret remain correct.

13. **Composition/IME**
    - Enter text through an IME.
    - Expected: No suggestion or Tab interception occurs during composition; prediction starts only after composition ends.

14. **Keyboard escape path**
    - Press Escape while a suggestion is visible, then press Tab.
    - Expected: The current suggestion remains dismissed and Tab can move focus. Changing the text permits a new suggestion.

15. **Accessibility**
    - Inspect the textarea accessibility tree.
    - Expected: A real label, `aria-autocomplete="inline"`, contextual `aria-keyshortcuts`, and described help/status are present; mirrored ghost text is absent.
    - A screen reader announces availability/instructions, not the entire private completion on every keystroke.

16. **History setting**
    - Disable “Save history locally,” run an enhancement, and inspect History.
    - Expected: No new record or success toast is added.
    - Existing records still provide predictions until explicitly cleared.

17. **Static deployment behavior**
    - Serve the static output with no endpoint.
    - Expected: Local history prediction works and AI fallback remains silently unavailable.
    - Serve with the public endpoint configured.
    - Expected: Both explicit enhancement and predictive request kinds use that endpoint.

## Risks, Dependencies, and Recovery

- **Server/client deployment order:** The public endpoint must understand the new request kind before the static client expects AI prediction. Deploy server support first. An older endpoint returns a safe invalid response; the client ignores it and local prediction still works.
- **Automatic online data flow:** AI fallback transmits the current unmatched draft after a pause. Mitigation: local matching always runs first, history is never sent, requests are bounded/debounced/abortable, and near-input plus product documentation is explicit.
- **Provider latency/rate pressure:** Per-keystroke provider traffic would be unacceptable. The 12-character minimum, 600 ms debounce, exact-input cache, cancellation, server admission, and history-first suppression are required behavior rather than optional optimization.
- **Lexical contextual limits:** The selected YAGNI design recognizes compatible token anchors and existing task/category intent, not arbitrary synonym-only paraphrases. Inputs without an append-compatible historical anchor fall through to AI rather than forcing a misleading local completion.
- **Textarea mirror alignment:** Font metrics, scrollbar width, wrapping, zoom, and multiline scroll can drift across browsers. Shared typography, `ResizeObserver`, and scroll synchronization reduce this; manually verify Chromium and at least one non-Chromium browser if supported.
- **No automated DOM runner:** Pure and server behavior is automated with existing Node facilities. Keyboard, IME, screen-reader semantics, mirror layout, and stale UI behavior require the manual matrix; adding Jest/Vitest/Playwright is outside this feature’s justified scope.
- **No migration risk:** The feature reads existing records and adds no Dexie table/index or backup field. Rollback consists of removing the predictive UI/hook/client and shared-handler branch; stored user data remains unchanged.
- **History preference correction:** If the write guard causes an unexpected workflow issue, restore only the previous write behavior while retaining prediction reads. No data conversion is involved.

## Requirement Coverage and Self-Review

| Requirement | Implementation coverage |
|---|---|
| Exact history prefix and remainder | Task 2 exact-prefix tier; Tasks 6–7 rendering/integration |
| Recent usage priority | Task 2 30-day recency score |
| Frequent words, phrases, prompts, and tasks | Task 2 corpus phrase/full-prompt/task frequency maps |
| Contextual similarity without exact prefix | Task 2 anchored lexical similarity plus classifier intent |
| AI only without sufficiently relevant history | Tasks 2 and 5 explicit threshold and local-first gate |
| Inline faded ghost text | Task 6 synchronized textarea mirror |
| Tab accepts the full suggestion | Task 6 keyboard handling |
| Typing remains uninterrupted | Tasks 5–6 keyed clearing and no interception of normal keys |
| History precedes AI | Tasks 5 and 7 plus manual network check |
| Race/staleness handling | Task 5 abort controller, generation, exact-input key |
| Accessibility and keyboard semantics | Task 6 label, ARIA, Tab/Shift+Tab/Escape, hidden mirror |
| Privacy/local-first behavior | Tasks 5, 7, and 8; history never transmitted |
| Empty/short input behavior | Tasks 2, 3, and 5 thresholds |
| Multiline/caret/selection behavior | Task 6 end-caret gating and mirror scroll/wrap |
| Failure behavior | Tasks 3–5 silent optional failure; manual offline check |
| Static-host compatibility | Task 4 shared endpoint and Task 9 static build |
| Existing history/storage prerequisite | Repository already has bounded Dexie history; no migration |
| No invented test framework | Dedicated Node assertion harness in Tasks 2–5 |
| Frozen template and pure engine boundaries | No planned edits/imports from template; no engine edits |
| Scoped Biome verification | Tasks 6–9 use explicit touched paths only |

All feature requirements map to concrete tasks and acceptance checks. The plan contains no unresolved implementation decision, new runtime dependency, database migration, or speculative abstraction.
