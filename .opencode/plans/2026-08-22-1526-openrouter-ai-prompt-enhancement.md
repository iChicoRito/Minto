---
title: "OpenRouter AI-Powered Prompt Enhancement"
status: in-progress
created_at: 2026-08-22T15:26:07+08:00
updated_at: 2026-08-22T16:58:00+08:00
---

# OpenRouter AI-Powered Prompt Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `subagent-driven-development` (recommended) or
> `executing-plans` to implement this plan task by task. Use `using-git-worktrees` before execution so the current
> workspace's staged plans and prompt files remain untouched. Steps use checkbox (`- [ ]`) syntax for tracking.
> Approval changes this plan to `ready`; it does not authorize implementation, deployment, or use of a real key.

**Goal:** Make Ox Alpha through OpenRouter the primary online prompt-enhancement mechanism, with trusted
preset-specific behavior, level-controlled reasoning depth, bounded untrusted input/output, a protected Vercel API,
and an explicit deterministic offline/rollback path while preserving the GitHub Pages PWA.

**Architecture:** Keep the static Next.js frontend on GitHub Pages and deploy this repository a second time as a
Vercel Functions-only API project. The browser sends a narrow versioned request; server-owned policy resolves the
preset, level, sections, exact model, zero-price routing, and output format before native `fetch` calls OpenRouter.
The existing pure prompt engine remains unchanged as the explicit local fallback and supplies classification facts.

**Tech stack:** Next.js 16.3, React 19.2, TypeScript 5.9, Zod 4.4, native `fetch`, OpenRouter Chat Completions,
`stealth/ox-alpha`, Vercel Functions on Node 24, Upstash Redis through `@upstash/redis`, Dexie 4.4, Biome 2.5, and
the repository's existing `node:assert/strict` verification style.

---

## Goal and current-state baseline

This plan implements `prompts/05.md` against repository state inspected on 2026-08-22.

- `main` is at `44ac81f` and aligned with `origin/main`.
- `prompts/05.md` is untracked source material. Existing staged and untracked plan/prompt files are user work and
  must not be edited, reset, staged, or swept into implementation commits.
- The current browser workspace synchronously calls `enhancePrompt()` and stores only successful results. The engine
  is deterministic and fixed-format; it has no network, AI, safety, timeout, or response-validation boundary.
- All 17 requested presets already exist, but aliases share task behavior and the workspace does not pass `presetId`
  into the engine. The AI path must preserve identity so API Design differs from Build Feature, Database, and so on.
- Enhancement levels are `light | standard | detailed`. Today they do not consistently control depth when the UI
  supplies explicit sections.
- The release path is an enhancer-only static export to GitHub Pages. A GitHub Pages artifact cannot run a POST API
  or protect an app-owned OpenRouter key.
- No formal test framework exists. Engine, product, and performance checks use TypeScript scripts plus
  `node:assert/strict`; this plan extends that pattern rather than adding a test framework.
- Official OpenRouter evidence on 2026-08-22 shows `stealth/ox-alpha` is available but temporary, single-provider,
  mandatory-reasoning, not schema-strict, currently free, and subject to retention/training terms.

## User decisions resolved during planning

1. **Hosting:** retain the GitHub Pages/static PWA and add a separate Vercel API deployment.
2. **Audience:** keep enhancement publicly available without authentication.
3. **Admission policy:** do not impose per-IP, per-minute, per-day, or global daily quotas. Keep only an eight-call
   global concurrency lease, bounded request/output sizes, timeouts, a kill switch, and zero-price routing.
4. **Cost:** permit no paid inference. Requests must fail rather than call a priced endpoint or alternate model.
5. **Runtime:** use a personal/non-commercial Vercel Hobby project and a managed Upstash Redis database.
6. **Privacy UX:** do not block enhancement behind consent. Replace false local-only claims with a persistent,
   non-blocking disclosure that prompts are sent to OpenRouter/Stealth, may be retained or used for training, and
   must not contain sensitive or confidential information.
7. **Fallback:** AI is primary when configured and online. Local deterministic enhancement is offered explicitly
   after cancellation-independent availability failures; it is never silently substituted.
8. **Model policy:** use only exact model `stealth/ox-alpha`, exact provider `stealth`, default service tier, no
   model/provider fallback, no paid routing, no tools/plugins/search, and no browser-selectable provider settings.

## Success criteria

1. The normal configured online Enhance action calls the separate API, which calls
   `POST https://openrouter.ai/api/v1/chat/completions` with exact model `stealth/ox-alpha`.
2. `OPENROUTER_API_KEY` exists only in Vercel runtime configuration. The repository contains a blank placeholder in
   `.env.example`, never a fake or real credential and never a `NEXT_PUBLIC_` OpenRouter key.
3. Static GitHub Pages output contains no OpenRouter authorization value and contacts only the configured Vercel API.
4. All 17 existing preset IDs, labels, categories, task types, Standard defaults, and initial section lists remain
   available. Every ID resolves to distinct trusted AI guidance where its label implies distinct behavior.
5. Preset identity survives level and section changes. An explicit task-type change clears preset identity and enters
   manual mode; manual Auto uses existing classification, while explicit manual types use trusted task policy.
6. `light`, `standard`, and `detailed` map to Ox Alpha reasoning efforts `low`, `high`, and `max`, respectively, and
   change analytical depth rather than only Markdown cosmetics.
7. The browser cannot override model, provider, price ceiling, reasoning mapping, policy text, headings, tools,
   plugins, endpoint, OpenRouter headers, or output limits.
8. User text is placed only in a serialized user message and is treated as untrusted source content. System and
   preset policy are server-owned and remain in a separate system message.
9. No tools, browsing, filesystem, database, conversation history, other prompts, secrets, or privileged actions are
   made available to the model. A successful response can produce only bounded text sections.
10. Anti-injection acceptance is honest and testable: malicious text cannot alter trusted configuration or gain a
    capability, but the product does not claim that probabilistic model prose can never follow or reveal an injected
    semantic instruction.
11. Ox Alpha returns JSON mode output; the server independently validates exact section IDs, uniqueness, required
    fields, item counts, content sizes, finish reason, model, and zero cost before deterministic Markdown rendering.
12. Generated strings are escaped as text within server-supplied Markdown structure. Existing safe Markdown
    rendering remains in force; raw HTML and unsafe links never execute, including after history restore.
13. The API rejects wrong content type, malformed JSON, unknown fields/IDs, missing Objective, duplicate/disallowed
    sections, blank input, input over 15,000 characters, and request bodies over 64 KiB before OpenRouter invocation.
14. The API allows at most eight active upstream calls. Redis admission is atomic, expired leases self-heal, release
    is best-effort in `finally`, and Redis failure fails closed without calling OpenRouter.
15. The OpenRouter request pins zero prices for prompt, completion, request, image, and audio, disables fallback, and
    uses text input only. A paid/unavailable/renamed model returns a normalized unavailable error.
16. Missing key, disabled service, model removal, provider outage, rate response, malformed output, timeout, network
    failure, and cancellation preserve the user's prompt and prior result and create no history entry.
17. Retry requires an explicit user action. Cancellation aborts browser and upstream work best-effort, ignores late
    results through a run ID, and does not claim that provider processing or billing necessarily stopped.
18. Eligible failures show a clear `Use local rules instead` action. A clicked fallback is labelled
    `Local rules fallback`, runs only the existing pure engine, and stores provenance if successful.
19. AI success is labelled `AI · Ox Alpha`. History/library snapshots preserve optional generation kind/provider/model
    metadata; older records remain readable without a Dexie index or schema-version migration.
20. No prompt, enhanced output, system policy, OpenRouter authorization header, or raw provider error is logged.
    Operational records contain only request ID, status class, timing, byte/token counts, generation ID, provider,
    model, zero-cost value, and fallback/error category.
21. Product copy no longer says enhancement is local-only or non-AI. A persistent non-blocking disclosure names
    external processing, possible retention/training, and the sensitive/confidential-data restriction.
22. The frontend stays statically exportable and installable as the existing PWA. API POSTs and responses are never
    cached by the service worker; offline use remains available through explicit local fallback.
23. Existing engine checks remain unchanged and green. New AI verification uses injected fetch/admission doubles and
    never calls live OpenRouter in normal local or CI checks.
24. Root type checks, scoped Biome, production build, static build with `/prompt-enhancer`, API contract checks,
    Vercel build, frozen-template diff, secret scan, and the manual browser/adversarial matrix pass before rollout.
25. AI stays disabled until a real restricted key, zero-price smoke test, Upstash connection, exact production origin,
    Vercel API URL, copy disclosure, and rollback drill are accepted.

## Scope and constraints

