# Prompt Enhancer

Prompt Enhancer turns rough instructions into structured Markdown prompts with a deterministic rule engine that runs in
your browser. An optional AI enhancement path is also supported when a public enhancement API is configured.

## Privacy and data handling

- The built-in rule engine runs locally in your browser.
- History, the prompt library, and settings are stored locally in this browser. They are not encrypted or synced.
- Predictive text checks exact and contextual continuations from local history first. History remains in IndexedDB and
  is never included in predictive API requests.
- Only when no relevant history match exists does the configured AI infer the current draft's overall goal and purpose
  to suggest an appendable continuation. The current draft may be sent to the configured enhancement API for optional
  AI prediction. Predictive AI is unavailable when `NEXT_PUBLIC_ENHANCEMENT_API_URL` is blank.
- AI enhancement is different: the prompt and resulting completion leave your browser and are sent to the configured
  enhancement API, which forwards them directly to DeepSeek using the `deepseek-v4-flash` model. Do not use sensitive
  or confidential drafts with online AI features; review DeepSeek's current privacy and retention terms before sending data.
- The DeepSeek credential is a server-only `DEEPSEEK_API_KEY`; it must never be put in a `NEXT_PUBLIC_*` variable or
  shipped to the browser. Provider processing and retention policies apply to prompts and completions sent upstream.
- The AI pipeline treats prompt text as untrusted and applies bounded safeguards, but no prompt-injection defense is
  universal. Do not rely on Prompt Enhancer to prevent prompt injection.

Browser-local storage is still subject to access by the browser profile and device. Export a backup before clearing site
data or changing origins.

## Local development

```bash
npm install
npm run dev
```

## AI enhancement API configuration

The browser calls the configured enhancement API; it never receives the DeepSeek credential. On the server, set
`AI_ENHANCEMENT_ENABLED=true` and provide the server-only `DEEPSEEK_API_KEY`. The API uses DeepSeek's
`deepseek-v4-flash` model. `DEEPSEEK_TIMEOUT_MS` controls the direct upstream timeout in milliseconds and defaults to
65,000 when omitted or invalid. Never commit credentials or expose them through `NEXT_PUBLIC_*` variables.

Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for shared or production deployments so the global
concurrency admission control works across server instances. For local development, `AI_ADMISSION_OPEN=true` bypasses
that shared lease. If the DeepSeek key is missing or blank (or AI is not enabled exactly as above), enhancement requests
return a non-retryable `503` service-disabled response; browser-local rule-engine features remain available.

Targeted checks:

```bash
npm run verify:engine
npm run verify:product
npm run verify:ai
npm run verify:predictive-text
npm run verify:performance
npx tsc --noEmit
```

The reference dashboard under `/template/**` is intentionally frozen and is included only in the normal development
build. Do not edit or import from `src/app/(template)/`.

## Static/PWA build

```bash
npm run build:static
```

The command creates an enhancer-only static artifact in `out/`, including the install manifest and offline service
worker. For the GitHub Pages project site, build with `NEXT_PUBLIC_BASE_PATH=/prompt-enhancer`. The first online visit
must complete before offline use; browser-local data remains origin-bound.

The Pages workflow passes the public `NEXT_PUBLIC_ENHANCEMENT_API_URL` from the repository variable
`ENHANCEMENT_API_URL`. It must not receive `DEEPSEEK_API_KEY` or any other server secret; provider credentials belong
on the enhancement API service.

The planned public URL is <https://ichicorito.github.io/prompt-enhancer/> after the repository owner enables GitHub Pages
with the included Actions workflow.
