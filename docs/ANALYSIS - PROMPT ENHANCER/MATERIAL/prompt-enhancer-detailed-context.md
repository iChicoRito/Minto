# Prompt Enhancer — Detailed Development Roadmap

A practical roadmap for building a **non-AI, no-auth, local-first Prompt Enhancer** using **Next.js + TypeScript + shadcn/ui + IndexedDB**.

---

## Phase 1 — Define the Product Scope

### Goal

Lock the MVP before writing code.

### Core MVP Features

- Prompt input
- Prompt type detection
- Enhancement levels
- Prompt parser
- Rule engine
- Template engine
- Markdown generator
- Markdown editor
- Live preview
- Presets
- Local history
- Saved prompt library
- Favorites
- Settings
- Import/export
- Dark/light theme

### Explicitly Exclude for V1

- AI integration
- Authentication
- Cloud database
- User profiles
- Payments
- Teams
- Cloud synchronization
- Backend API

### Final Product Flow

```text
User Prompt
    ↓
Prompt Parser
    ↓
Prompt Classifier
    ↓
Rule Engine
    ↓
Template Resolver
    ↓
Prompt Enhancer
    ↓
Markdown Generator
    ↓
Editor / Preview
    ↓
Save locally / Copy / Export
```

---

## Phase 2 — Project Foundation

### Recommended Stack

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
Lucide React
Zod
react-markdown
IndexedDB
Dexie
localStorage
```

### Initialize

```bash
npx create-next-app@latest prompt-enhancer
```

Recommended configuration:

```text
TypeScript        Yes
ESLint            Yes
Tailwind CSS      Yes
App Router        Yes
src/ directory    Yes
Turbopack         Yes
```

Install core packages:

```bash
npm install zod dexie dexie-react-hooks react-markdown remark-gfm
```

Initialize shadcn/ui:

```bash
npx shadcn@latest init
```

---

## Phase 3 — Establish Architecture

Recommended project structure:

```text
src/
├── app/
│   ├── page.tsx
│   ├── presets/
│   │   └── page.tsx
│   ├── library/
│   │   └── page.tsx
│   ├── history/
│   │   └── page.tsx
│   ├── settings/
│   │   └── page.tsx
│   └── about/
│       └── page.tsx
│
├── components/
│   ├── layout/
│   ├── prompt/
│   ├── presets/
│   ├── library/
│   ├── history/
│   └── settings/
│
├── prompt-engine/
│   ├── parser/
│   │   ├── parser.ts
│   │   ├── actions.ts
│   │   ├── constraints.ts
│   │   ├── technologies.ts
│   │   └── keywords.ts
│   │
│   ├── classifier/
│   │   ├── classifier.ts
│   │   ├── scoring.ts
│   │   └── categories.ts
│   │
│   ├── rules/
│   │   ├── engine.ts
│   │   ├── development.ts
│   │   ├── writing.ts
│   │   ├── research.ts
│   │   └── design.ts
│   │
│   ├── templates/
│   │   ├── resolver.ts
│   │   ├── bug-fix.ts
│   │   ├── feature.ts
│   │   ├── code-review.ts
│   │   └── ...
│   │
│   ├── generator/
│   │   ├── enhancer.ts
│   │   └── markdown.ts
│   │
│   └── types.ts
│
├── storage/
│   ├── db.ts
│   ├── history.ts
│   ├── library.ts
│   ├── favorites.ts
│   └── settings.ts
│
├── hooks/
├── lib/
├── types/
└── constants/
```

Critical separation:

```text
UI
≠
Prompt Engine
≠
Storage
```

The prompt engine should not depend on React.

---

## Phase 4 — Define the Prompt Data Model

Before building the parser, define the structure the system works with.

```ts
type PromptAnalysis = {
  original: string
  category: PromptCategory
  taskType: PromptTaskType
  confidence: number

  action?: string
  subject?: string
  domain?: string

  technologies: string[]
  constraints: string[]
  requirements: string[]

  enhancementLevel: EnhancementLevel
}
```

Prompt categories:

```ts
type PromptCategory =
  | "development"
  | "writing"
  | "research"
  | "design"
  | "general"
```

Task types:

```ts
type PromptTaskType =
  | "bug-fix"
  | "feature"
  | "code-review"
  | "refactor"
  | "testing"
  | "documentation"
  | "rewrite"
  | "summarize"
  | "research"
  | "comparison"
  | "ui-review"
  | "image-prompt"
  | "general"
```

Enhancement levels:

```ts
type EnhancementLevel =
  | "light"
  | "standard"
  | "detailed"