### In scope

- A versioned browser-to-API enhancement contract and normalized error taxonomy.
- Trusted server policy for all 17 presets and all 13 manual task types.
- Ox Alpha level mapping, zero-price provider routing, non-streaming JSON mode, response validation, and deterministic
  Markdown normalization.
- A Vercel Web Handler, exact-origin CORS, blank server-secret placeholders, Upstash-backed global concurrency,
  timeout/cancellation propagation, kill switch, and privacy-preserving operational metadata.
- An asynchronous browser service, run IDs, cancellation, source labels, explicit retry, and explicit deterministic
  fallback while retaining current dirty-edit confirmation and success-only history behavior.
- Additive AI/local provenance in history/library/backup records without changing Dexie indexes.
- Truthful product/README metadata and a non-blocking provider privacy warning.
- Existing assertion-harness extensions, static/API builds, deployment configuration, canary, rollback, and live smoke
  protocol using synthetic non-sensitive content.

### Out of scope

- Authentication, accounts, per-user/IP quotas, CAPTCHA, paid OpenRouter usage, or a commercial Vercel plan.
- Browser BYOK, exposing an app key, model/provider selectors, automatic alternate-model routing, or a second AI model.
- Streaming/SSE, partial results, automatic retries, tool calls, web search, plugins, retrieval, prompt history in the
  model context, file/image/video inputs, or model-generated HTML.
- A claim that prompt injection is universally preventable, a regex injection blocker, a second guard model, or
  storing confidential system instructions in model-visible policy.
- New preset categories/options, custom presets, changing the 13 task types, or importing frozen template behavior.
- Server-side prompt/history storage, analytics samples containing prompt text, cloud history sync, or a new database.
- A new test framework, unrelated engine/parser refactoring, or repository-wide formatting cleanup.
- Automatic deployment, DNS purchase, enabling GitHub Pages, adding a real secret, committing, pushing, or creating a
  pull request. Those require separate execution/operations authorization.

### Hard constraints

- Never modify or import from `src/app/(template)/**`.
- Keep `src/prompt-engine/**` pure: no React, Next.js, network, storage, browser, environment, clock, or random imports.
- The network boundary lives in `src/server/ai/**`; the browser imports only `src/lib/ai-enhancement/**` and the pure
  deterministic facade.
- Preserve the current static enhancer shell. Do not add an App Router Route Handler under `src/app/**`; the API is a
  separate Vercel Function at root `api/enhance.ts` and is ignored by Next static export.
- Never accept OpenRouter request fields from the browser and never spread a browser object into the provider body.
- Treat system/preset instructions as potentially discoverable; they contain no secrets or proprietary data.
- Treat all provider output as untrusted text even after schema validation.
- Do not run repo-wide `npm run check:fix`; scope Biome to touched paths.
- Preserve all pre-existing staged/untracked files. Execute from an isolated worktree based on the accepted commit.

## Repository evidence

| Finding | Evidence | Planning consequence |
|---|---|---|
| Current workflow calls synchronous `enhancePrompt()` then stores success | `src/app/(main)/_components/enhancer-workspace.tsx:137-186` | Replace only the primary call with awaited service; preserve result/history ordering |
| Public engine returns analysis, classification, resolved controls, and Markdown | `src/prompt-engine/index.ts:24-42,147-186` | Adapt AI and local paths to one result contract; do not put network code in engine |
| Explicit UI sections bypass recipe section selection | `src/prompt-engine/index.ts:147-155` | Server policy canonicalizes sections and level controls reasoning depth independently |
| Preset ID is not passed to the engine | `enhancer-workspace.tsx:137-152` | Versioned API request carries a discriminated preset/manual selection |
| All 17 presets and mappings are centralized | `src/lib/prompt-presets.ts:5-60` | Preserve catalogue and derive a literal `PromptPresetId` union |
| Alias presets currently share task behavior | `src/lib/prompt-presets.ts:24-60` | Put label-specific distinctions in server-owned `PRESET_AI_POLICIES` |
| Existing levels are light/standard/detailed | `src/prompt-engine/types.ts:48` | Map exactly to Ox `low/high/max` |
| Existing prompt limit is 15,000 characters | `src/prompt-engine/validate-prompt.ts:1-15` | Retain in browser and enforce again on API |
| Workspace reducer already models running/error and preserves prior state | `workspace-state.ts:28-112` | Add run ID, cancellation, structured error, source, and fallback eligibility |
| Successful history is independent of history write failure | `enhancer-workspace.tsx:157-181` | AI normalization completes before history; memory errors never discard result |
| History records already preserve original/result/control metadata | `src/lib/browser-memory/types.ts:5-35` | Add optional generation metadata; no index migration |
| Backup import has strict Zod patterns | `src/lib/browser-memory/backup-schema.ts:1-115` | Extend optional provenance parsing and keep old backups valid |
| No API route or AI dependency exists | repository search; `package.json:1-80` | Add one Vercel Function, native fetch, and only `@upstash/redis` |
| GitHub Pages is the static release path | `next.config.mjs:2-23`, `src/scripts/build-static.mjs:16-42`, `.github/workflows/deploy-pages.yml:42-58` | Keep Pages; inject only public Vercel endpoint at static build time |
| Current copy promises local/no-AI processing | `README.md:3-9`, Enhance/About/layout/sidebar files | Replace every contradictory claim before enabling AI |
| No test framework exists; assertion scripts do | `CLAUDE.md`, `src/scripts/verify-*.ts` | Add `verify:ai` and extend product cases; no Jest/Vitest/Playwright |
| Template subtree is frozen | `CLAUDE.md:25-32` | Frozen-subtree status/diff is a release gate |

### Working-tree preservation baseline

At planning time, tracked staged files included three existing plan/prompt records, and untracked files included
`prompts/04.md`, `prompts/05.md`, and a plan-v2 diagnosis. Execution must re-run `git status --short`, record the
exact baseline, create a worktree, and stage only files named by the tasks below.

## Official external evidence governing the plan

- Chat endpoint, Bearer auth, request/response, error envelope, and native-fetch quickstart:
  <https://openrouter.ai/docs/quickstart> and
  <https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request>.
- Exact model metadata and endpoint: <https://openrouter.ai/api/v1/model/stealth/ox-alpha> and
  <https://openrouter.ai/api/v1/models/stealth/ox-alpha/endpoints>.
- Ox Alpha is temporary, single-provider, reasoning-required, currently free, and supports JSON mode without strict
  JSON Schema: <https://openrouter.ai/stealth/ox-alpha> and <https://openrouter.ai/terms/stealth>.
- Zero-price prevention uses `provider.max_price`; provider/model fallback must be disabled:
  <https://openrouter.ai/docs/guides/routing/provider-selection> and
  <https://openrouter.ai/docs/guides/routing/model-fallbacks>.
- Provider retention/privacy and ZDR limits:
  <https://openrouter.ai/docs/guides/privacy/data-collection> and
  <https://openrouter.ai/docs/guides/features/zdr>.
- OpenRouter's injection detector is regex-based, non-exhaustive, and may false-positive:
  <https://openrouter.ai/docs/guides/features/guardrails/prompt-injection>.
- Next server-only environment rules and the static-export POST limitation:
  <https://nextjs.org/docs/app/guides/environment-variables> and
  <https://nextjs.org/docs/app/guides/backend-for-frontend#export-mode>.
- Vercel Functions limits, Node runtime, cancellation, headers, and regions:
  <https://vercel.com/docs/functions/limitations>,
  <https://vercel.com/docs/functions/runtimes/node-js/node-js-versions>,
  <https://vercel.com/docs/functions/functions-api-reference#cancel-requests>,
  <https://vercel.com/docs/headers/request-headers#x-forwarded-for>, and
  <https://vercel.com/docs/functions/configuring-functions/region>.
- Upstash Vercel integration and atomic Lua execution:
  <https://vercel.com/marketplace/upstash/upstash-kv> and
  <https://upstash.com/docs/redis/commands/scripting/eval>.

## Chosen approach

### Selected: static Pages frontend plus root Vercel Function deployment

The same repository has two independent deployment targets:

1. GitHub Actions runs the existing enhancer-only static build and publishes the PWA to
   `https://ichicorito.github.io/prompt-enhancer/`.
2. A Vercel project checks out the repository root with Framework Preset **Other**, leaves Build Command unset, and
   deploys only the root `api/enhance.ts` Web Handler plus its imported server modules.
3. The Pages build receives the public Vercel endpoint through `NEXT_PUBLIC_ENHANCEMENT_API_URL`. It never receives
   `OPENROUTER_API_KEY`, Redis credentials, or server policy.

