# 10 - WORD LIST

[[00 - START HERE|Back to start]] · Previous: [[09 - TASK TRACKER]]

Words that could not be avoided, because they are real names of real things. Each one explained as it is used here.

| Word | What it means here | Where it comes up |
|---|---|---|
| `Next.js` | The ready-made skeleton the whole app is built on — it supplies the pages, their addresses, and the plumbing between them | [[05 - SYSTEM ARCHITECTURE]], [[07 - DEVELOPMENT ROADMAP]] |
| `TypeScript` | A way of writing the program so every piece of information carries a promise about what kind of thing it is, and the tools check those promises before anything runs | [[07 - DEVELOPMENT ROADMAP]], [[09 - TASK TRACKER]] |
| `Tailwind CSS` | A ready-made kit of styling shorthand used to make the screens look right | [[07 - DEVELOPMENT ROADMAP]] |
| `shadcn/ui` | A library of pre-built screen pieces — buttons, boxes, tabs — that the app copies in and adjusts rather than installing whole | [[07 - DEVELOPMENT ROADMAP]], [[09 - TASK TRACKER]] |
| `React` | The screen-building toolkit underneath Next.js; the plan insists the engine never depends on it | [[02 - DOCUMENT FINDINGS]], [[05 - SYSTEM ARCHITECTURE]] |
| `Zod` | A ready-made checking library that tests whether incoming information has the expected shape | [[02 - DOCUMENT FINDINGS]], [[09 - TASK TRACKER]] |
| `react-markdown` | A ready-made piece that draws Markdown text on the screen as it will be read — this is the live preview | [[09 - TASK TRACKER]] |
| `remark-gfm` | A helper that teaches the preview the common extra Markdown features, such as tables | [[09 - TASK TRACKER]] |
| `Lucide React` | The set of small pictures — icons — named in the material's stack list | [[09 - TASK TRACKER]] |
| `ESLint` | A tool that reads the program's files and points out mistakes and bad habits before a person does | [[09 - TASK TRACKER]] |
| `Turbopack` | A faster tool that gathers the program's many files together so the app can run | [[09 - TASK TRACKER]] |
| `App Router` | The part of Next.js that decides which page appears at which address | [[09 - TASK TRACKER]] |
| `IndexedDB` | The browser's built-in large storage — a place a web app may keep substantial amounts of information on the person's own device | [[05 - SYSTEM ARCHITECTURE]] |
| `Dexie` | A friendly layer placed over the browser's large storage so the app can use it without wrestling with its raw quirks | [[05 - SYSTEM ARCHITECTURE]], [[07 - DEVELOPMENT ROADMAP]], [[09 - TASK TRACKER]] |
| `localStorage` | The browser's built-in small storage, suited to a handful of settings rather than collections of content | [[05 - SYSTEM ARCHITECTURE]] |
| `Markdown` | A plain way of writing text with simple marks for headings and lists, readable as-is and renderable as a formatted document | Throughout |
| `JSON` | A plain-text way of writing structured information that programs can read back reliably — the format of the backup file | [[09 - TASK TRACKER]] |
| `PWA` | Short for progressive web app — a web app that can be installed like a normal program and keep working without internet; the material's name for its offline-support phase | [[07 - DEVELOPMENT ROADMAP]], [[09 - TASK TRACKER]] |
| `service worker` | The quiet helper a browser keeps running for an installed web app, holding a copy of the app's files so it works offline | [[09 - TASK TRACKER]] |
| `static host` | A service that hands out fixed files to visitors, with no program running behind it to answer each request individually | [[05 - SYSTEM ARCHITECTURE]], [[07 - DEVELOPMENT ROADMAP]] |
| `module` | Here, a self-contained section of the product that owns one job — the word the material itself uses for presets, history, library, and settings | [[05 - SYSTEM ARCHITECTURE]], [[07 - DEVELOPMENT ROADMAP]] |
| `API` | The way two programs talk to each other — appears in these notes only inside the preset name API Design | [[00 - START HERE]], [[02 - DOCUMENT FINDINGS]] |
| `Database` | The store where information is kept — appears inside the preset name Database and in the material's list of servers it will not need | [[00 - START HERE]], [[02 - DOCUMENT FINDINGS]], [[05 - SYSTEM ARCHITECTURE]] |
| `deployment` | Putting the finished app where people can reach it — the material's own name for its last build phase | [[02 - DOCUMENT FINDINGS]] |

## How this list was built

Any technical word left in the notes had to earn its place by being a real name — a product, a file, a term this project already uses. Everything else was replaced with everyday words. If a word here is still unclear, that is a fault in this list, not in the reader.
