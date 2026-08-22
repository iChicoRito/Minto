# Prompt Enhancer

Prompt Enhancer turns rough instructions into structured Markdown prompts using a deterministic, local rule engine.

## Privacy

- No account, AI service, or prompt API is required.
- Prompt processing, history, library, and settings stay in the browser.
- Browser data is not encrypted or synced. Export a backup before clearing site data or changing origins.

## Local development

```bash
npm install
npm run dev
```

Targeted checks:

```bash
npm run verify:engine
npm run verify:product
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

The planned public URL is <https://ichicorito.github.io/prompt-enhancer/> after the repository owner enables GitHub Pages
with the included Actions workflow.