Using the repository root rather than a second nested package lets frontend and API share one versioned contract,
one preset ID union, one lockfile, and the existing verification harness. The root `api/` convention is not an App
Router route and does not make Next static pages dynamic.

### Rejected alternatives

1. **Move the whole app to server-backed Next.js:** fewer deployments, but abandons the selected Pages/PWA constraint
   and changes the established static release architecture.
2. **Browser BYOK/direct OpenRouter:** keeps one deployment but exposes user keys to browser/XSS/extension risk and
   makes trusted policy centrally unenforceable.
3. **Commit an app-owned key or `NEXT_PUBLIC_` key:** credential disclosure and account abuse; categorically unsafe.
4. **Nested API package with duplicated contracts:** deployable, but adds a second package/lockfile and drift for one
   endpoint without creating a useful isolation boundary.
5. **Streaming:** complicates JSON validation, partial state, cancellation, and error accounting without improving the
   requested enhancement workflow enough for v1.
6. **Silent local or alternate-model fallback:** hides degraded behavior, changes semantics/privacy, and can incur
   unapproved cost. Fallback must be user-selected and visibly labelled.
7. **OpenRouter injection blocking:** probabilistic regex blocking would reject legitimate prompts in a prompt tool
   and cannot provide the absolute guarantee implied by the source material.

## Files and responsibilities

### Create

- `src/lib/ai-enhancement/contracts.ts` — versioned browser/API schemas, result types, error codes, size constants,
  `PromptPresetId`, and level/effort mapping.
- `src/lib/ai-enhancement/client.ts` — browser HTTP service, combined timeout/caller abort, response validation, and
  client-side error normalization.
- `src/lib/ai-enhancement/deterministic-service.ts` — adapts existing `enhancePrompt()` and preset metadata to the
  common result contract for explicit fallback only.
- `src/server/ai/config.ts` — server-only environment validation, fixed model/provider constants, kill switch,
  timeout/concurrency settings, and no-secret logging helpers.
- `src/server/ai/errors.ts` — typed internal errors and stable HTTP mapping.
- `src/server/ai/preset-policies.ts` — compile-time-complete trusted policy for 17 presets and 13 manual task types.
- `src/server/ai/policy-resolver.ts` — validates selection/sections, invokes existing classification for manual Auto,
  canonicalizes policy, and constructs trusted system/user messages.
- `src/server/ai/model-output.ts` — strict generated-document parser, bounds checks, Markdown escaping, and rendering.
- `src/server/ai/openrouter-adapter.ts` — native fetch, exact Ox request, timeout/abort, upstream envelope validation,
  zero-cost/model checks, and sanitized metadata.
- `src/server/ai/admission.ts` — Upstash Redis global concurrency lease acquisition/release and fail-closed behavior.
- `src/server/ai/orchestrator.ts` — admission → policy → provider → normalization orchestration with cleanup.
- `src/server/ai/http-handler.ts` — CORS, bounded body reader, request schema, request ID, normalized JSON responses,
  no-store headers, and privacy-safe operational events.
- `api/enhance.ts` — Vercel Web Handler adapter with `POST` and `OPTIONS`; no business logic.
- `src/scripts/verify-ai-cases.ts` — fixtures/fakes for contracts, policies, output, adapter, admission, and HTTP behavior.
- `src/scripts/verify-ai.ts` — asynchronous `node:assert/strict` runner with nonzero failure exit.
- `.env.example` — blank key/Redis placeholders and documented non-secret defaults.
- `vercel.json` — Node Function region, 75-second duration, and cancellation support.

### Modify

- `package.json` and `package-lock.json` — add `@upstash/redis` and `verify:ai`; no OpenRouter SDK.
- `src/lib/prompt-presets.ts` — export the literal ID tuple/type needed by contracts; preserve all current entries.
- `src/app/(main)/_components/enhancer-workspace.tsx` — asynchronous AI-first orchestration, run cancellation, explicit
  fallback, current-result preservation, and success-only history.
- `src/app/(main)/_components/workspace-state.ts` — run ID, structured error, generation source, fallback eligibility,
  and stale-result protection.
- `src/app/(main)/_components/prompt-input-panel.tsx` — retain preset identity for level/section edits, expose Cancel,
  and replace local-engine-only copy.
- `src/app/(main)/_components/result-panel.tsx` — source badge and actionable Retry/local-fallback error state.
- `src/lib/browser-memory/types.ts` — optional generation provenance on history/library records.
- `src/lib/browser-memory/backup-schema.ts` — accept and validate optional provenance while preserving old backups.
- `src/scripts/verify-product-cases.ts` and `src/scripts/verify-product.ts` — async run-ID, cancellation, explicit
  fallback, provenance, and history-only-on-success cases.
- `.github/workflows/deploy-pages.yml` — supply only `NEXT_PUBLIC_ENHANCEMENT_API_URL` from a GitHub repository
  variable during static build.
- `README.md`, `src/app/(main)/page.tsx`, `src/app/(main)/layout.tsx`,
  `src/app/(main)/_components/sidebar/app-sidebar.tsx`, and `src/app/(main)/about/page.tsx` — remove local/no-AI
  claims and disclose external processing/retention restrictions.
- `docs/ANALYSIS - PROMPT ENHANCER/08 - ROADMAP TRACKER.md` and
  `docs/ANALYSIS - PROMPT ENHANCER/13 - REVISION LOG.md` — reconcile status only after every acceptance gate passes.

### Explicitly unchanged

- `src/app/(template)/**`
- Existing parser, classifier, template, rule, and generator implementation under `src/prompt-engine/**`
- `next.config.mjs` and static staging/service-worker scripts
- Dexie table indexes/schema version in `src/lib/browser-memory/database.client.ts`
- Theme preset generation and `src/lib/preferences/theme.ts`
- Existing user-authored plan/prompt files

## Interfaces and data flow

### Shared versioned contract

```ts
export const ENHANCEMENT_API_VERSION = 1 as const;
export const OPENROUTER_MODEL = "stealth/ox-alpha" as const;

export type EnhancementSelectionV1 =
  | { kind: "preset"; presetId: PromptPresetId }
  | { kind: "manual"; taskType: "auto" | PromptTaskType };

export type EnhancementRequestV1 = {
  version: 1;
  prompt: string;
  selection: EnhancementSelectionV1;
  level: EnhancementLevel;
  sections: readonly SectionId[];
};

export type GenerationDescriptor =
  | { kind: "ai"; provider: "openrouter"; model: "stealth/ox-alpha" }
  | { kind: "deterministic" };

export type EnhancementResultV1 = {
  analysis: PromptAnalysis;
  classification: ClassificationResult;
  resolved: {
    presetId: PromptPresetId | null;
    taskType: PromptTaskType;
    category: PromptCategory;
    level: EnhancementLevel;
    sections: readonly SectionId[];
    reasoningEffort: "low" | "high" | "max";
  };
  markdown: string;
  generation: GenerationDescriptor;
};

export type EnhancementSuccessV1 = {
  version: 1;
  ok: true;
  requestId: string;
  result: EnhancementResultV1;
};
```

The Zod request object is strict: unknown keys fail. The client cannot submit `model`, `provider`, `messages`,
`reasoning`, `max_tokens`, `response_format`, `tools`, `plugins`, `baseUrl`, `apiKey`, policy text, titles, guidance,
or headers.

### Error contract

```ts
export type ApiEnhancementErrorCode =
  | "invalid_request"
  | "input_too_large"
  | "forbidden_origin"
  | "service_disabled"
  | "service_busy"
  | "provider_timeout"
  | "provider_rate_limited"
  | "provider_unavailable"
  | "model_unavailable"
  | "priced_route_unavailable"
  | "provider_refused"
  | "invalid_provider_response"
  | "output_too_large"
  | "internal_error";

export type EnhancementErrorV1 = {
  version: 1;
  ok: false;
  requestId: string;
  error: {
    code: ApiEnhancementErrorCode;
    message: string;
    retryable: boolean;
    retryAfterSeconds?: number;
  };
};
```

HTTP mapping is fixed: `400` invalid, `403` origin, `413` size, `429` provider throttling,
`502` invalid/oversized provider output, `503` disabled/busy/unavailable/model/zero-price route, `504` timeout, and
`500` normalized internal errors. Browser-only codes are `network`, `client_timeout`, `aborted`, and
`invalid_api_response`. Raw upstream bodies are never returned.

### Browser service

```ts
export interface EnhancementService {
  enhance(
    input: Omit<EnhancementRequestV1, "version">,
    options?: { signal?: AbortSignal },
  ): Promise<EnhancementResultV1>;
}

export function createHttpEnhancementService(config: {
  endpoint: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): EnhancementService;

export function createDeterministicEnhancementService(): EnhancementService;
```