```

---

## Phase 5 — Build the Prompt Parser

This is the first major engine component.

Its purpose is to extract recognizable information from plain text.

Example input:

```text
Add Google login using Next.js but don't change email authentication.
```

Possible parser result:

```json
{
  "action": "add",
  "subject": "Google login",
  "technologies": ["Next.js"],
  "constraints": [
    "don't change email authentication"
  ]
}
```

### Action Parser

Recognize:

```text
add
create
build
implement
fix
review
refactor
test
document
research
compare
```

### Constraint Parser

Detect phrases such as:

```text
don't change
do not modify
without changing
only modify
preserve
keep existing
do not remove
don't touch
```

### Technology Parser

Maintain a controlled dictionary:

```ts
[
  "Next.js",
  "React",
  "Vue",
  "Angular",
  "Laravel",
  "PHP",
  "TypeScript",
  "JavaScript",
  "Prisma",
  "MySQL",
  "PostgreSQL",
  "Supabase",
  "Firebase",
  "Tailwind CSS"
]
```

Expand this list over time.

---

## Phase 6 — Build the Classifier

The classifier determines what kind of prompt the user entered.

Avoid using only simple checks like:

```ts
prompt.includes("fix")
```

Use weighted scoring.

Example:

```ts
const bugFixSignals = {
  fix: 3,
  bug: 5,
  broken: 4,
  error: 4,
  issue: 2,
  failing: 4,
}
```

Input:

```text
Fix my login because it sometimes fails
```

Possible score:

```text
Bug Fix: 11
Feature: 0
Code Review: 0
Refactor: 0
```

Then:

```text
Classification
Bug Fix

Confidence
High
```

### Confidence Thresholds

Example:

```text
>= 80%   High confidence
60–79%   Medium
< 60%    Low
```

When confidence is low:

```text
Detected: General

You can manually select another prompt type.
```

This is important because the system does not use AI.

---

## Phase 7 — Build the Rule Engine

This is the main intelligence layer.

Example:

```ts
if (taskType === "bug-fix") {
  sections = [
    "objective",
    "problem",
    "scope",
    "requirements",
    "constraints",
    "verification",
  ]
}
```

### Feature Implementation

```text
Objective
Context
Requirements
Constraints
Implementation
Verification
Acceptance Criteria
```

### Code Review

```text
Objective
Review Scope
Review Areas
Constraints
Output Format
```

### Research

```text
Objective
Research Scope
Key Questions
Requirements
Output Format
```

---

## Phase 8 — Implement Enhancement Levels

Rules should behave differently depending on the selected level.

### Light

Focus on:

- clarity
- grammar
- directness

Example:

```text
fix login problem
```

becomes:

```text
Investigate and resolve the login problem while preserving existing authentication behavior.
```

### Standard

Adds useful structure.

```md
# Objective

Resolve the login problem.

## Requirements

- Identify the cause of the issue.
- Apply the necessary correction.

## Verification

- Confirm that login works correctly.
```

### Detailed

Adds the complete relevant structure.

```md
# Objective

...

## Problem

...

## Scope

...

## Requirements

...

## Constraints

...

## Verification

...

## Acceptance Criteria

...
```

Avoid forcing the same structure on every prompt.

---

## Phase 9 — Template Engine

Create reusable templates.

```text
templates/
├── development/
│   ├── bug-fix.ts
│   ├── feature.ts
│   ├── code-review.ts
│   ├── testing.ts
│   ├── refactor.ts
│   └── documentation.ts
│
├── writing/
├── research/
└── design/
```

Example template definition:

```ts
export const bugFixTemplate = {
  id: "bug-fix",
  category: "development",

  sections: {
    light: ["objective"],

    standard: [
      "objective",
      "requirements",
      "verification",
    ],

    detailed: [
      "objective",
      "problem",
      "scope",
      "requirements",
      "constraints",
      "verification",
      "acceptanceCriteria",
    ],
  },
}
```

---

## Phase 10 — Markdown Generator

Keep formatting separate from enhancement logic.

Input:

```ts
{
  objective: "...",
  requirements: ["...", "..."],
  constraints: ["..."],
}
```

Output:

```md
# Objective

...

## Requirements

- ...
- ...

## Constraints

- ...
```

This gives predictable Markdown even when rules evolve.

---

## Phase 11 — Build the Enhance UI

This is the main page.

### Left Panel

```text
Your Prompt

[ textarea ]

Prompt Type
[ Auto Detect ]

Enhancement Level
[ Standard ]

Include Sections
☑ Objective
☑ Requirements
☑ Constraints
☑ Verification
☐ Acceptance Criteria

