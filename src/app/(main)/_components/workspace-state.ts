import type { EnhancementResultV1, GenerationDescriptor } from "../../../lib/ai-enhancement/contracts";
import type { PromptPresetId } from "../../../lib/prompt-presets";
import type { ClassificationResult, ResolvedEnhancement } from "../../../prompt-engine";
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
  classification: ClassificationResult;
  resolved: ResolvedEnhancement & { presetId: PromptPresetId | null };
  generation: GenerationDescriptor;
  generatedMarkdown: string;
  markdown: string;
  historyId: string | null;
  libraryPromptId: string | null;
  dirty: boolean;
  stale: boolean;
};

export type WorkspaceError = {
  message: string;
  retryable: boolean;
  fallbackEligible: boolean;
};

export type WorkspaceState = {
  prompt: string;
  controls: WorkspaceControls;
  document: WorkspaceDocument | null;
  view: "result" | "preview" | "edit";
  status: "idle" | "running" | "error";
  activeRunId: string | null;
  error: WorkspaceError | null;
  actionMessage: string | null;
};

export type WorkspaceAction =
  | { type: "prompt-changed"; prompt: string }
  | { type: "controls-changed"; controls: WorkspaceControls }
  | { type: "enhancement-started"; runId: string }
  | { type: "enhancement-succeeded"; runId: string; document: WorkspaceDocument }
  | { type: "enhancement-failed"; runId: string; error: WorkspaceError }
  | { type: "enhancement-cancelled"; runId: string }
  | { type: "document-restored"; document: WorkspaceDocument }
  | { type: "input-error"; message: string; fallbackEligible?: boolean }
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
    activeRunId: null,
    error: null,
    actionMessage: null,
  };
}

function isRunActive(state: WorkspaceState, runId: string): boolean {
  return state.activeRunId !== null && state.activeRunId === runId;
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
      if (state.status === "running") return state;
      return { ...state, status: "running", activeRunId: action.runId, error: null, actionMessage: null };
    case "enhancement-succeeded":
      if (!isRunActive(state, action.runId)) return state;
      return {
        ...state,
        document: action.document,
        status: "idle",
        activeRunId: null,
        error: null,
        view: "preview",
        actionMessage: null,
      };
    case "enhancement-failed":
      if (!isRunActive(state, action.runId)) return state;
      // The prior result stays visible so a failed attempt never discards work.
      return { ...state, status: "error", activeRunId: null, error: action.error };
    case "enhancement-cancelled":
      if (!isRunActive(state, action.runId)) return state;
      return { ...state, status: "idle", activeRunId: null, error: null };
    case "document-restored":
      return { ...state, document: action.document, status: "idle", view: "preview", error: null };
    case "input-error":
      return {
        ...state,
        status: state.status === "running" ? state.status : "error",
        error: {
          message: action.message,
          retryable: false,
          fallbackEligible: action.fallbackEligible ?? false,
        },
      };
    case "history-saved":
      return state.document?.runId === action.runId
        ? { ...state, document: { ...state.document, historyId: action.historyId } }
        : state;
    case "library-saved":
      return state.document?.runId === action.runId
        ? { ...state, document: { ...state.document, libraryPromptId: action.libraryPromptId, dirty: false } }
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
  result: EnhancementResultV1,
): WorkspaceDocument {
  return {
    runId,
    originalPrompt,
    controls,
    analysis: result.analysis,
    classification: result.classification,
    resolved: {
      presetId: result.resolved.presetId ?? controls.presetId,
      taskType: result.resolved.taskType,
      category: result.resolved.category,
      level: result.resolved.level,
      sections: result.resolved.sections,
    },
    generation: result.generation,
    generatedMarkdown: result.markdown,
    markdown: result.markdown,
    historyId: null,
    libraryPromptId: null,
    dirty: false,
    stale: false,
  };
}