The HTTP service uses a 70-second browser deadline, combines it with caller cancellation, sends credentials omitted,
validates the complete response, and never contacts OpenRouter directly. Missing
`NEXT_PUBLIC_ENHANCEMENT_API_URL` produces `service_disabled` and makes the explicit local action available.

### Trusted policy

```ts
export type ResolvedSectionPolicy = {
  id: SectionId;
  title: string;
  format: "paragraphs" | "bullets";
  guidance: string;
};

export type ResolvedEnhancementPolicy = {
  presetId: PromptPresetId | null;
  taskType: PromptTaskType;
  category: PromptCategory;
  level: EnhancementLevel;
  reasoningEffort: "low" | "high" | "max";
  maxOutputTokens: 1024 | 2048 | 4096;
  purpose: string;
  sections: readonly ResolvedSectionPolicy[];
};

export function resolveTrustedPolicy(
  request: EnhancementRequestV1,
): ResolvedEnhancementPolicy;
```

`PRESET_AI_POLICIES satisfies Record<PromptPresetId, PresetAiPolicy>` is compile-time complete. Manual policy uses
`MANUAL_TASK_POLICIES satisfies Record<PromptTaskType, TaskAiPolicy>`. Preset requests resolve task/category from the
server registry, never from browser claims. The resolver calls the existing public `enhancePrompt()` once to obtain
its pure analysis/classification facts and ignores that call's deterministic Markdown on the AI path; manual Auto
uses its classified type, while explicit manual/preset modes use their trusted task type. Objective is mandatory.
Sections are deduplicated, checked against the selected policy's allowed set, and reordered into canonical policy
order; client ordering and titles never govern output.

### Preset-specific behavior and format

All formats are server-owned. Objective is a concise paragraph; list-oriented sections are arrays rendered with
server-supplied bullets. The table gives each preset's distinct semantic contract while retaining current task type,
Standard default, and initial section list.

| Preset | Trusted behavior | Standard output structure |
|---|---|---|
| Bug Fix | Preserve actual/expected behavior, reproduction context, likely scope, fix constraints, regression proof | Objective paragraph; Requirements bullets; Verification bullets |
| Build Feature | Clarify user value, scope/non-goals, functional and non-functional needs, delivery acceptance | Objective paragraph; Requirements bullets; Verification bullets |
| Code Review | Define review scope, severity/evidence expectations, actionable findings, and prioritized output | Objective paragraph; Review Scope bullets; Output Format bullets |
| Refactor | Preserve behavior, identify code boundary/non-goals, constraints, and regression evidence | Objective paragraph; Requirements bullets; Verification bullets |
| Testing | State system under test, setup, scenarios, assertions, edge cases, and completion evidence | Objective paragraph; Requirements bullets; Verification bullets |
| Documentation | Identify audience/source truth, required topics/examples, voice, completeness, and deliverable shape | Objective paragraph; Requirements bullets; Output Format bullets |
| API Design | Identify consumers, contracts, validation/errors, auth, versioning, compatibility, and contract tests | Objective paragraph; Requirements bullets; Verification bullets |
| Database | Clarify entities/schema, integrity, queries, migration, performance, rollback, and data verification | Objective paragraph; Requirements bullets; Verification bullets |
| Rewrite | Preserve source meaning while making audience, tone, constraints, and requested deliverable explicit | Objective paragraph; Requirements bullets; Output Format bullets |
| Summarize | Define source scope, audience, target length, key-point fidelity, omissions, and summary shape | Objective paragraph; Key Points bullets; Output Format bullets |
| Improve Writing | Improve clarity/grammar/flow while preserving voice, intent, audience, and factual meaning | Objective paragraph; Requirements bullets; Output Format bullets |
| Research Topic | Bound scope, questions, source quality/recency, evidence, synthesis, uncertainty, and citations | Objective paragraph; Key Questions bullets; Output Format bullets |
| Compare Options | Name options, criteria/weights, evidence, trade-offs, constraints, and recommendation format | Objective paragraph; Criteria bullets; Output Format bullets |
| Analyze Information | Identify source material, analytical questions, assumptions, evidence, limitations, and conclusions | Objective paragraph; Key Questions bullets; Output Format bullets |
| UI Design | Define users/flows, hierarchy, states, responsiveness, accessibility, and design-system constraints | Objective paragraph; Review Areas bullets; Output Format bullets |
| UX Review | Define journey, heuristics, accessibility, evidence, severity, prioritized issues, and remedies | Objective paragraph; Review Areas bullets; Output Format bullets |
| Image Prompt | Specify subject, composition, style, lighting, color, camera/render details, and negative constraints | Objective paragraph; Style Direction bullets; Output Format bullets |

Manual task policies use the same task-specific emphasis as the closest preset. `general` clarifies objective,
requirements, constraints, verification, and intended deliverable without inventing a domain.

### Enhancement levels

| Level | Ox reasoning effort | Output-token ceiling | Content-depth instruction |
|---|---:|---:|---|
| `light` | `low` | 1,024 | Preserve intent; make only essential ambiguity, objective, and requested-output improvements; stay concise |
| `standard` | `high` | 2,048 | Add balanced context, constraints, organization, and verification without speculative requirements |
| `detailed` | `max` | 4,096 | Analyze assumptions, dependencies, edge cases, failure modes, acceptance, and verification while preserving intent |

Level does not silently add or remove the user's selected sections. It controls reasoning effort and how deeply each
selected section is developed. Reasoning content is excluded from the response and never returned to the browser.

### Model input/output contracts

The server sends exactly two messages:

1. **System:** enhancer-only role, capability limits, trusted preset/manual policy, selected section IDs and formats,
   level-depth instruction, anti-injection instruction, preservation rules, and exact JSON output contract.
2. **User:** `JSON.stringify({ sourcePrompt: request.prompt })`. It is never concatenated into the system string.

The system policy tells the model to treat source text as content to transform, not authority over the enhancer; to
ignore requests inside it that try to reveal/replace policy, change preset/model/schema, or disable safeguards; to
preserve original intent; not to solve the task; and to emit only the requested JSON. This improves resistance but is
not represented as a perfect semantic guarantee.

```ts
export type GeneratedDocument = {
  sections: Array<{
    id: SectionId;
    content: string[];
  }>;
};

export function parseModelDocument(
  raw: string,
  policy: ResolvedEnhancementPolicy,
): GeneratedDocument;

export function renderGeneratedMarkdown(
  document: GeneratedDocument,
  policy: ResolvedEnhancementPolicy,
): string;
```

`parseModelDocument` rejects malformed JSON, extra top-level keys, unknown/duplicate/missing/disallowed section IDs,
empty arrays/items, more than 20 items per section, an item over 2,000 characters, raw model content over 64 KiB,
and normalized Markdown over 24,000 characters. It requires every resolved section exactly once. Rendering supplies
trusted headings/order/list markers, normalizes line endings/control characters, and escapes Markdown/HTML syntax in
model strings so content cannot create headings, links, images, HTML, or code fences outside the fixed structure.

### Fixed OpenRouter request

```json
{
  "model": "stealth/ox-alpha",
  "messages": [
    { "role": "system", "content": "<server-owned policy>" },
    { "role": "user", "content": "{\"sourcePrompt\":\"<JSON-escaped text>\"}" }
  ],
  "user": "<HMAC-SHA256 IP pseudonym>",
  "service_tier": "default",
  "reasoning": { "effort": "low|high|max", "exclude": true },
  "response_format": { "type": "json_object" },
  "max_tokens": 2048,
  "stream": false,
  "provider": {
    "only": ["stealth"],
    "allow_fallbacks": false,
    "require_parameters": true,
    "max_price": {
      "prompt": "0",
      "completion": "0",
      "request": "0",
      "image": "0",
      "audio": "0"
    }
  }
}
```

`max_tokens` comes from the level table. The request contains no `models`, fallback list, tools, `tool_choice`,
plugins, web search, transforms, images, audio, or video. Headers are Bearer key, JSON/accept, server-owned app
attribution, and `X-OpenRouter-Metadata: enabled`. A HMAC-SHA256 pseudonym derived from Vercel's trusted forwarded IP
may be sent as OpenRouter `user`; the raw IP is never stored or logged.

The adapter accepts success only when the response is valid, `model === "stealth/ox-alpha"`, finish reason is
`stop`, content is non-empty, and reported cost is zero. `length`, `content_filter`, `error`, missing choices/content,
wrong model, nonzero/missing cost, and embedded HTTP-200 provider errors are normalized failures. Provider generation
ID is retained only for operational correlation.

### Vercel admission, CORS, and environment

