import { createWorkspaceState, workspaceReducer } from "../app/(main)/_components/workspace-state";
import { getMarkdownCounts, prefixSelectedLines, wrapSelection } from "../components/markdown/markdown-editor-utils";
import { filterLibraryPrompts, normalizeTags, titleFromPrompt } from "../lib/browser-memory/record-utils";
import {
  DEFAULT_PROMPT_SECTIONS,
  parsePromptSections,
  serializePromptSections,
} from "../lib/preferences/prompt-preferences";
import { getPromptPreset, PROMPT_PRESETS } from "../lib/prompt-presets";

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
      const withResult = workspaceReducer(initial, {
        type: "enhancement-succeeded",
        document: {
          runId: "run-1",
          originalPrompt: "fix login",
          controls: initial.controls,
          analysis: {} as never,
          resolved: {} as never,
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
] as const;
