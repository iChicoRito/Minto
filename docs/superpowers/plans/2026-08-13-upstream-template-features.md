# Upstream Template Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the latest upstream File Manager, Patient Monitoring, and Profile demo screens and expose all three in the local template sidebar.

**Architecture:** Port each final feature directory from `upstream/main` into the equivalent local route beneath `src/app/(template)/template/(main)/dashboard/`. Keep upstream colocation and mock behavior unchanged, then adapt only the centralized sidebar URLs to the local `/template` prefix.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts, Lucide React

## Global Constraints

- Treat this repository as the source of truth; do not merge or rebase unrelated upstream history.
- Import pure template/demo behavior only: no storage, database, authentication, medical API, or persistence.
- Preserve all existing routes, layouts, preference behavior, shared components, and package compatibility decisions.
- Use the final feature files from `upstream/main`, not intermediate feature-branch revisions.
- Keep routes under `/template/dashboard/...` and make every feature visible in the sidebar.
- Add no new dependency unless TypeScript or the production build proves one is strictly required.

---

### Task 1: Port File Manager

**Files:**
- Source: `upstream/main:src/app/(main)/dashboard/file-manager/`
- Create: `src/app/(template)/template/(main)/dashboard/file-manager/` (7 files)

**Interfaces:**
- Consumes: Existing `@/components/ui/{avatar,badge,button,card,empty,input-group,table,toggle-group}` and `@/lib/utils`.
- Produces: App Router page at `/template/dashboard/file-manager` with mock file/folder data and grid/list UI.

- [ ] **Step 1: Prove the route module is absent**

```powershell
if (Test-Path 'src/app/(template)/template/(main)/dashboard/file-manager/page.tsx') { exit 1 }
```

Expected: exit 0.

- [ ] **Step 2: Import the exact final upstream module**

For every path returned below, create the same relative file beneath the local destination and copy its blob content unchanged:

```powershell
git ls-tree -r --name-only upstream/main -- 'src/app/(main)/dashboard/file-manager'
git show 'upstream/main:src/app/(main)/dashboard/file-manager/page.tsx'
```

The destination mapping is:

```text
src/app/(main)/dashboard/file-manager/<relative-path>
→ src/app/(template)/template/(main)/dashboard/file-manager/<relative-path>
```

- [ ] **Step 3: Verify the imported module compiles**

```powershell
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 4: Commit the feature module**

```powershell
git add -- 'src/app/(template)/template/(main)/dashboard/file-manager'
git commit -m "feat: add file manager template"
```

### Task 2: Port Patient Monitoring

**Files:**
- Source: `upstream/main:src/app/(main)/dashboard/patient-monitoring/`
- Create: `src/app/(template)/template/(main)/dashboard/patient-monitoring/` (12 files)

**Interfaces:**
- Consumes: Existing alert, badge, button, chart, separator, tabs, tooltip components; `date-fns`; Recharts 3.8.0; React client hooks.
- Produces: App Router page at `/template/dashboard/patient-monitoring` with simulated patients, waveforms, trend charts, and detail selection.

- [ ] **Step 1: Prove the route module is absent**

```powershell
if (Test-Path 'src/app/(template)/template/(main)/dashboard/patient-monitoring/page.tsx') { exit 1 }
```

Expected: exit 0.

- [ ] **Step 2: Import the exact final upstream module**

```powershell
git ls-tree -r --name-only upstream/main -- 'src/app/(main)/dashboard/patient-monitoring'
git show 'upstream/main:src/app/(main)/dashboard/patient-monitoring/page.tsx'
```

Copy every returned blob unchanged using this mapping:

```text
src/app/(main)/dashboard/patient-monitoring/<relative-path>
→ src/app/(template)/template/(main)/dashboard/patient-monitoring/<relative-path>
```

- [ ] **Step 3: Verify hooks and chart types compile against retained dependencies**

```powershell
npx tsc --noEmit
```

Expected: exit 0. If it fails, make only the narrow compatibility edit identified by the compiler; do not upgrade Recharts or unrelated packages.

- [ ] **Step 4: Commit the feature module**

```powershell
git add -- 'src/app/(template)/template/(main)/dashboard/patient-monitoring'
git commit -m "feat: add patient monitoring template"
```

### Task 3: Port Profile

**Files:**
- Source: `upstream/main:src/app/(main)/dashboard/profile/`
- Create: `src/app/(template)/template/(main)/dashboard/profile/` (9 files)

**Interfaces:**
- Consumes: Existing avatar, badge, button, separator, table, and tabs components.
- Produces: App Router page at `/template/dashboard/profile` with mock overview, employment, personal, time-off, and document sections.

- [ ] **Step 1: Prove the route module is absent**

```powershell
if (Test-Path 'src/app/(template)/template/(main)/dashboard/profile/page.tsx') { exit 1 }
```

Expected: exit 0.

- [ ] **Step 2: Import the exact final upstream module**

```powershell
git ls-tree -r --name-only upstream/main -- 'src/app/(main)/dashboard/profile'
git show 'upstream/main:src/app/(main)/dashboard/profile/page.tsx'
```

Copy every returned blob unchanged using this mapping:

```text
src/app/(main)/dashboard/profile/<relative-path>
→ src/app/(template)/template/(main)/dashboard/profile/<relative-path>
```

- [ ] **Step 3: Verify the imported module compiles**

```powershell
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 4: Commit the feature module**

