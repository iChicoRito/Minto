import { describeCode, describeError, enhancementErrorCode } from "../app/(main)/_components/enhancement-errors";
import { createWorkspaceState, workspaceReducer } from "../app/(main)/_components/workspace-state";
import {
  getMarkdownCounts,
  insertCodeBlock,
  insertHorizontalRule,
  insertImage,
  insertLink,
  insertTableSkeleton,
  prefixSelectedLines,
  quoteSelectedLines,
  setHeadingLevel,
  taskPrefixSelectedLines,
  togglePrefixSelectedLines,
  toggleTaskChecked,
  toggleWrapSelection,
  wrapSelection,
} from "../components/markdown/markdown-editor-utils";
import { AiEnhancementClientError } from "../lib/ai-enhancement/client";
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
    name: "preset catalogue contains the 18 named mappings",
    run: () => {
      if (PROMPT_PRESETS.length !== 18) throw new Error(`expected 18 presets, got ${PROMPT_PRESETS.length}`);
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
        generation: { kind: "ai", provider: "deepseek", model: "deepseek-v4-flash" } as const,
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
          generation: { kind: "ai", provider: "deepseek", model: "deepseek-v4-flash" } as const,
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
  {
    name: "enhancement error copy stays plain and pins every user-facing string",
    run: () => {
      const expectedMessages = {
        invalid_endpoint: "The enhancement service is not configured for this site.",
        forbidden_origin: "The enhancement service is not configured for this site.",
        service_disabled: "Enhancement is unavailable right now.",
        service_unavailable: "Enhancement is temporarily unavailable.",
        service_busy: "The enhancement service is busy. Please try again shortly.",
        provider_timeout: "The enhancement service timed out. Please try again.",
        timeout: "The enhancement service timed out. Please try again.",
        provider_rate_limited: "The enhancement service is rate limited. Please try again later.",
        provider_unavailable: "The enhancement service could not be reached.",
        network: "The enhancement service could not be reached.",
        model_unavailable: "The enhancement service is currently unavailable.",
        priced_route_unavailable: "The enhancement request was rejected. Please try again later.",
        provider_refused: "The request was rejected. Please adjust the prompt and try again.",
        invalid_provider_response: "Try again.",
        invalid_response: "Try again.",
        output_too_large: "The response exceeded its size limit. Try a shorter prompt.",
        internal_error: "Enhancement failed. Please try again.",
        some_unknown_code: "Enhancement failed. Please try again.",
      } as const;
      for (const [code, message] of Object.entries(expectedMessages)) {
        if (describeCode(code) !== message) throw new Error(`user-facing message drifted for code: ${code}`);
      }
      // No technical leakage anywhere in surfaced copy.
      for (const message of Object.values(expectedMessages)) {
        if (/\b(?:429|503|500|http|header|quota|retry.?after|status)\b/i.test(message)) {
          throw new Error(`technical wording leaked into: ${message}`);
        }
      }
    },
  },
  {
    name: "provider rate limits surface a generic notice without technical details",
    run: () => {
      const error = new AiEnhancementClientError("provider_rate_limited", "upstream quota metadata", {
        retryable: true,
        retryAfterSeconds: 600,
      });
      const described = describeError(error);
      if (described.message !== "The enhancement service is rate limited. Please try again later.") {
        throw new Error("rate-limited failure used the wrong copy");
      }
      if (!described.retryable || !described.fallbackEligible) throw new Error("rate-limited failure lost fallback");
      // Raw upstream text and retry metadata must never reach the message.
      if (described.message.includes("upstream") || described.message.includes("600")) {
        throw new Error("technical details leaked into the rate-limit notice");
      }
    },
  },
  {
    name: "remaining failures surface only generic friendly messages with no raw errors",
    run: () => {
      const rawFailure = new Error("TypeError: cannot read properties of undefined in adapter.ts:42");
      const described = describeError(rawFailure);
      if (described.message !== "Enhancement failed. Please try again.") throw new Error("generic default drifted");
      if (described.message.includes("TypeError") || described.message.includes("adapter.ts")) {
        throw new Error("raw error output leaked to the UI");
      }
      if (enhancementErrorCode(rawFailure) !== undefined) throw new Error("non-client error produced a code");

      const invalidResponse = new AiEnhancementClientError("invalid_response", "unexpected token at byte 0", {});
      if (describeError(invalidResponse).message !== "Try again.") throw new Error("invalid-response copy drifted");
    },
  },
  {
    name: "canvas spinner visibility follows the workspace running status exactly",
    run: () => {
      const initial = createWorkspaceState({
        taskType: "auto",
        level: "standard",
        sections: ["objective"],
        presetId: null,
      });
      if (initial.status === "running") throw new Error("spinner condition true while idle");
      const started = workspaceReducer(initial, { type: "enhancement-started", runId: "run-spin" });
      if (started.status !== "running") throw new Error("spinner condition false while enhancing");
      const succeeded = workspaceReducer(started, {
        type: "enhancement-succeeded",
        runId: "run-spin",
        document: {
          runId: "run-spin",
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
      if (succeeded.status === "running") throw new Error("spinner stayed visible after success");
      const restarted = workspaceReducer(succeeded, { type: "enhancement-started", runId: "run-spin-2" });
      const failed = workspaceReducer(restarted, {
        type: "enhancement-failed",
        runId: "run-spin-2",
        error: { message: "Try again.", retryable: true, fallbackEligible: true },
      });
      if (failed.status === "running") throw new Error("spinner stayed visible after failure");
      const restartedAgain = workspaceReducer(failed, { type: "enhancement-started", runId: "run-spin-3" });
      const cancelled = workspaceReducer(restartedAgain, { type: "enhancement-cancelled", runId: "run-spin-3" });
      if (cancelled.status === "running") throw new Error("spinner stayed visible after cancel");
    },
  },
  {
    name: "intent fidelity keeps enhanced output derived from the user input alone",
    run: () => {
      const intents = [
        { input: "fix navbar overflow on mobile", marker: "navbar overflow on mobile" },
        { input: "summarize the quarterly revenue report", marker: "quarterly revenue report" },
        { input: "research electric vehicle battery technology", marker: "electric vehicle battery technology" },
        { input: "image prompt for a snowy mountain cabin at dusk", marker: "snowy mountain cabin" },
      ];
      const outputs = intents.map(({ input }) => enhancePrompt(input, { level: "light" }).markdown);
      intents.forEach(({ marker }, index) => {
        if (!outputs[index].includes(marker)) throw new Error(`output dropped the user's subject: ${marker}`);
        const unrelated = intents[(index + 1) % intents.length].marker;
        if (outputs[index].includes(unrelated)) throw new Error(`output invented unrelated content: ${unrelated}`);
      });
      // The bounded generic fallback stays restrained instead of growing filler.
      const generic = enhancePrompt("fix it").markdown;
      if (!generic.includes("Resolve the described issue.")) throw new Error("generic objective drifted");
      if (!generic.includes("Confirm that the issue is resolved.")) throw new Error("generic verification drifted");
    },
  },
  {
    name: "toggle wrap adds and removes inline markers",
    run: () => {
      const wrapped = toggleWrapSelection({ value: "login", selectionStart: 0, selectionEnd: 5 }, "**", "bold text");
      if (wrapped.value !== "**login**" || wrapped.selectionStart !== 2 || wrapped.selectionEnd !== 7) {
        throw new Error("bold wrap drifted");
      }
      const unwrapped = toggleWrapSelection(wrapped, "**", "bold text");
      if (unwrapped.value !== "login" || unwrapped.selectionStart !== 0 || unwrapped.selectionEnd !== 5) {
        throw new Error("bold unwrap drifted");
      }
      const italic = toggleWrapSelection({ value: "code", selectionStart: 0, selectionEnd: 4 }, "*", "italic text");
      if (italic.value !== "*code*" || italic.selectionStart !== 1 || italic.selectionEnd !== 5) {
        throw new Error("italic marker must use a single asterisk");
      }
      const boldItalic = toggleWrapSelection({ value: "x", selectionStart: 0, selectionEnd: 1 }, "***", "em");
      if (boldItalic.value !== "***x***") throw new Error("bold-italic wrap drifted");
      const struck = toggleWrapSelection({ value: "gone", selectionStart: 0, selectionEnd: 4 }, "~~", "struck text");
      if (struck.value !== "~~gone~~") throw new Error("strikethrough wrap drifted");
    },
  },
  {
    name: "line prefix toggles remove when every line carries the prefix",
    run: () => {
      const added = togglePrefixSelectedLines({ value: "one\ntwo", selectionStart: 0, selectionEnd: 7 }, "- ");
      if (added.value !== "- one\n- two") throw new Error("bullet toggle-add drifted");
      const removed = togglePrefixSelectedLines(added, "- ");
      if (removed.value !== "one\ntwo" || removed.selectionStart !== 0 || removed.selectionEnd !== 7) {
        throw new Error("bullet toggle-remove drifted");
      }
    },
  },
  {
    name: "heading level sets switches and strips ATX prefixes",
    run: () => {
      const h1 = setHeadingLevel({ value: "Title", selectionStart: 0, selectionEnd: 5 }, 1);
      if (h1.value !== "# Title" || h1.selectionStart !== 2 || h1.selectionEnd !== 7) {
        throw new Error("heading 1 drift");
      }
      const h2 = setHeadingLevel(h1, 2);
      if (h2.value !== "## Title" || h2.selectionStart !== 3 || h2.selectionEnd !== 8) {
        throw new Error("heading switch drift");
      }
      const none = setHeadingLevel(h2, 2);
      if (none.value !== "Title" || none.selectionStart !== 0 || none.selectionEnd !== 5) {
        throw new Error("heading strip drift");
      }
      const h3 = setHeadingLevel(none, 3);
      if (h3.value !== "### Title") throw new Error("heading 3 drift");
    },
  },
  {
    name: "block inserts produce exact markdown and selections",
    run: () => {
      const table = insertTableSkeleton({ value: "", selectionStart: 0, selectionEnd: 0 });
      const expectedTable = "| Column A | Column B |\n| --- | --- |\n|  |  |\n|  |  |\n|  |  |";
      if (table.value !== expectedTable || table.selectionStart !== 2 || table.selectionEnd !== 10) {
        throw new Error("table skeleton drift");
      }
      const fenced = insertCodeBlock({ value: "body", selectionStart: 0, selectionEnd: 4 });
      if (fenced.value !== "```\nbody\n```" || fenced.selectionStart !== 4 || fenced.selectionEnd !== 8) {
        throw new Error("code block drift");
      }
      const separated = insertCodeBlock({ value: "a\nb", selectionStart: 2, selectionEnd: 3 });
      if (separated.value !== "a\n\n```\nb\n```" || separated.selectionStart !== 7 || separated.selectionEnd !== 8) {
        throw new Error("code block separation drift");
      }
      const rule = insertHorizontalRule({ value: "para", selectionStart: 4, selectionEnd: 4 });
      if (rule.value !== "para\n\n---" || rule.selectionStart !== 9 || rule.selectionEnd !== 9) {
        throw new Error("horizontal rule drift");
      }
      const image = insertImage({ value: "pic", selectionStart: 3, selectionEnd: 3 });
      if (
        image.value !== "pic![alt text](https://example.com/image.png)" ||
        image.selectionStart !== 5 ||
        image.selectionEnd !== 13
      ) {
        throw new Error("image insert drift");
      }
      const imageAltFromSelection = insertImage({ value: "cat pic", selectionStart: 0, selectionEnd: 7 });
      if (imageAltFromSelection.value !== "![cat pic](https://example.com/image.png)") {
        throw new Error("image must reuse the selection as alt text");
      }
      const link = insertLink({ value: "docs", selectionStart: 0, selectionEnd: 4 });
      if (link.value !== "[docs](https://example.com)") throw new Error("link URL placeholder drifted");
    },
  },
  {
    name: "quote and task transforms cover the remaining constructs",
    run: () => {
      const quoted = quoteSelectedLines({ value: "wise words", selectionStart: 0, selectionEnd: 10 });
      if (quoted.value !== "> wise words") throw new Error("blockquote add drifted");
      const unquoted = quoteSelectedLines(quoted);
      if (unquoted.value !== "wise words") throw new Error("blockquote toggle-off drifted");

      const task = taskPrefixSelectedLines({ value: "ship it", selectionStart: 0, selectionEnd: 7 }, false);
      if (task.value !== "- [ ] ship it") throw new Error("task prefix drifted");
      const doneTask = taskPrefixSelectedLines({ value: "fix bug", selectionStart: 0, selectionEnd: 7 }, true);
      if (doneTask.value !== "- [x] fix bug") throw new Error("checked task prefix drifted");
      const fromBullet = taskPrefixSelectedLines({ value: "- old item", selectionStart: 0, selectionEnd: 10 }, false);
      if (fromBullet.value !== "- [ ] old item") throw new Error("task must replace the bullet marker");
      const indented = taskPrefixSelectedLines({ value: "  nested", selectionStart: 0, selectionEnd: 8 }, false);
      if (indented.value !== "  - [ ] nested") throw new Error("task must preserve indentation");

      const flipped = toggleTaskChecked({
        value: "- [ ] a\n- [X] b",
        selectionStart: 0,
        selectionEnd: 15,
      });
      if (flipped.value !== "- [x] a\n- [ ] b" || flipped.selectionStart !== 0 || flipped.selectionEnd !== 15) {
        throw new Error("check toggle drift (uppercase X must normalize)");
      }
    },
  },
] as const;
