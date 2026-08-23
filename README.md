# Prompt Enhancer

Prompt Enhancer turns rough instructions into structured Markdown prompts with a deterministic rule engine that runs in
your browser. An optional AI enhancement path is also supported when a public enhancement API is configured.

## Privacy and data handling

- The built-in rule engine runs locally in your browser.
- History, the prompt library, and settings are stored locally in this browser. They are not encrypted or synced.
- AI enhancement is different: the prompt and resulting completion leave your browser and are sent to the configured
  enhancement API, which forwards them to OpenRouter and the Ox Alpha model operated by Stealth, an anonymous
  third-party operator.
- OpenRouter retains prompts and completions. The Ox Alpha page says that data is not used for training, but Stealth's
  terms permit use for training, evaluation, and improvement. Treat sensitive or confidential information as prohibited.
- The AI pipeline treats prompt text as untrusted and applies bounded safeguards, but no prompt-injection defense is
  universal. Do not rely on Prompt Enhancer to prevent prompt injection.

Browser-local storage is still subject to access by the browser profile and device. Export a backup before clearing site
data or changing origins.

## Local development

```bash
npm install
npm run dev
```

Targeted checks:

```bash
npm run verify:engine
npm run verify:product
npm run verify:ai
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
`ENHANCEMENT_API_URL`. It must not receive `OPENROUTER_API_KEY` or any other server secret; provider credentials belong
on the enhancement API service.

The planned public URL is <https://ichicorito.github.io/prompt-enhancer/> after the repository owner enables GitHub Pages
with the included Actions workflow.
