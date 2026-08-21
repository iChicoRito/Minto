# Upstream Template Features Design

## Goal

Add the latest upstream File Manager, Patient Monitoring, and Profile demo screens to this customized template without merging unrelated upstream history or replacing existing routes and components.

## Integration Design

- Copy the final versions of the three feature modules from `upstream/main` into the local App Router tree under `src/app/(template)/template/(main)/dashboard/`.
- Preserve upstream component colocation and mock-data behavior while adapting route paths to the local `/template/dashboard/...` prefix.
- Add visible File Manager, Patient Monitoring, and Profile entries to `src/navigation/sidebar/sidebar-items.ts` using the existing typed navigation structure and upstream icons/badges.
- Reuse the shared shadcn components and compatible packages already installed on `chore/upstream-sync-2026-08-13`; do not import unrelated upstream migrations or application code.

## Routes and Navigation

The implementation must expose and link these routes:

- `/template/dashboard/file-manager`
- `/template/dashboard/patient-monitoring`
- `/template/dashboard/profile`

File Manager and Patient Monitoring will appear in the dashboard group near the other dashboard examples. Profile will appear in the pages group with the other page-level examples. Each sidebar item must render in expanded and collapsed sidebar modes and show the correct active state on its route.

## Behavior Boundaries

- File Manager remains a visual demo with local mock folders/files and UI-only controls.
- Patient Monitoring remains simulated client-side monitoring with upstream mock patients and generated waveform/trend data.
- Profile remains a read-only/mock employee profile presentation.
- No file storage, uploads, database, authentication, medical API, profile persistence, or new backend endpoint is included.
- Existing template routes, layouts, theme preferences, sidebar behavior, and shared components must remain intact.

## Verification

- Run `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm run check`, and `npm run build`.
- Verify all three routes return HTTP 200 and load through their sidebar links.
- Use a real browser to check desktop and mobile layouts, sidebar visibility/active states, primary interactions, and console errors.
- Confirm Git scope contains only the three feature modules, the sidebar configuration, and any strictly required compatibility edits.

## Rollback

Keep the work on `chore/upstream-sync-2026-08-13`. The existing `backup/pre-upstream-sync-2026-08-13` branch remains the pre-update recovery point, and the feature commit can be reverted independently if needed.
