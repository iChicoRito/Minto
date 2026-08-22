import type { PromptPresetId } from "../../../lib/prompt-presets";
import type { EnhancePromptResult, ResolvedEnhancement } from "../../../prompt-engine";
import type { SectionId } from "../../../prompt-engine/templates/template-types";
import type { EnhancementLevel, PromptAnalysis, PromptTaskType } from "../../../prompt-engine/types";

export type WorkspaceControls = {
  taskType: "auto" | PromptTaskType;
  level: EnhancementLevel;
  sections: readonly SectionId[];
  presetId: PromptPresetId | null;
};

export type WorkspaceDocument = {
  runId: string;
  originalPrompt: string;
  controls: WorkspaceControls;
  analysis: PromptAnalysis;
  resolved: ResolvedEnhancement;
  generatedMarkdown: string;
  markdown: string;
  historyId: string | null;
  libraryPromptId: string | null;
  dirty: boolean;
  stale: boolean;
};

export type WorkspaceState = {
  prompt: string;
  controls: WorkspaceControls;
  document: WorkspaceDocument | null;
  view: "result" | "preview" | "edit";
  status: "idle" | "running" | "error";
  error: string | null;
  actionMessage: string | null;
};

export type WorkspaceAction =
  | { type: "prompt-changed"; prompt: string }
  | { type: "controls-changed"; controls: WorkspaceControls }
  | { type: "enhancement-started" }
  | { type: "enhancement-succeeded"; document: WorkspaceDocument }
  | { type: "enhancement-failed"; message: string }
  | { type: "history-saved"; runId: string; historyId: string }
  | { type: "library-saved"; runId: string; libraryPromptId: string }
  | { type: "markdown-changed"; markdown: string }
  | { type: "reset-markdown" }
  | { type: "view-changed"; view: WorkspaceState["view"] }
  | { type: "action-message"; message: string | null };

export function createWorkspaceState(controls: WorkspaceControls): WorkspaceState {
  return {
    prompt: "",
    controls,
    document: null,
    view: "result",
    status: "idle",
    error: null,
    actionMessage: null,
  };
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "prompt-changed":
      return { ...state, prompt: action.prompt, error: null };
    case "controls-changed":
      return {
        ...state,
        controls: action.controls,
        document: state.document ? { ...state.document, stale: true } : null,
        error: null,
      };
    case "enhancement-started":
      return { ...state, status: "running", error: null, actionMessage: null };
    case "enhancement-succeeded":
      return { ...state, document: action.document, status: "idle", error: null, view: "preview", actionMessage: null };
    case "enhancement-failed":
      return { ...state, status: "error", error: action.message };
    case "history-saved":
      return state.document?.runId === action.runId
        ? {
            ...state,
            document: { ...state.document, historyId: action.historyId },
            actionMessage: "Added to local history.",
          }
        : state;
    case "library-saved":
      return state.document?.runId === action.runId
        ? {
            ...state,
            document: { ...state.document, libraryPromptId: action.libraryPromptId, dirty: false },
            actionMessage: "Saved to your local library.",
          }
        : state;
    case "markdown-changed":
      return state.document
        ? { ...state, document: { ...state.document, markdown: action.markdown, dirty: true } }
        : state;
    case "reset-markdown":
      return state.document
        ? {
            ...state,
            document: { ...state.document, markdown: state.document.generatedMarkdown, dirty: false },
          }
        : state;
    case "view-changed":
      return { ...state, view: action.view };
    case "action-message":
      return { ...state, actionMessage: action.message };
  }
}

export function documentFromEnhancement(
  runId: string,
  originalPrompt: string,
  controls: WorkspaceControls,
  result: EnhancePromptResult,
): WorkspaceDocument {
  return {
    runId,
    originalPrompt,
    controls,
    analysis: result.analysis,
    resolved: result.resolved,
    generatedMarkdown: result.markdown,
    markdown: result.markdown,
    historyId: null,
    libraryPromptId: null,
    dirty: false,
    stale: false,
  };
}