[ Enhance Prompt ]
```

### Right Panel

```text
Result | Preview

# Objective

...

## Requirements

...

[ Copy ]
[ Edit ]
[ Save ]
[ Export ]
```

Useful shadcn components:

```text
Card
Textarea
Select
Checkbox
Button
Tabs
Separator
Tooltip
Badge
ScrollArea
DropdownMenu
```

---

## Phase 12 — Presets Module

Presets should bypass or assist automatic classification.

### Development

```text
Bug Fix
Build Feature
Code Review
Refactor
Testing
Documentation
API Design
Database
```

### Writing

```text
Rewrite
Summarize
Improve Writing
```

### Research

```text
Research Topic
Compare Options
Analyze Information
```

### Design

```text
UI Design
UX Review
Image Prompt
```

Selecting `Bug Fix` should automatically configure:

```text
Category: Development
Type: Bug Fix
Level: Standard
Relevant sections enabled
```

Then navigate to Enhance.

---

## Phase 13 — Markdown Editor

After enhancement, allow users to manually modify the result.

Recommended layout:

```text
┌──────────────────────┬──────────────────────┐
│ Markdown Editor      │ Live Preview         │
│                      │                      │
│ # Objective          │ Objective            │
│ ...                  │ ...                  │
└──────────────────────┴──────────────────────┘
```

Useful features:

- heading buttons
- bold
- italic
- bullets
- numbered list
- code
- links
- fullscreen
- undo/reset
- word count
- character count

---

## Phase 14 — Local Storage Architecture

Use two storage systems.

### localStorage

For:

```text
Theme
Default level
Default sections
UI preferences
History enabled
```

Example key:

```text
prompt-enhancer:settings
```

### IndexedDB

Use for:

```text
History
Saved prompts
Favorites
Folders
Tags
Custom presets
```

Using Dexie:

```ts
class PromptDatabase extends Dexie {
  prompts!: Table<SavedPrompt>
  history!: Table<PromptHistory>
  folders!: Table<Folder>
}
```

---

## Phase 15 — History Module

Automatically save generated prompts when enabled.

Store:

```ts
{
  id,
  originalPrompt,
  enhancedPrompt,
  type,
  level,
  createdAt
}
```

History UI:

```text
Today

Fix login issue
Bug Fix · Standard
Just now

Add Google login
Feature · Standard
9:30 AM
```

Actions:

```text
Open
Copy
Save to Library
Delete
```

---

## Phase 16 — Library Module

The Library should contain explicitly saved prompts.

Do not treat it the same as history.

### Features

```text
Save
Rename
Duplicate
Favorite
Edit
Delete
Search
Filter
Folders
Tags
```

Example structure:

```text
Library
├── All Prompts
├── Favorites
│
├── Development
├── Research
├── Writing
└── Design
```

---

## Phase 17 — Import/Export System

Since there is no account, this is important.

Allow users to export everything as:

```text
prompt-enhancer-backup.json
```

Example:

```json
{
  "version": 1,
  "settings": {},
  "prompts": [],
  "folders": [],
  "history": []
}
```

Import should:

1. validate the file
2. check schema version
3. reject invalid structures
4. show a preview
5. import valid content

Use Zod for validation.

---

## Phase 18 — Settings Module

Recommended tabs:

```text
General
Sections
Appearance
Data
```

### General

```text
Default Enhancement Level
Default Prompt Type
Auto-detect
```

### Sections

```text
☑ Objective
☑ Requirements
☑ Constraints
☑ Verification
☐ Acceptance Criteria
```

### Appearance

```text
System
Light
Dark
```

### Data

```text
Save history locally

Max history:
[ 500 ]

Export backup
Import backup

Clear history
Clear library
Clear all local data
```

---

## Phase 19 — Privacy UX

Because everything is local, make this visible.

Example sidebar message:

```text
100% Local

No account.
No AI.
Your prompts stay in your browser.
```

About page:

```text
Your prompts are processed locally on your device.