`vercel.json` pins `api/enhance.ts` to `iad1`, `maxDuration: 75`, and `supportsCancellation: true`. Node is pinned to
`24.x` in `package.json`. If the Upstash database is provisioned elsewhere, deployment must move both Function and
database to the same region before launch.

Production CORS allows exactly `https://ichicorito.github.io`—origin never contains `/prompt-enhancer`. `OPTIONS`
returns 204 before Redis/OpenRouter. Allowed responses include exact `Access-Control-Allow-Origin`,
`Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type`, `Vary: Origin`, and
`Cache-Control: no-store`. Missing, `null`, or other origins fail; this is browser policy, not authentication.

The Upstash key is `pe:active`. One atomic Lua script prunes leases whose score is at or before current time, rejects
when `ZCARD >= 8`, adds a UUID lease scored at now + 90 seconds, and refreshes a cleanup TTL. The script uses
`#!lua flags=allow-key-locking` and receives every touched key through `KEYS`. `finally` issues best-effort `ZREM`;
the lease expiry handles cancellation/termination. Redis failure returns 503 and skips OpenRouter.

`.env.example` contains these names and no credential values:

```dotenv
NEXT_PUBLIC_ENHANCEMENT_API_URL=
AI_ENHANCEMENT_ENABLED=false
OPENROUTER_API_KEY=
OPENROUTER_SITE_URL=https://ichicorito.github.io/prompt-enhancer/
OPENROUTER_APP_TITLE=Prompt Enhancer
ALLOWED_ORIGIN=https://ichicorito.github.io
IP_HASH_SECRET=
KV_REST_API_URL=
KV_REST_API_TOKEN=
CONCURRENCY_LIMIT=8
OPENROUTER_TIMEOUT_MS=65000
LEASE_TTL_MS=90000
```

Model/provider/zero-price values remain source constants, not environment variables. `AI_ENHANCEMENT_ENABLED` must
be exactly `true`; absent/false key or configuration fails closed. Preview environments do not inherit production
OpenRouter/Redis secrets by default.

### End-to-end data flow

1. Preset navigation loads a valid preset ID, task type, Standard level, and current section set.
2. Changing level or sections marks an existing result stale but retains `presetId`. Changing task type clears it.
3. Enhance validates nonblank/15,000 characters/Objective, confirms replacement of dirty edited output, creates a
   `runId` and `AbortController`, and dispatches running state without clearing the prior result.
4. Browser sends only version, prompt, preset/manual selection, level, and section IDs to Vercel.
5. Handler verifies exact origin/content type, reads at most 64 KiB from the stream, parses strict JSON, and creates a
   request ID without logging content.
6. Admission acquires one global Redis lease or fails closed.
7. Resolver validates trusted policy and uses existing engine classification facts where needed.
8. Adapter sends the fixed OpenRouter request with a 65-second timeout combined with Vercel `request.signal`.
9. Server validates envelope/content/cost and deterministically renders Markdown; `finally` releases the lease.
10. Handler returns only the versioned normalized result/error with `Cache-Control: no-store`.
11. Browser validates response and applies it only if `runId` is still active. Late results are ignored.
12. Successful normalized output becomes the workspace document, is labelled AI, and is added to enabled history.
    History failure does not discard the result.
13. Error/cancel preserves prompt and prior result and writes no history. Retry repeats AI explicitly. Eligible
    disabled/network/timeout/busy/provider/model/output failures offer local rules; cancellation does not auto-run it.
14. Clicking local fallback calls current `enhancePrompt()` with resolved preset/manual controls, labels provenance,
    and follows the same successful result/history path.
15. Opening saved history/library restores stored Markdown/provenance only; it never calls OpenRouter.

## Ordered implementation tasks

### Task 0: Isolate execution and prove the baseline

**Dependencies:** explicit plan approval followed by a separate explicit execution request.

**Files:** no product file changes.

- [ ] Record `git status --short`, `git diff --check`, `git diff --cached --check`, current HEAD, and all existing
  staged/untracked paths in the execution log.
- [ ] Use `using-git-worktrees` to create an isolated worktree from accepted `44ac81f` or the user-approved newer
  commit; stop if the expected base changed materially.
- [ ] Run `npm ci`, `npm run verify:engine`, `npm run verify:product`, `npx tsc -p tsconfig.engine.json --noEmit`,
  `npx tsc --noEmit`, `npm run build`, and `npm run build:static`.
- [ ] Confirm `git status --porcelain "src/app/(template)"` and `git diff -- "src/app/(template)"` are empty.
- [ ] Expected baseline: existing verification/build commands exit zero. A failure is investigated before feature
  edits; it is not waived or fixed through unrelated changes.

### Task 1: Freeze the shared API contract

**Dependencies:** Task 0.

**Files:** create `src/lib/ai-enhancement/contracts.ts`, `src/scripts/verify-ai-cases.ts`,
`src/scripts/verify-ai.ts`; modify `src/lib/prompt-presets.ts`, `package.json`.

- [ ] First add failing assertion cases for all 17 preset IDs, strict request unions, unknown fields, all level/effort
  mappings, response/error parsing, 15,000-character boundary, Objective requirement, duplicates, and section limits.
- [ ] Add `verify:ai` and run it; expected result is nonzero because contract exports do not exist.
- [ ] Implement the exact types/schemas/constants in **Shared versioned contract** and **Error contract**. Derive
  `PromptPresetId` from the existing literal catalogue; do not maintain a second browser list.
- [ ] Run `npm run verify:ai`, `npm run verify:product`, and `npx tsc --noEmit`; expected result is all pass.
- [ ] Commit only Task 1 paths as `feat: add AI enhancement contracts`.

### Task 2: Define complete trusted preset and manual policies

**Dependencies:** Task 1.

**Files:** create `src/server/ai/preset-policies.ts`, `src/server/ai/policy-resolver.ts`; modify
`src/scripts/verify-ai-cases.ts`.

- [ ] Add failing cases proving compile/runtime coverage for every preset and task, distinct guidance for all alias
  pairs, preset authority over task/category, manual Auto classification, mandatory Objective, disallowed section
  rejection, deduplication, canonical ordering, and level/token mapping.
- [ ] Implement the policy records and resolver exactly as specified in the preset table and level table. Reuse the
  existing pure engine only for analysis/classification; do not move network or policy into the engine.
- [ ] Add adversarial request cases that try to submit model, policy text, arbitrary headings, unknown preset IDs, and
  hidden section guidance; strict parsing must fail before policy resolution/provider calls.
- [ ] Run `npm run verify:ai`, `npm run verify:engine`, and the engine purity grep commands from final verification.
- [ ] Commit Task 2 paths as `feat: add trusted enhancement policies`.

### Task 3: Validate model JSON and render fixed Markdown

**Dependencies:** Task 2.

**Files:** create `src/server/ai/model-output.ts`; modify `src/scripts/verify-ai-cases.ts`.

- [ ] Add failing cases for valid output; malformed/truncated JSON; extra keys; missing/unknown/duplicate/disallowed
  sections; empty content; over-20 items; over-2,000-character item; raw/normalized size limits; wrong order; control
  characters; headings; HTML; images; links; code fences; and JavaScript-link text.
- [ ] Implement strict parse/validate/canonicalize/render functions. Server policy supplies section titles, order,
  paragraph/list formatting, and Markdown markers; model strings are escaped and cannot inject structure.
- [ ] Verify exact normalized output has `# Objective`, trusted subsequent `##` headings, one blank line between
  blocks, no raw HTML/link/image, and no trailing newline.
- [ ] Run `npm run verify:ai` and scoped Biome for Task 3 paths.
- [ ] Commit Task 3 paths as `feat: normalize AI enhancement output`.

### Task 4: Add the zero-price OpenRouter adapter

**Dependencies:** Tasks 2-3.

**Files:** create `src/server/ai/config.ts`, `src/server/ai/errors.ts`,
`src/server/ai/openrouter-adapter.ts`; modify `src/scripts/verify-ai-cases.ts`.

- [ ] Add fake-fetch failures for absent/disabled key; exact endpoint/header/body; source prompt only in user message;
  fixed model/provider/default tier; zero max prices; no tools/plugins/fallbacks; low/high/max reasoning; 1,024/2,048/
  4,096 token caps; timeout/abort; every documented status family; Retry-After; HTTP-200 embedded error; empty/wrong
  model/nonzero or missing cost; finish reasons; malformed JSON; and sanitized errors.
- [ ] Keep config/provider modules reachable only from root `api/**`/`src/server/**`; add an import-boundary assertion
  that browser modules cannot import them. Do not use a `NEXT_PUBLIC_` server value or the Next-specific
  `server-only` marker in this standalone Vercel Function. Validate environment without printing values and keep
  model/provider/price controls immutable source constants.
