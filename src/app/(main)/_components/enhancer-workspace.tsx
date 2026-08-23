"use client";

import { useEffect, useReducer, useRef, useState } from "react";

import { toast } from "sonner";

import { useConfirm } from "@/hooks/use-confirm";
import { createAiEnhancementClient, type EnhancementService } from "@/lib/ai-enhancement/client";
import { ENHANCEMENT_API_VERSION } from "@/lib/ai-enhancement/contracts";
import { createDeterministicEnhancementService } from "@/lib/ai-enhancement/deterministic-service";
import { copyText, requestTextDownload } from "@/lib/browser-actions.client";
import { titleFromPrompt } from "@/lib/browser-memory/record-utils";
import type { HistoryRecord, SavedPrompt } from "@/lib/browser-memory/types";
import { DEFAULT_ENHANCEMENT_LEVEL, DEFAULT_PROMPT_SECTIONS } from "@/lib/preferences/prompt-preferences";
import { getPromptPreset } from "@/lib/prompt-presets";
import { enhancePrompt, validatePrompt } from "@/prompt-engine";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import {
  describeCode,
  describeError,
  enhancementErrorCode,
  HOURLY_LIMIT_MESSAGE,
  isHourlyLimitReached,
} from "./enhancement-errors";
import { useMemory } from "./memory-provider";
import { PromptInputPanel } from "./prompt-input-panel";
import { ResultPanel } from "./result-panel";
import { createWorkspaceState, documentFromEnhancement, workspaceReducer } from "./workspace-state";

// Production/static builds take the configured public endpoint. In local
// development the same-origin Route Handler serves the enhancement API.
const ENDPOINT =
  process.env.NEXT_PUBLIC_ENHANCEMENT_API_URL || (process.env.NODE_ENV === "development" ? "/api/enhance" : null);