```powershell
git add -- 'src/app/(template)/template/(main)/dashboard/profile'
git commit -m "feat: add profile template"
```

### Task 4: Expose All Features in the Sidebar

**Files:**
- Modify: `src/navigation/sidebar/sidebar-items.ts`

**Interfaces:**
- Consumes: Existing `NavGroup`/`NavMainItem` configuration and sidebar renderer.
- Produces: Three visible, active-state-aware links with stable IDs and `/template`-prefixed URLs.

- [ ] **Step 1: Add the required Lucide imports**

Add `FolderOpen`, `HeartPulse`, and `UserRound` to the existing `lucide-react` import.

- [ ] **Step 2: Add dashboard-group links after Infrastructure**

```tsx
{
  id: "file-manager",
  title: "File Manager",
  url: "/template/dashboard/file-manager",
  icon: FolderOpen,
  badge: "new",
},
{
  id: "patient-monitoring",
  title: "Patient Monitoring",
  url: "/template/dashboard/patient-monitoring",
  icon: HeartPulse,
  badge: "new",
},
```

- [ ] **Step 3: Add the Profile link after Invoice**

```tsx
{
  id: "profile",
  title: "Profile",
  url: "/template/dashboard/profile",
  icon: UserRound,
  badge: "new",
},
```

- [ ] **Step 4: Verify unique IDs and exact URLs**

```powershell
rg -n 'file-manager|patient-monitoring|profile' src/navigation/sidebar/sidebar-items.ts
npx tsc --noEmit
```

Expected: each ID and route appears once; TypeScript exits 0.

- [ ] **Step 5: Commit navigation**

```powershell
git add -- src/navigation/sidebar/sidebar-items.ts
git commit -m "feat: link new templates in sidebar"
```

### Task 5: Full Verification and Delivery

**Files:**
- Verify only; no planned source edits.

**Interfaces:**
- Consumes: All three route modules and sidebar configuration.
- Produces: Evidence that the update installs, compiles, builds, renders, and remains rollback-safe.

- [ ] **Step 1: Run the deterministic static verification**

```powershell
npm ci
npx tsc --noEmit
npm run lint
npm run check
npm run build
git diff --check
```

Expected: every command exits 0; known Biome warnings may remain but no errors are accepted.

- [ ] **Step 2: Run the production server and route checks**

```powershell
npm run start -- -p 3100
```

In a second process, request:

```powershell
@(
  '/template/dashboard/file-manager',
  '/template/dashboard/patient-monitoring',
  '/template/dashboard/profile'
) | ForEach-Object {
  (Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:3100$_").StatusCode
}
```

Expected: three `200` responses.

- [ ] **Step 3: Verify sidebar and responsive browser behavior**

With Playwright CLI, inspect all three routes at 1440×900 and 390×844. Confirm the corresponding sidebar label is visible at desktop width, its link navigates to the exact route, active state renders, the mobile sidebar opens from `Toggle Sidebar`, primary demo controls render, and `console error` reports zero messages.

- [ ] **Step 4: Verify final Git scope and push**

```powershell
git status --short --branch
git diff --name-status backup/pre-upstream-sync-2026-08-13..HEAD
git log --oneline --decorate backup/pre-upstream-sync-2026-08-13..HEAD
git push origin chore/upstream-sync-2026-08-13
```

Expected: only the approved dependency update, design/plan documents, three feature modules, sidebar configuration, and any compiler-proven compatibility edits differ from the backup branch.