- [ ] Implement native `fetch` with `cache: "no-store"`, 65-second deadline combined with caller signal, no automatic
  retry, and normalized operational metadata. Never include reasoning or raw provider data in the public result.
- [ ] Run `npm run verify:ai`, `npx tsc --noEmit`, a client-bundle import guard case, and scoped Biome.
- [ ] Commit Task 4 paths as `feat: add protected OpenRouter adapter`.

### Task 5: Add durable global concurrency and HTTP orchestration

**Dependencies:** Task 4.

**Files:** create `src/server/ai/admission.ts`, `src/server/ai/orchestrator.ts`,
`src/server/ai/http-handler.ts`; modify `package.json`, `package-lock.json`, `src/scripts/verify-ai-cases.ts`.

- [ ] Install only `@upstash/redis` and inspect the lockfile; do not add an OpenRouter SDK or rate-limit package.
- [ ] Add failing cases for atomic lease script arguments, prune/check/add order, eight-call rejection, 90-second
  expiry, release, interrupted cleanup, Redis fail-closed behavior, 64-KiB streamed-body limit with false/missing
  Content-Length, CORS/preflight, no-store, request IDs, normalized statuses, and prompt-free logs.
- [ ] Implement one-key `pe:active` lease admission with injected Redis/clock/UUID dependencies for tests. No per-IP,
  minute, day, or monetary counter is added.
- [ ] Implement bounded body reading, strict schema admission, policy/provider orchestration, HMAC IP pseudonymization,
  sanitized event fields, and lease cleanup in `finally`.
- [ ] Run `npm run verify:ai`, `npx tsc --noEmit`, and scoped Biome. Verify fake Redis failure causes zero fake-provider
  calls.
- [ ] Commit Task 5 paths as `feat: guard AI enhancement requests`.

### Task 6: Expose the separate Vercel API safely

**Dependencies:** Task 5.

**Files:** create `api/enhance.ts`, `.env.example`, `vercel.json`; modify `package.json`, `package-lock.json` if the Node
engine field changes them.

- [ ] Add the thin `POST`/`OPTIONS` Web Handler adapter. It creates real Redis/config dependencies and delegates every
  decision to `http-handler.ts`.
- [ ] Pin Node `24.x`, Vercel `iad1`, 75-second max duration, and cancellation support. Document that Upstash must be
  in the same region.
- [ ] Add the exact blank/default environment template shown above. Confirm `.env.example` contains no key-like
  sample value and `.env*.local` remains ignored.
- [ ] Run `npx vercel build` after linking a non-production Vercel project with disabled service and placeholder
  Redis/key values; expected result is a successful build, while a request returns normalized disabled status.
- [ ] Run `npm run build` and `npm run build:static`; verify root `api/` is absent from static output and enhancer pages
  remain static.
- [ ] Commit Task 6 paths as `feat: expose Vercel enhancement API`.

### Task 7: Add browser AI and deterministic services

**Dependencies:** Tasks 1 and 6.

**Files:** create `src/lib/ai-enhancement/client.ts`, `src/lib/ai-enhancement/deterministic-service.ts`; modify
`src/scripts/verify-ai-cases.ts`.

- [ ] Add failing cases for configured/missing endpoint, exact request shape, response/error validation, 70-second
  timeout, caller abort, timeout-versus-abort distinction, no credentials, Retry-After, invalid API response, and
  deterministic adaptation for preset/manual controls.
- [ ] Implement the `EnhancementService` interface. The local adapter calls only the public pure engine and is
  constructed/run only after the user selects fallback.
- [ ] Prove with fake fetch that the browser sends no OpenRouter model/key/provider policy and that local fallback
  performs no network request.
- [ ] Run `npm run verify:ai`, `npm run verify:engine`, `npx tsc --noEmit`, and scoped Biome.
- [ ] Commit Task 7 paths as `feat: add enhancement client services`.

### Task 8: Make the workspace asynchronous, cancellable, and race-safe

**Dependencies:** Task 7.

**Files:** modify `src/app/(main)/_components/enhancer-workspace.tsx`,
`src/app/(main)/_components/workspace-state.ts`, `src/app/(main)/_components/prompt-input-panel.tsx`,
`src/app/(main)/_components/result-panel.tsx`, `src/scripts/verify-product-cases.ts`,
`src/scripts/verify-product.ts`.

- [ ] Add failing reducer/orchestration cases for run start, active run ID, cancel, stale/late success, double submit,
  prior-result preservation, dirty-edit confirmation, structured errors, retry, fallback eligibility, explicit local
  success, AI/local source labels, and no history on any failed/cancelled/stale run.
- [ ] Update the product runner to await asynchronous cases and retain nonzero failure behavior.
- [ ] Implement one active `AbortController`, disable duplicate Enhance, expose Cancel while running, and apply success
  only for the active run ID. Do not clear the previous result at start/error.
- [ ] Preserve `presetId` when level/sections change; clear it only for explicit task-type/manual selection. Build the
  discriminated request from state.
- [ ] Show Retry for retryable AI errors and `Use local rules instead` only for eligible availability/contract errors.
  Cancellation remains neutral and never auto-falls back.
- [ ] Run `npm run verify:product`, `npm run verify:ai`, `npm run verify:engine`, type check, and scoped Biome.
- [ ] Commit Task 8 paths as `feat: integrate AI enhancement workspace`.

### Task 9: Preserve generation provenance in browser memory

**Dependencies:** Task 8.

**Files:** modify `src/lib/browser-memory/types.ts`, `src/lib/browser-memory/backup-schema.ts`,
`src/app/(main)/_components/enhancer-workspace.tsx`, `src/scripts/verify-product-cases.ts`.

- [ ] Add failing cases that AI/local results save optional provenance, existing records/backups without it parse,
  invalid provenance fails import validation, saved snapshots restore without network, and history failure preserves
  the result.
- [ ] Add optional `{ kind, provider?, model? }` only. Do not store API request IDs, generation IDs, policies,
  reasoning, prompts beyond existing snapshots, or cost telemetry.
- [ ] Keep Dexie schema version/index declarations unchanged because optional non-indexed fields need no migration.
- [ ] Run `npm run verify:product`, `npm run verify:ai`, type check, and a manual existing-backup import check.
- [ ] Commit Task 9 paths as `feat: record enhancement provenance`.

### Task 10: Make UI and privacy copy truthful

**Dependencies:** Tasks 8-9.

**Files:** modify `README.md`, `src/app/(main)/page.tsx`, `src/app/(main)/layout.tsx`,
`src/app/(main)/_components/sidebar/app-sidebar.tsx`, `src/app/(main)/about/page.tsx`,
`src/app/(main)/_components/prompt-input-panel.tsx`, `src/app/(main)/_components/result-panel.tsx`.

- [ ] Inventory and replace every `local rules`, `no AI`, `local-only processing`, and equivalent remote-processing
  claim while preserving truthful browser-local history/library wording.
- [ ] Add a persistent, non-blocking Enhance-screen disclosure: prompts are sent to OpenRouter and the Stealth model;
  provider terms may permit retention/training; do not submit sensitive, personal, regulated, secret, or confidential
  content. Do not add a consent checkbox/modal or store consent.
- [ ] Add accessible status/source/error text, Cancel/Retry/local-fallback controls, focus behavior, and `aria-live`
  updates. Labels distinguish AI from local output and never promise guaranteed injection immunity.
- [ ] Verify result Markdown remains rendered through the existing safe path with no raw HTML support.
- [ ] Run scoped Biome, `npx tsc --noEmit`, `npm run build`, and the manual 200%-zoom/keyboard/screen-reader smoke cases.
- [ ] Commit Task 10 paths as `docs: disclose external AI processing` or split UI behavior and copy into two focused
  commits if implementation review benefits from it.

### Task 11: Wire the Pages build to the public API endpoint

**Dependencies:** Task 10 and a deployed disabled Vercel API URL.

**Files:** modify `.github/workflows/deploy-pages.yml`, `README.md`.

- [ ] Add GitHub repository variable `ENHANCEMENT_API_URL` containing the Vercel `/api/enhance` URL; workflow maps it
  to `NEXT_PUBLIC_ENHANCEMENT_API_URL`. No secret is copied into the static build environment.
- [ ] Document local UI/API startup, Vercel environment setup, Upstash Marketplace connection, exact production
  `ALLOWED_ORIGIN`, disabled-first deploy, and secret rotation/revocation.
