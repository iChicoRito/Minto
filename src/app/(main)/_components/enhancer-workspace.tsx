"use client";

import { useEffect, useReducer, useRef, useState } from "react";

import { copyText, requestTextDownload } from "@/lib/browser-actions.client";
import { titleFromPrompt } from "@/lib/browser-memory/record-utils";
import type { HistoryRecord, SavedPrompt } from "@/lib/browser-memory/types";
import { persistPreference } from "@/lib/preferences/preferences-storage";
import { DEFAULT_ENHANCEMENT_LEVEL, DEFAULT_PROMPT_SECTIONS } from "@/lib/preferences/prompt-preferences";
import { getPromptPreset } from "@/lib/prompt-presets";
import { enhancePrompt, validatePrompt } from "@/prompt-engine";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { useMemory } from "./memory-provider";
import { PromptInputPanel } from "./prompt-input-panel";
import { ResultPanel } from "./result-panel";
import { createWorkspaceState, documentFromEnhancement, workspaceReducer } from "./workspace-state";

export function EnhancerWorkspace() {
  const defaultLevel = usePreferencesStore((state) => state.defaultEnhancementLevel);
  const defaultSections = usePreferencesStore((state) => state.defaultPromptSections);
  const defaultPromptType = usePreferencesStore((state) => state.defaultPromptType);
  const historyMaxEntries = usePreferencesStore((state) => state.historyMaxEntries);
  const preferencesSynced = usePreferencesStore((state) => state.isSynced);
  const historyEnabled = usePreferencesStore((state) => state.historyEnabled);
  const setHistoryEnabled = usePreferencesStore((state) => state.setHistoryEnabled);
  const { status: memoryStatus, repository } = useMemory();
  const [historyPending, setHistoryPending] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const preferencesApplied = useRef(false);
  const [state, dispatch] = useReducer(
    workspaceReducer,
    {
      taskType: defaultPromptType,
      level: defaultLevel ?? DEFAULT_ENHANCEMENT_LEVEL,
      sections: defaultSections.length > 0 ? defaultSections : DEFAULT_PROMPT_SECTIONS,
      presetId: null,
    },
    createWorkspaceState,
  );

  useEffect(() => {
    if (!preferencesSynced || preferencesApplied.current) return;
    preferencesApplied.current = true;
    dispatch({
      type: "controls-changed",
      controls: {
        ...state.controls,
        taskType: defaultPromptType,
        level: defaultLevel ?? DEFAULT_ENHANCEMENT_LEVEL,
        sections: defaultSections.length > 0 ? defaultSections : DEFAULT_PROMPT_SECTIONS,
        presetId: null,
      },
    });
  }, [defaultLevel, defaultPromptType, defaultSections, preferencesSynced, state.controls]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preset = params.get("preset");
    if (!preset) return;
    const selected = getPromptPreset(preset);
    if (selected) {
      dispatch({
        type: "controls-changed",
        controls: {
          taskType: selected.taskType,
          level: selected.level,
          sections: selected.sections,
          presetId: selected.id,
        },
      });
    } else {
      dispatch({ type: "action-message", message: "That preset is not available." });
    }
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  useEffect(() => {
    if (memoryStatus !== "ready") return;
    const params = new URLSearchParams(window.location.search);
    const historyId = params.get("history");
    const libraryId = params.get("library");
    if (!historyId && !libraryId) return;

    const restore = async () => {
      try {
        const saved = historyId
          ? await repository.getHistory(historyId)
          : await repository.getPrompt(libraryId as string);
        if (!saved) {
          dispatch({ type: "action-message", message: "That saved prompt is no longer available." });
          return;
        }
        const controls = {
          taskType: saved.requestedTaskType,
          level: saved.level,
          sections: saved.sectionIds,
          presetId: saved.presetId,
        } as const;
        const result = enhancePrompt(saved.originalPrompt, {
          level: saved.level,
          taskType: saved.requestedTaskType === "auto" ? undefined : saved.requestedTaskType,
          sections: saved.sectionIds,
        });
        const isLibraryPrompt = "favorite" in saved;
        const libraryPrompt = saved as SavedPrompt;
        const historyRecord = saved as HistoryRecord;
        const document = {
          ...documentFromEnhancement(crypto.randomUUID(), saved.originalPrompt, controls, result),
          generatedMarkdown: saved.enhancedPrompt,
          markdown: saved.enhancedPrompt,
          historyId: isLibraryPrompt ? libraryPrompt.sourceHistoryId : historyRecord.id,
          libraryPromptId: isLibraryPrompt ? libraryPrompt.id : null,
          resolved: {
            taskType: saved.taskType,
            category: saved.category,
            level: saved.level,
            sections: saved.sectionIds,
          },
        };
        dispatch({ type: "prompt-changed", prompt: saved.originalPrompt });
        dispatch({ type: "controls-changed", controls });
        dispatch({ type: "enhancement-succeeded", document });
      } catch {
        dispatch({ type: "action-message", message: "That saved prompt could not be opened." });
      } finally {
        window.history.replaceState(null, "", window.location.pathname);
      }
    };
    void restore();
  }, [memoryStatus, repository]);

  const onControlsChange = (controls: typeof state.controls) => {
    dispatch({ type: "controls-changed", controls });
  };

  const enhance = async () => {
    const validation = validatePrompt(state.prompt);
    if (!validation.ok) {
      dispatch({ type: "enhancement-failed", message: validation.message });
      return;
    }
    if (state.document?.dirty && !window.confirm("Replace your unsaved edits with a new enhancement?")) return;
    dispatch({ type: "enhancement-started" });
    try {
      const result = enhancePrompt(state.prompt, {
        level: state.controls.level,
        taskType: state.controls.taskType === "auto" ? undefined : state.controls.taskType,
        sections: state.controls.sections,
      });
      const document = documentFromEnhancement(crypto.randomUUID(), state.prompt, state.controls, result);
      dispatch({
        type: "enhancement-succeeded",
        document,
      });

      if (historyEnabled && memoryStatus === "ready") {
        const historyId = crypto.randomUUID();
        const record: HistoryRecord = {
          id: historyId,
          createdAt: Date.now(),
          originalPrompt: document.originalPrompt,
          enhancedPrompt: document.generatedMarkdown,
          requestedTaskType: document.controls.taskType,
          taskType: document.resolved.taskType,
          category: document.resolved.category,
          level: document.resolved.level,
          sectionIds: [...document.resolved.sections],
          presetId: document.controls.presetId,
        };
        setHistoryPending(true);
        try {
          await repository.addHistoryAndPrune(record, historyMaxEntries);
          dispatch({ type: "history-saved", runId: document.runId, historyId });
        } catch {
          dispatch({ type: "action-message", message: "Enhancement complete, but it was not added to local history." });
        } finally {
          setHistoryPending(false);
        }
      } else if (historyEnabled) {
        dispatch({ type: "action-message", message: "Enhancement complete. Local memory is unavailable." });
      }
    } catch {
      dispatch({ type: "enhancement-failed", message: "The prompt could not be enhanced. Please try again." });
    }
  };

  const save = async () => {
    const document = state.document;
    if (!document || memoryStatus !== "ready") {
      dispatch({
        type: "action-message",
        message: "Local memory is unavailable. Your result remains available in this session.",
      });
      return;
    }
    setSavePending(true);
    try {
      let id = document.libraryPromptId;
      if (id) {
        await repository.updatePrompt(id, { enhancedPrompt: document.markdown, updatedAt: Date.now() });
      } else {
        id = crypto.randomUUID();
        const now = Date.now();
        const prompt: SavedPrompt = {
          id,
          sourceHistoryId: document.historyId,
          createdAt: now,
          updatedAt: now,
          title: titleFromPrompt(document.originalPrompt),
          originalPrompt: document.originalPrompt,
          enhancedPrompt: document.markdown,
          requestedTaskType: document.controls.taskType,
          taskType: document.resolved.taskType,
          category: document.resolved.category,
          level: document.resolved.level,
          sectionIds: [...document.resolved.sections],
          presetId: document.controls.presetId,
          favorite: false,
          folderId: null,
          tags: [],
        };
        await repository.createPrompt(prompt);
      }
      dispatch({ type: "library-saved", runId: document.runId, libraryPromptId: id });
    } catch {
      dispatch({ type: "action-message", message: "The prompt was not saved. Your current edits remain available." });
    } finally {
      setSavePending(false);
    }
  };

  const copy = async () => {
    if (!state.document) return;
    try {
      await copyText(state.document.markdown);
      dispatch({ type: "action-message", message: "Markdown copied." });
    } catch {
      dispatch({
        type: "action-message",
        message: "Clipboard access failed. Select the Markdown and copy it manually.",
      });
    }
  };

  const exportMarkdown = () => {
    if (!state.document) return;
    requestTextDownload("enhanced-prompt.md", state.document.markdown, "text/markdown;charset=utf-8");
    dispatch({ type: "action-message", message: "Download requested." });
  };

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
        <input
          type="checkbox"
          checked={historyEnabled}
          onChange={(event) => {
            const enabled = event.target.checked;
            setHistoryEnabled(enabled);
            void persistPreference("history_enabled", enabled ? "true" : "false");
          }}
        />
        <span>
          <span className="block font-medium">Keep successful enhancements in local history</span>
          <span className="text-muted-foreground">Stored only in this browser. It is not encrypted or synced.</span>
        </span>
      </label>
      <div className="grid gap-6 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
        <PromptInputPanel
          prompt={state.prompt}
          controls={state.controls}
          error={state.error}
          promptLength={state.prompt.length}
          stale={state.document?.stale ?? false}
          disabled={state.status === "running"}
          dispatch={(action) => {
            if (action.type === "controls-changed") onControlsChange(action.controls);
            else dispatch(action);
          }}
          onEnhance={enhance}
        />
        <ResultPanel
          state={state}
          onViewChange={(view) => dispatch({ type: "view-changed", view })}
          onMarkdownChange={(markdown) => dispatch({ type: "markdown-changed", markdown })}
          onCopy={copy}
          onExport={exportMarkdown}
          onSave={save}
          saveDisabled={savePending || historyPending || memoryStatus !== "ready"}
        />
      </div>
    </div>
  );
}