No prompt content is sent to an external server.
```

This can become an important product identity.

---

## Phase 20 — Validation and Edge Cases

### Empty Prompt

```text
Please enter a prompt.
```

### Extremely Short Prompt

```text
fix it
```

The app should still produce something reasonable without inventing too much.

### Huge Prompt

Set a reasonable limit for V1:

```text
10,000–20,000 characters
```

### Unknown Prompt

Fallback:

```text
Prompt Type: General
```

Do not pretend classification is certain.

### Conflicting Classification

Example:

```text
Review this code and fix the bugs
```

Could match:

```text
Code Review
Bug Fix
```

Choose the higher score or show:

```text
Detected: Code Review
Also matches: Bug Fix
```

---

## Phase 21 — Testing

The prompt engine needs more testing than the UI.

Create tests for:

```text
classification
constraint extraction
technology detection
template resolution
enhancement levels
Markdown generation
```

Example:

```ts
expect(
  classifyPrompt("Fix the broken login")
).toEqual("bug-fix")
```

Another:

```ts
expect(
  extractConstraints(
    "Add Google login but don't change email login"
  )
).toContain(
  "don't change email login"
)
```

Build a test dataset of at least:

```text
100–200 example prompts
```

covering different wording.

This lets you improve the rule engine systematically.

---

## Phase 22 — Performance Optimization

Because everything runs locally, enhancement should feel instant.

Target:

```text
Prompt processing < 100ms
```

for typical prompts.

Avoid:

- unnecessary React rerenders
- writing to IndexedDB on every keystroke
- parsing on every character

Instead:

```text
Parse when:
- Enhance is clicked
- prompt type changes
- enhancement level changes
```

---

## Phase 23 — Responsive Design

### Desktop

```text
Sidebar
+
Input / Output split layout
```

### Tablet

```text
Collapsible sidebar
+
Input / Output stacked or split
```

### Mobile

```text
Top navigation
Prompt input
Controls
Enhance
Result
```

For the Markdown editor on mobile:

```text
Edit | Preview
```

instead of side-by-side.

---

## Phase 24 — PWA Support

Once the web app is stable, add PWA support.

This allows users to install the app on:

- Windows
- Android
- macOS
- supported browsers

Because the app is local-first, it is a strong candidate for offline support.

Conceptually:

```text
Internet
  ↓
Load application once
  ↓
Service Worker cache
  ↓
Use offline
```

---

## Phase 25 — Deployment

Because there is no backend, deployment is simple.

You primarily deploy:

```text
Next.js frontend
static assets
JavaScript
CSS
```

Operational architecture:

```text
Static Hosting
      ↓
User Browser
      ↓
Prompt Engine
      ↓
IndexedDB
```

No:

```text
Database server
Authentication server
AI API
Background worker
Payment service
```

required.

---

# Recommended Implementation Order

```text
01 Project setup
      ↓
02 App shell + sidebar
      ↓
03 Prompt data types
      ↓
04 Prompt parser
      ↓
05 Classifier
      ↓
06 Rule engine
      ↓
07 Templates
      ↓
08 Markdown generator
      ↓
09 Enhance page
      ↓
10 Preview/editor
      ↓
11 Presets
      ↓
12 IndexedDB
      ↓
13 History
      ↓
14 Library
      ↓
15 Favorites/folders/tags
      ↓
16 Settings
      ↓
17 Import/export
      ↓
18 Responsive UI
      ↓
19 Unit testing
      ↓
20 PWA/offline
      ↓
21 Deployment
```

---

# Suggested Release Roadmap

| Release | Focus |
|---|---|
| **V0.1** | Parser + classifier prototype |
| **V0.2** | Rule engine + templates |
| **V0.3** | Markdown generator |
| **V0.4** | Enhance UI |
| **V0.5** | Presets |
| **V0.6** | History + IndexedDB |
| **V0.7** | Library + favorites |
| **V0.8** | Editor + live preview |
| **V0.9** | Settings + import/export |
| **V1.0** | Stable public release |
| **V1.1** | Custom templates |
| **V1.2** | Better classification |
| **V1.3** | PWA/offline |
| **V2.0** | Optional AI enhancement |

---

# Final V1 Architecture

```text
                    ┌───────────────────┐
                    │      Next.js      │
                    │    shadcn/ui      │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Prompt Workspace  │
                    └─────────┬─────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │ Prompt Parser   │
                     └────────┬────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │   Classifier    │
                     └────────┬────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │   Rule Engine   │
                     └────────┬────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Template Resolver │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Markdown Generator│
                    └─────────┬─────────┘
                              │
                     ┌────────┴─────────┐
                     ▼                  ▼
               Editor/Preview      Copy/Export
                     │
                     ▼
                  IndexedDB
               ┌─────┼──────┐
               ▼     ▼      ▼
            History Library Settings
```

---

# Core Product Priority

The most important milestone is not the UI. It is getting this pipeline reliable:

```text
Parser
  ↓
Classifier
  ↓
Rule Engine
  ↓
Template Resolver
  ↓
Markdown Generator
```

Once that works well, the rest of the application is mostly product UX around the engine.