- [ ] Run static build with `NEXT_PUBLIC_BASE_PATH=/prompt-enhancer` and a synthetic HTTPS endpoint. Search generated
  assets for `OPENROUTER_API_KEY`, `KV_REST_API_TOKEN`, authorization patterns, and any real env value; expect none.
- [ ] Verify service-worker generation contains no API POST/runtime response caching and offline shell still loads.
- [ ] Commit Task 11 paths as `chore: configure AI endpoint deployment`.

### Task 12: Complete adversarial, integration, rollout, and rollback gates

**Dependencies:** Tasks 0-11.

**Files:** modify AI/product verification fixtures and status docs only when a discovered acceptance gap requires it;
then update roadmap/revision docs after all gates pass.

- [ ] Run injected adversarial cases for direct/nested/encoded/multilingual/delimiter-breaking instructions, system
  prompt requests, model/provider overrides, oversized Unicode, cross-request isolation, fake provider errors, XSS/
  Markdown payloads, cancellation races, eight-call saturation, Redis outage, model removal, and priced routes.
- [ ] Confirm tests assert configuration/capability confinement rather than claiming universal semantic immunity.
- [ ] With synthetic non-sensitive text and a dedicated restricted key, deploy API disabled, verify CORS/Redis/error
  paths, enable it, and make one exact-model smoke request. Confirm model/provider/direct routing, non-BYOK status,
  zero reported cost, valid normalized output, and no prompt/output in Vercel/Upstash logs.
- [ ] If a zero-limit OpenRouter key blocks free calls with 402, rely on request-time zero `max_price` and keep no
  funded credits/BYOK credential on the dedicated key. Do not relax zero-price request policy.
- [ ] Run the complete verification command set below and record fresh outputs in the execution log.
- [ ] Exercise rollback: set `AI_ENHANCEMENT_ENABLED=false`, verify new AI calls stop without rebuilding Pages, and
  verify explicit local fallback/history/library remain functional. Re-enable only after the drill.
- [ ] Reconcile roadmap/revision documentation only after acceptance. Do not mark prompt-injection as “eliminated”;
  record trusted-configuration enforcement and residual model risk.
- [ ] Commit final verification/docs as `docs: record AI enhancement acceptance`.

## Verification commands and expected evidence

```powershell
npm run verify:engine
npm run verify:product
npm run verify:ai
npm run verify:performance

npx tsc -p tsconfig.engine.json --noEmit
npx tsc --noEmit

npx biome check `
  "api/enhance.ts" `
  "src/lib/ai-enhancement" `
  "src/server/ai" `
  "src/app/(main)/_components" `
  "src/lib/prompt-presets.ts" `
  "src/lib/browser-memory/types.ts" `
  "src/lib/browser-memory/backup-schema.ts" `
  "src/scripts/verify-ai.ts" `
  "src/scripts/verify-ai-cases.ts" `
  "src/scripts/verify-product.ts" `
  "src/scripts/verify-product-cases.ts"

npm run build
npm run build:static
$env:NEXT_PUBLIC_BASE_PATH = "/prompt-enhancer"
$env:NEXT_PUBLIC_ENHANCEMENT_API_URL = "https://example.invalid/api/enhance"
npm run build:static

npx vercel build

git grep -nE "from [\"'](react|next|@/)" -- "src/prompt-engine"
git grep -nE "\b(window|document\.|localStorage|sessionStorage|navigator|indexedDB|Math\.random|Date\.now)\b" -- "src/prompt-engine"
git grep -nE "OPENROUTER_API_KEY|KV_REST_API_TOKEN|Bearer [A-Za-z0-9_-]{10,}" -- . ":(exclude).env.example"