export function EnhancerWorkspace() {
  const defaultLevel = usePreferencesStore((state) => state.defaultEnhancementLevel);
  const defaultSections = usePreferencesStore((state) => state.defaultPromptSections);
  const defaultPromptType = usePreferencesStore((state) => state.defaultPromptType);
  const historyMaxEntries = usePreferencesStore((state) => state.historyMaxEntries);
  const preferencesSynced = usePreferencesStore((state) => state.isSynced);
  const { status: memoryStatus, repository } = useMemory();
  const { confirm, dialog } = useConfirm();
  const [historyPending, setHistoryPending] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [fallbackPending, setFallbackPending] = useState(false);
  const preferencesApplied = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const aiService = useRef<EnhancementService | null>(null);
  aiService.current ??= ENDPOINT
    ? createAiEnhancementClient({ endpoint: ENDPOINT, allowLocalHttpForTests: process.env.NODE_ENV !== "production" })
    : null;
  const localService = useRef<EnhancementService | null>(null);
  localService.current ??= createDeterministicEnhancementService();
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
    return () => abortRef.current?.abort();
  }, []);

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
          toast.warning("That saved prompt is no longer available.");
          return;
        }
        const controls = {
          taskType: saved.requestedTaskType,
          level: saved.level,
          sections: saved.sectionIds,
          presetId: saved.presetId,
        } as const;
        // Restored records keep their stored Markdown and provenance; the pure
        // engine only supplies display metadata and never contacts any provider.
        const engineResult = enhancePrompt(saved.originalPrompt, {
          level: saved.level,
          taskType: saved.requestedTaskType === "auto" ? undefined : saved.requestedTaskType,
          sections: saved.sectionIds,
        });
        const isLibraryPrompt = "favorite" in saved;
        const libraryPrompt = saved as SavedPrompt;
        const historyRecord = saved as HistoryRecord;
        const document = {
          runId: crypto.randomUUID(),
          originalPrompt: saved.originalPrompt,
          controls,
          analysis: engineResult.analysis,
          classification: engineResult.classification,
          resolved: {
            presetId: saved.presetId,
            taskType: saved.taskType,
            category: saved.category,
            level: saved.level,
            sections: saved.sectionIds,
          },
          generation: saved.generation ?? ({ kind: "deterministic" } as const),
          generatedMarkdown: saved.enhancedPrompt,
          markdown: saved.enhancedPrompt,
          historyId: isLibraryPrompt ? libraryPrompt.sourceHistoryId : historyRecord.id,
          libraryPromptId: isLibraryPrompt ? libraryPrompt.id : null,
          dirty: false,
          stale: false,
        };
        dispatch({ type: "prompt-changed", prompt: saved.originalPrompt });
        dispatch({ type: "controls-changed", controls });
        dispatch({ type: "document-restored", document });
      } catch {
        toast.error("That saved prompt could not be opened.");
      } finally {
        window.history.replaceState(null, "", window.location.pathname);
      }
    };
    void restore();
  }, [memoryStatus, repository]);

  const buildSelection = () =>
    state.controls.presetId
      ? ({ kind: "preset", presetId: state.controls.presetId } as const)
      : ({ kind: "manual", taskType: state.controls.taskType } as const);

  // Every successful enhancement is recorded in local history, capped by the
  // configured maximum-entries preference.
  const saveToHistory = async (runId: string, record: HistoryRecord) => {
    if (memoryStatus !== "ready") {
      toast.warning("Enhancement complete. Local memory is unavailable.");
      return;
    }
    setHistoryPending(true);
    try {
      await repository.addHistoryAndPrune(record, historyMaxEntries);
      dispatch({ type: "history-saved", runId, historyId: record.id });
      toast.success("Added to local history.");
    } catch {
      toast.error("Enhancement complete, but it was not added to local history.");
    } finally {
      setHistoryPending(false);
    }
  };

  const runEnhancement = async (service: EnhancementService) => {
    const validation = validatePrompt(state.prompt);
    if (!validation.ok) {
      dispatch({ type: "input-error", message: validation.message });
      return;
    }
    if (
      state.document?.dirty &&
      !(await confirm({
        title: "Replace your unsaved edits?",
        description: "A new enhancement will replace your current edits.",
        confirmLabel: "Replace",
      }))
    )
      return;

    const runId = crypto.randomUUID();
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: "enhancement-started", runId });

    try {
      const response = await service.enhance(
        {
          version: ENHANCEMENT_API_VERSION,
          prompt: state.prompt,
          selection: buildSelection(),
          level: state.controls.level,
          sections: state.controls.sections,
        },
        { signal: controller.signal },
      );
      const document = documentFromEnhancement(runId, state.prompt, state.controls, response.result);
      dispatch({ type: "enhancement-succeeded", runId, document });

      const record: HistoryRecord = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        originalPrompt: document.originalPrompt,
        enhancedPrompt: document.generatedMarkdown,
        requestedTaskType: document.controls.taskType,
        taskType: document.resolved.taskType,
        category: document.resolved.category,
        level: document.resolved.level,
        sectionIds: [...document.resolved.sections],
        presetId: document.resolved.presetId ?? document.controls.presetId,
        generation: document.generation,
      };
      await saveToHistory(runId, record);
    } catch (error) {
      if (controller.signal.aborted) {
        dispatch({ type: "enhancement-cancelled", runId });
        toast.warning("Enhancement canceled. Your previous result was kept.");
        return;
      }
      const described = describeError(error);
      dispatch({ type: "enhancement-failed", runId, error: described });
      // Exhausting the hourly allowance is an expected situation, not a
      // failure of the user's prompt: surface it as a friendly notice while
      // the canvas still offers retry and the local-rules fallback.
      if (isHourlyLimitReached(enhancementErrorCode(error))) toast.warning(HOURLY_LIMIT_MESSAGE);
      else toast.error(described.message);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const enhance = () => {
    const service = aiService.current;
    if (service === null) {
      dispatch({ type: "input-error", message: describeCode("service_disabled"), fallbackEligible: true });
      return;
    }
    void runEnhancement(service);
  };

  const cancel = () => {
    abortRef.current?.abort();
  };

  const retry = () => {
    enhance();
  };

  const useLocalRules = () => {
    const service = localService.current;
    if (service === null || fallbackPending) return;
    setFallbackPending(true);
    void runEnhancement(service).finally(() => setFallbackPending(false));
  };

  const onControlsChange = (controls: typeof state.controls) => {
    dispatch({ type: "controls-changed", controls });
  };

  const save = async () => {
    const document = state.document;
    if (!document || memoryStatus !== "ready") {
      toast.warning("Local memory is unavailable. Your result remains available in this session.");
      return;
    }
    setSavePending(true);
    try {
      let id = document.libraryPromptId;
      if (id) {
        await repository.updatePrompt(id, { enhancedPrompt: document.markdown, updatedAt: Date.now() });
        toast.success("Library prompt updated.");
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
          presetId: document.resolved.presetId ?? document.controls.presetId,
          favorite: false,
          folderId: null,
          tags: [],
          generation: document.generation,
        };
        await repository.createPrompt(prompt);
      }
      dispatch({ type: "library-saved", runId: document.runId, libraryPromptId: id });
      toast.success("Saved to your local library.");
    } catch {
      toast.error("The prompt was not saved. Your current edits remain available.");
    } finally {
      setSavePending(false);
    }
  };

  const copy = async () => {
    if (!state.document) return;
    try {
      await copyText(state.document.markdown);
      toast.success("Markdown copied.");
    } catch {
      toast.error("Clipboard access failed. Select the Markdown and copy it manually.");
    }
  };

  const exportMarkdown = () => {
    if (!state.document) return;
    requestTextDownload("enhanced-prompt.md", state.document.markdown, "text/markdown;charset=utf-8");
    toast.success("Download requested.");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-6 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
        <PromptInputPanel
          prompt={state.prompt}
          controls={state.controls}
          error={state.error !== null && !state.error.fallbackEligible ? state.error.message : null}
          promptLength={state.prompt.length}
          stale={state.document?.stale ?? false}
          running={state.status === "running"}
          dispatch={(action) => {
            if (action.type === "controls-changed") onControlsChange(action.controls);
            else dispatch(action);
          }}
          onEnhance={enhance}
          onCancel={cancel}
        />
        <ResultPanel
          state={state}
          onViewChange={(view) => dispatch({ type: "view-changed", view })}
          onMarkdownChange={(markdown) => dispatch({ type: "markdown-changed", markdown })}
          onCopy={copy}
          onExport={exportMarkdown}
          onSave={save}
          saveDisabled={savePending || historyPending || memoryStatus !== "ready"}
          saving={savePending}
          onRetry={retry}
          onUseLocalRules={useLocalRules}
          fallbackPending={fallbackPending}
        />
      </div>
      {dialog}
    </div>
  );
}
