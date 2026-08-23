import { createWorkspaceState, workspaceReducer } from "../app/(main)/_components/workspace-state";
import { getMarkdownCounts, prefixSelectedLines, wrapSelection } from "../components/markdown/markdown-editor-utils";
import { parseBackup } from "../lib/browser-memory/backup-schema";
import { filterLibraryPrompts, normalizeTags, titleFromPrompt } from "../lib/browser-memory/record-utils";
import { defaultPreferenceSnapshot } from "../lib/preferences/preference-snapshot";
import {
  DEFAULT_PROMPT_SECTIONS,
  parsePromptSections,
  serializePromptSections,
} from "../lib/preferences/prompt-preferences";
import { getPromptPreset, PROMPT_PRESETS } from "../lib/prompt-presets";
import { enhancePrompt, MAX_PROMPT_CHARACTERS, validatePrompt } from "../prompt-engine";

export const PRODUCT_CASES = [
  {
    name: "prompt defaults use standard and four selected sections",
    run: () => {
      if (serializePromptSections(DEFAULT_PROMPT_SECTIONS) !== "objective,requirements,constraints,verification") {
        throw new Error("unexpected default section serialization");
      }
    },
  },
  {
    name: "prompt section parsing filters duplicates and restores objective",
    run: () => {
      const sections = parsePromptSections("requirements,requirements,acceptance-criteria");
      const expected = ["objective", "requirements", "acceptance-criteria"];
      if (JSON.stringify(sections) !== JSON.stringify(expected)) throw new Error("invalid section normalization");
    },
  },
  {
    name: "preset catalogue contains the 17 named mappings",
    run: () => {
      if (PROMPT_PRESETS.length !== 17) throw new Error(`expected 17 presets, got ${PROMPT_PRESETS.length}`);
      if (getPromptPreset("api-design")?.taskType !== "feature") throw new Error("API Design mapping drifted");
      if (getPromptPreset("ui-design")?.taskType !== "ui-review") throw new Error("UI Design mapping drifted");
      if (getPromptPreset("bug-fix")?.category !== "development") throw new Error("Bug Fix category drifted");
    },
  },
  {
    name: "markdown editor transforms selection and counts content",
    run: () => {
      const bold = wrapSelection({ value: "login", selectionStart: 0, selectionEnd: 5 }, "**", "**", "bold text");
      if (bold.value !== "**login**" || bold.selectionStart !== 2 || bold.selectionEnd !== 7) {
        throw new Error("bold transform drifted");
      }
      const bullets = prefixSelectedLines({ value: "one\ntwo", selectionStart: 0, selectionEnd: 7 }, "- ");
      if (bullets.value !== "- one\n- two") throw new Error("bullet transform drifted");
      const counts = getMarkdownCounts("# Login\n\nFix the issue");
      if (counts.words !== 5 || counts.characters !== 22) throw new Error("Markdown counts drifted");
    },
  },
  {
    name: "workspace control changes mark a result stale",
    run: () => {
      const initial = createWorkspaceState({
        taskType: "auto",
        level: "standard",
        sections: ["objective"],
        presetId: null,
      });
      const started = workspaceReducer(initial, { type: "enhancement-started", runId: "run-1" });
      if (!started.activeRunId) throw new Error("workspace did not track the active run");
      const withResult = workspaceReducer(started, {
        type: "enhancement-succeeded",
        runId: "run-1",
        document: {
          runId: "run-1",
          originalPrompt: "fix login",
          controls: initial.controls,
          analysis: {} as never,
          classification: {} as never,
          resolved: {} as never,
          generation: { kind: "deterministic" },
          generatedMarkdown: "# Objective\n\nFix login.",
          markdown: "# Objective\n\nFix login.",
          historyId: null,
          libraryPromptId: null,
          dirty: false,
          stale: false,
        },
      });
      const changed = workspaceReducer(withResult, {
        type: "controls-changed",
        controls: { ...initial.controls, level: "detailed" },
      });
      if (!changed.document?.stale) throw new Error("workspace did not mark stale");
    },
  },
  {
    name: "stale and late enhancement results are ignored through run IDs",
    run: () => {
      const initial = createWorkspaceState({
        taskType: "auto",
        level: "standard",
        sections: ["objective"],
        presetId: null,
      });
      const makeDocument = (runId: string) => ({
        runId,
        originalPrompt: "fix login",
        controls: initial.controls,
        analysis: {} as never,
        classification: {} as never,
        resolved: {} as never,
        generation: { kind: "ai", provider: "openrouter", model: "stealth/ox-alpha" } as const,
        generatedMarkdown: `# Objective\n\n${runId}`,
        markdown: `# Objective\n\n${runId}`,
        historyId: null,
        libraryPromptId: null,
        dirty: false,
        stale: false,
      });

      // A result for a run that was never started must not be applied.
      const unstarted = workspaceReducer(initial, {
        type: "enhancement-succeeded",
        runId: "ghost-run",
        document: makeDocument("ghost-run"),
      });
      if (unstarted.document !== null) throw new Error("unstarted run result was applied");

      const started = workspaceReducer(initial, { type: "enhancement-started", runId: "run-a" });
      const cancelled = workspaceReducer(started, { type: "enhancement-cancelled", runId: "run-a" });
      if (cancelled.status !== "idle" || cancelled.activeRunId !== null)
        throw new Error("cancel did not reset running");
      const lateSuccess = workspaceReducer(cancelled, {
        type: "enhancement-succeeded",
        runId: "run-a",
        document: makeDocument("run-a"),
      });
      if (lateSuccess.document !== null) throw new Error("late result after cancel was applied");

      // A second start while running is ignored (double-submit protection).
      const doubleStarted = workspaceReducer(started, { type: "enhancement-started", runId: "run-b" });
      if (doubleStarted.activeRunId !== "run-a") throw new Error("second start replaced the active run");
      const wrongRun = workspaceReducer(doubleStarted, {
        type: "enhancement-failed",
        runId: "run-b",
        error: { message: "should not apply", retryable: true, fallbackEligible: true },
      });
      if (wrongRun.error !== null || wrongRun.status !== "running") throw new Error("foreign run failure applied");
    },
  },
  {
    name: "failed enhancements keep the prior result and expose structured errors",
    run: () => {
      const initial = createWorkspaceState({
        taskType: "auto",
        level: "standard",
        sections: ["objective"],
        presetId: null,
      });
      const started = workspaceReducer(initial, { type: "enhancement-started", runId: "run-1" });
      const succeeded = workspaceReducer(started, {
        type: "enhancement-succeeded",
        runId: "run-1",
        document: {
          runId: "run-1",
          originalPrompt: "fix login",
          controls: initial.controls,
          analysis: {} as never,
          classification: {} as never,
          resolved: {} as never,
          generation: { kind: "ai", provider: "openrouter", model: "stealth/ox-alpha" } as const,
          generatedMarkdown: "# Objective\n\nFix login.",
          markdown: "# Objective\n\nFix login.",
          historyId: null,
          libraryPromptId: null,
          dirty: false,
          stale: false,
        },
      });
      const failed = workspaceReducer(succeeded, { type: "enhancement-started", runId: "run-2" });
      const errored = workspaceReducer(failed, {
        type: "enhancement-failed",
        runId: "run-2",
        error: { message: "AI enhancement is unavailable right now.", retryable: false, fallbackEligible: true },
      });
      if (errored.document === null || errored.document.runId !== "run-1") {
        throw new Error("failure discarded the prior result");
      }
      if (errored.error?.message !== "AI enhancement is unavailable right now." || !errored.error.fallbackEligible) {
        throw new Error("structured error drifted");
      }
      if (succeeded.document?.generation.kind !== "ai") throw new Error("generation provenance drifted");

      const restored = workspaceReducer(errored, {
        type: "document-restored",
        document: { ...errored.document, runId: "restored", markdown: "# Restored" },
      });
      if (restored.document?.markdown !== "# Restored") throw new Error("document restore failed");
      if (restored.status !== "idle") throw new Error("restore left the workspace busy");
    },
  },
  {
    name: "library records normalize and filter predictably",
    run: () => {
      if (titleFromPrompt("  Fix   the login flow ") !== "Fix the login flow")
        throw new Error("title normalization drifted");
      if (JSON.stringify(normalizeTags([" UI ", "ui", "Research"])) !== JSON.stringify(["ui", "research"])) {
        throw new Error("tag normalization drifted");
      }
      const prompts = [
        {
          id: "1",
          title: "Login",
          originalPrompt: "Fix login",
          enhancedPrompt: "Fix the login flow",
          tags: ["ui"],
          favorite: true,
          category: "development",
          folderId: null,
        },
      ] as never;
      if (filterLibraryPrompts(prompts, { search: "login", favorite: true }).length !== 1) {
        throw new Error("library filtering drifted");
      }
    },
  },
  {
    name: "hard input validation keeps the documented boundary",
    run: () => {
      const empty = validatePrompt(" ");
      if (empty.ok || empty.message !== "Please enter a prompt.") throw new Error("empty validation drifted");
      if (!validatePrompt("fix it").ok) throw new Error("short prompt was rejected");
      if (!validatePrompt("x".repeat(MAX_PROMPT_CHARACTERS)).ok) throw new Error("boundary prompt was rejected");
      const oversized = validatePrompt("x".repeat(MAX_PROMPT_CHARACTERS + 1));
      if (oversized.ok || oversized.reason !== "too-long") {
        throw new Error("oversized prompt was accepted");
      }
    },
  },
  {
    name: "short fix prompt uses restrained generic copy",
    run: () => {
      const result = enhancePrompt("fix it");
      if (!result.markdown.includes("Resolve the described issue.")) throw new Error("generic objective drifted");
      if (!result.markdown.includes("Confirm that the issue is resolved."))
        throw new Error("generic verification drifted");
    },
  },
  {
    name: "backup schema accepts v2 and rejects duplicate records",
    run: () => {
      const settings = defaultPreferenceSnapshot();
      const data = { history: [], prompts: [], folders: [] };
      const valid = parseBackup({ format: "prompt-enhancer-backup", version: 2, exportedAt: "now", settings, data });
      if (!("backup" in valid) || valid.preview.promptCount !== 0) throw new Error("v2 backup was not parsed");
      const legacy = parseBackup({ format: "prompt-enhancer-backup", version: 1, exportedAt: "now", data });
      if (!("backup" in legacy) || legacy.backup.version !== 1) throw new Error("v1 backup was not migrated");
      const duplicate = {
        ...data,
        folders: [
          { id: "folder", name: "One", nameKey: "one", createdAt: 1, updatedAt: 1 },
          { id: "folder", name: "Two", nameKey: "two", createdAt: 1, updatedAt: 1 },
        ],
      };
      const invalid = parseBackup({
        format: "prompt-enhancer-backup",
        version: 2,
        exportedAt: "now",
        settings,
        data: duplicate,
      });
      if (!("error" in invalid)) throw new Error("duplicate folder IDs were accepted");
    },
  },
  {
    name: "generation provenance is optional in backups and validated when present",
    run: () => {
      const settings = defaultPreferenceSnapshot();
      const baseRecord = {
        id: "h1",
        createdAt: 1,
        originalPrompt: "fix login",
        enhancedPrompt: "# Objective",
        requestedTaskType: "auto",
        taskType: "bug-fix",
        category: "development",
        level: "standard",
        sectionIds: ["objective"],
        presetId: null,
      };
      const withAi = parseBackup({
        format: "prompt-enhancer-backup",
        version: 2,
        exportedAt: "now",
        settings,
        data: {
          history: [{ ...baseRecord, generation: { kind: "ai", provider: "openrouter", model: "stealth/ox-alpha" } }],
          prompts: [
            {
              ...baseRecord,
              id: "p1",
              sourceHistoryId: "h1",
              updatedAt: 1,
              title: "Login",
              favorite: false,
              folderId: null,
              tags: [],
              generation: { kind: "deterministic" },
            },
          ],
          folders: [],
        },
      });
      if (!("backup" in withAi)) throw new Error("provenanced records were rejected");
      const legacy = parseBackup({
        format: "prompt-enhancer-backup",
        version: 2,
        exportedAt: "now",
        settings,
        data: { history: [baseRecord], prompts: [], folders: [] },
      });
      if (!("backup" in legacy)) throw new Error("records without provenance were rejected");
      const forged = parseBackup({
        format: "prompt-enhancer-backup",
        version: 2,
        exportedAt: "now",
        settings,
        data: {
          history: [{ ...baseRecord, generation: { kind: "ai", provider: "evil", model: "stealth/ox-alpha" } }],
          prompts: [],
          folders: [],
        },
      });
      if (!("error" in forged)) throw new Error("forged provenance was accepted");
    },
  },
] as const;