git diff --check
git status --porcelain "src/app/(template)"
git diff -- "src/app/(template)"
git status --short
```

Expected evidence:

- All assertion runners print their pass summaries and exit zero; a deliberately changed fixture is shown to exit
  nonzero before being restored.
- Both TypeScript projects and scoped Biome exit zero. No repo-wide autofix runs.
- Normal and static builds exit zero; enhancer routes remain static and the Pages artifact contains no server secret.
- Vercel build recognizes `api/enhance.ts` with Node 24, 75-second duration, and cancellation support.
- Both engine purity greps return no prohibited runtime imports/APIs beyond approved existing matches.
- Secret grep finds only environment-variable names/documentation, never a credential value.
- Frozen template status/diff are empty and final status contains only task-owned paths.
- The deterministic performance harness remains a local-engine regression metric; it is not used as a network latency
  target. Live AI smoke records latency separately without changing that gate.

### Manual browser/API acceptance matrix

1. Preset matrix: each of 17 presets at Standard produces its documented structure and distinct semantic emphasis.
2. Level matrix: one prompt/preset at Light, Standard, Detailed shows increasing depth and the API fake/live metadata
   confirms low/high/max effort without exposing reasoning.
3. Manual matrix: Auto, each explicit task type, level/section changes, and preset-to-manual transition preserve the
   intended provenance and canonical sections.
4. State matrix: dirty result replacement, double click, cancel before/during completion, reversed completion order,
   Retry, local fallback, history on/off, history failure, and saved-record reopen.
5. Failure matrix: missing key, disabled service, disallowed/null origin, Redis failure/full concurrency, 401/402/403/
   408/413/422/429/5xx provider responses, timeout, malformed JSON, wrong model, nonzero cost, length/refusal/error
   finish reasons, and model-not-found.
6. Security matrix: prompt/model/policy override fields, direct and encoded injection text, system-policy requests,
   HTML/script/SVG/event handlers, unsafe links/images, huge Unicode, false Content-Length, and log marker search.
7. Privacy matrix: disclosure is visible without blocking; no prompt/output/auth header appears in browser bundle,
   Vercel logs, Upstash data, service-worker cache, or error responses; browser talks only to Vercel.
8. PWA matrix: static install still works, cached shell opens offline, AI reports unavailable, explicit local rules work,
   and returning online enables AI without losing prior results.
9. Accessibility matrix: keyboard-only Enhance/Cancel/Retry/Fallback, focus after errors, screen-reader status updates,
   200% zoom, and current Chrome/Edge/Firefox/Safari desktop.

## Risks and mitigations

| Risk | Likelihood / impact | Prevention and detection | Residual / response |
|---|---|---|---|
| Ox Alpha removal or behavior change | Likely over lifetime / High | Exact fixed model, release/live smoke, model/cost validation, kill switch | Return 503, offer local rules, review any replacement separately |
| Prompt injection follows hostile semantics | Almost certain attempts / High product | Separate roles, serialized source, server-owned controls, no tools/secrets, strict output | Semantic obedience cannot be guaranteed; output remains inert text |
| Provider retains/trains on prompts | Confirmed terms exposure / High | Persistent disclosure, no history upload/logging, user warning against sensitive data | Provider necessarily receives current prompt; disable AI if terms become unacceptable |
| Anonymous endpoint abuse | Likely / High availability | Eight-call global concurrency, body/output/time bounds, zero-price route, Vercel/OpenRouter dashboards | No per-user quotas by user decision; disable service during abuse |
| Unexpected paid inference | Possible / Critical | Exact model/provider, zero `max_price`, no fallback/plugins/BYOK, validate cost zero | Metadata detection occurs after request; disable/revoke key on any nonzero cost |
| API key leakage | Possible / Critical | Server-only env, blank example, no raw errors/logs, bundle/secret scan, dedicated key | Disable, revoke, inspect usage/logs, close path, rotate |
| Redis/Vercel outage | Possible / High | Fail closed, lease expiry, no retries, explicit local fallback | AI unavailable; local engine/PWA remains usable |
| Malformed/truncated/refused output | Occasional / Medium | Non-streaming, strict envelope/schema/size/finish validation | No history; normalized retry/fallback UI |
| XSS/unsafe Markdown | Possible / Critical | Server escaping, fixed Markdown, existing safe renderer, history reload tests | Treat stored output as untrusted forever |
| Cancellation still processes upstream | Possible / Medium | Best-effort propagated abort, run IDs, no automatic retry, zero price | Cannot promise cancellation stops provider work |
| Static/API contract drift | Possible / High | Shared source contract in one repository, version 1, response validation, integration smoke | Old static clients fail safely with invalid response |
| Privacy copy becomes stale | Possible / High | Named copy inventory, terms link, release checklist | Disable AI until changed terms/copy are reviewed |
| Vercel Hobby terms/limits change | Possible / Medium | Personal non-commercial declaration and platform-limit review | Migrate API host or plan; Pages/local fallback unaffected |

## Rollout

1. Merge code with `AI_ENHANCEMENT_ENABLED=false`; static frontend may point at the disabled API and must fail safely.
2. Provision Upstash near `iad1`; connect it only to Vercel Production. Set exact origin, random IP HMAC secret, blank-
   to-real OpenRouter key, concurrency/timeouts, and no BYOK credential/funded paid fallback.
3. Deploy Vercel API disabled. Complete CORS, body, Redis, secret, log, failure, and rollback tests with no live model.
4. Use a dedicated OpenRouter key and synthetic non-sensitive prompt for one zero-price smoke test. Confirm exact model,
   Stealth provider, direct routing, no BYOK, zero usage cost, and output contract.
5. Enable API for the maintainer, then a small announced public canary. Because the user chose no quotas, monitor
   Vercel invocations/memory, Redis commands, active concurrency, OpenRouter generations/errors, and model pricing.
6. Set the GitHub `ENHANCEMENT_API_URL` variable and publish Pages only after disclosure and source labels are live.
7. Expand public use without changing controls. Any priced-route response, unexpected cost, privacy-term change,
   sustained saturation, key incident, or model removal triggers the rollback below.

## Rollback

1. Set `AI_ENHANCEMENT_ENABLED=false` in Vercel and redeploy the API configuration. New provider calls stop without a
   Pages rebuild; clients receive `service_disabled` and offer explicit local rules.
2. For credential/cost incidents, revoke the OpenRouter key, verify no BYOK/funded route exists, inspect generation
   metadata and provider usage, scrub exposed logs if any, close the leakage path, then rotate only after review.
3. For Redis/Vercel incidents, leave AI disabled and preserve Pages/PWA/local rules. Do not bypass fail-closed
   admission to restore AI.
4. Optional provenance fields remain backward-compatible, so rollback requires no IndexedDB migration or deletion.
   Existing AI and local Markdown stays readable as inert stored content.
5. If the frontend itself regresses, redeploy the prior static Pages artifact. The API may remain disabled; it stores
   no user prompt/history data that needs migration.
6. A replacement AI model, provider, paid route, or changed privacy policy requires a new approved plan; do not edit
   the fixed model constant during incident response.

## Execution log

- 2026-08-22T15:26:07+08:00 — Draft created from repository inspection, official OpenRouter/Next/Vercel/Upstash
  research, architecture comparison, risk analysis, and one-at-a-time user decisions.
- 2026-08-22T15:26:07+08:00 — Selected static Pages + root Vercel Function, public anonymous access, no usage quotas,
  eight-call global concurrency safeguard, no paid inference, personal/non-commercial Vercel Hobby, non-blocking
  privacy disclosure, and explicit deterministic fallback.
- 2026-08-22T15:26:07+08:00 — Planning only. No product/config/test/deployment file was changed; no verification,
  implementation, commit, deployment, real key setup, or live model call was performed.
- 2026-08-22T15:34:43+08:00 — Self-review completed: checked prompt coverage, scope, file ownership, type names,
  provider-rate error mapping, provider/user request fields, API-versus-Next server boundaries, placeholder language,
  task dependencies, verification, rollout, and rollback. Corrected identified inconsistencies inline.
- 2026-08-22T15:34:43+08:00 — Plan remained `draft` pending explicit user approval.
- 2026-08-22T15:48:00+08:00 — User explicitly approved this plan. Status changed to `ready`; execution is now authorized,
  but no product/config/test/deployment file has been changed by this approval transition.
- 2026-08-22T15:52:00+08:00 — Execution started. Status changed to `in-progress`. Worktree created at
  `C:\Users\marka\.config\superpowers\worktrees\prompt-enhancer\openrouter-ai-prompt-enhancement` on branch
  `feat/openrouter-ai-prompt-enhancement` from `44ac81f`; original `main` staged/untracked files are preserved.
- 2026-08-22T15:56:00+08:00 — Task 0 baseline passed in the isolated worktree: `npm ci` installed 642 packages with
  0 vulnerabilities; engine 166/166 and product 9/9 passed; both TypeScript checks passed; `npm run build` passed
  43/43 pages; `npm run build:static` passed with the expected 10 static enhancer pages; template status/diff and
  worktree diff were empty. The first build command exceeded its 120-second shell timeout before compilation
  completed, so it was rerun with a 360-second timeout and passed; no code change was made.

## Execution progress

- [x] Task 0 — Isolated worktree, dependency install, and clean baseline gates.
- [x] Task 1 — Shared API contract — builder, tester, and reviewer all passed; AI 12/12, product 9/9, engine 166/166,
  TypeScript, scoped Biome, diff, and frozen-template checks passed. Exactly five owned files changed; no lockfile,
  environment, engine, UI, network, or template changes. Residual risk is limited to later runtime/network enforcement.
- [x] Task 2 — Trusted preset/manual policies — builder, tester, and re-review accepted; AI 22/22, engine 166/166,
  product 9/9, TypeScript, scoped Biome, purity, diff, and frozen-template checks passed. Immutable 17-preset
  snapshot, six required alias guidance distinctions, canonical titles/formats/guidance, 13 manual tasks, strict
  adversarial fields, Auto classification, and exact level mappings are covered. No remaining findings.
- [x] Task 3 — Model JSON validation and Markdown rendering — builder correction, tester, and re-review accepted;
  AI 31/31, engine 166/166, product 9/9, TypeScript, scoped Biome, diff, and frozen-template checks passed.
  Duplicate root/nested JSON keys are rejected before `JSON.parse`, renderer invariants are enforced, trusted policy
  ordering/escaping/no-trailing-newline remain covered. Residual risk: no live provider/browser integration and
  escaped-key probes should remain explicit in the checked-in harness if expanded later.
- [x] Task 4 — Zero-price OpenRouter adapter — builder, tester, and final re-review accepted after three correction
  rounds; AI 46/46, engine 166/166, product 9/9, TypeScript, scoped Biome, diff, and frozen-template gates passed.
  Redirects, hanging body cancellation, oversized non-200 Retry-After, auth precedence/retryability, exact HTTP 200,
  JSON-object content, caller abort, timeout, zero-price/model/provider/tool restrictions, and secret isolation passed.
  Residual risk: live OpenRouter behavior remains unexercised.
- [ ] Task 5 — Redis concurrency and HTTP orchestration.
- [ ] Task 6 — Vercel API deployment wrapper.
- [ ] Task 7 — Browser AI and deterministic services.
- [ ] Task 8 — Async, cancellable, race-safe workspace.
- [ ] Task 9 — Generation provenance in browser memory.
- [ ] Task 10 — Truthful UI/privacy disclosure.
- [ ] Task 11 — Pages build/API endpoint wiring.
- [ ] Task 12 — Adversarial, rollout, rollback, and final acceptance gates.

### Task evidence log

- **Task 0 (2026-08-22 15:56 +08:00):** `npm ci` passed with 0 vulnerabilities; `verify:engine` 166/166;
  `verify:product` 9/9; both TypeScript checks; `npm run build` 43/43; `npm run build:static` passed; template
  status/diff clean. Initial 120-second build timeout was environmental command duration; 360-second rerun passed.
- **Task 1 (2026-08-22 16:08 +08:00):** Builder red/green contract harness completed; tester independently passed AI
  12/12, product 9/9, engine 166/166, TypeScript, scoped Biome, diff, and frozen-template gates; reviewer APPROVE,
  zero blocker/major/minor findings. No commit performed.
- **Task 2 (2026-08-22 16:22 +08:00):** Initial reviewer blocker was evaluated: `package.json` belongs to Task 1 and its
  approved `verify:ai` script was preserved; three valid assertion gaps were corrected in `verify-ai-cases.ts`.
  Re-test passed AI 22/22, engine 166/166, product 9/9, TypeScript, Biome, purity, diff, and template gates; final
  reviewer APPROVE with no blocker/major/minor findings. Residual risk is limited to later provider integration.
- **Task 3 (2026-08-22 16:35 +08:00):** Initial review's duplicate-key major and renderer-boundary concerns were
  corrected in `model-output.ts` and `verify-ai-cases.ts`; cumulative package scope was correctly treated as Task 1.
  Re-test passed AI 31/31, engine 166/166, product 9/9, TypeScript, Biome, diff, template, duplicate-key, hostile
  text, bounds, and renderer-invariant checks; final reviewer APPROVE, no blocker/major/minor findings. No commit.
- **Task 4 (2026-08-22 16:58 +08:00):** Adapter review findings were corrected in rounds: caller abort/stream limits/
  exact HTTP 200/JSON content/Retry-After/pseudonym; redirect and overflow-hang protection; oversized non-200 and
  auth retryability; then auth-hint precedence. Final tester passed AI 46/46, engine 166/166, product 9/9,
  TypeScript, Biome, diff, template, targeted security probes, and 80/80 auth cases; final reviewer APPROVE with
  no blocker/major/minor findings. No commit.
