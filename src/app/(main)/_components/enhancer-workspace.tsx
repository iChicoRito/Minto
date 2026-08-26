"use client";

import { useEffect, useReducer, useRef, useState } from "react";

import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";

import { markdownToPlainText } from "@/components/markdown/markdown-to-plain-text";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirm } from "@/hooks/use-confirm";
import { createAiEnhancementClient, type EnhancementService } from "@/lib/ai-enhancement/client";
import { ENHANCEMENT_API_VERSION } from "@/lib/ai-enhancement/contracts";
import { createDeterministicEnhancementService } from "@/lib/ai-enhancement/deterministic-service";
import { copyText, requestTextDownload } from "@/lib/browser-actions.client";
import { titleFromPrompt } from "@/lib/browser-memory/record-utils";
import type { HistoryRecord, SavedPrompt } from "@/lib/browser-memory/types";
import { createPredictiveTextClient } from "@/lib/predictive-text/client";
import type { PredictiveTextService } from "@/lib/predictive-text/contracts";
import { DEFAULT_ENHANCEMENT_LEVEL, DEFAULT_PROMPT_SECTIONS } from "@/lib/preferences/prompt-preferences";
import { getPromptPreset } from "@/lib/prompt-presets";
import { enhancePrompt, validatePrompt } from "@/prompt-engine";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { describeCode, describeError } from "./enhancement-errors";
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
  const historyEnabled = usePreferencesStore((state) => state.historyEnabled);
  const historyMaxEntries = usePreferencesStore((state) => state.historyMaxEntries);
  const preferencesSynced = usePreferencesStore((state) => state.isSynced);
  const { status: memoryStatus, repository } = useMemory();
  const { confirm, dialog } = useConfirm();
  const [historyPending, setHistoryPending] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [fallbackPending] = useState(false);
  const [activeTab, setActiveTab] = useState<"enhance" | "result">("enhance");
  const preferencesApplied = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const aiService = useRef<EnhancementService | null>(null);
  aiService.current ??= ENDPOINT
    ? createAiEnhancementClient({ endpoint: ENDPOINT, allowLocalHttpForTests: process.env.NODE_ENV !== "production" })
    : null;
  const localService = useRef<EnhancementService | null>(null);
  localService.current ??= createDeterministicEnhancementService();
  const predictionService = useRef<PredictiveTextService | null>(null);
  predictionService.current ??= ENDPOINT
    ? createPredictiveTextClient({
        endpoint: ENDPOINT,
        allowLocalHttpForTests: process.env.NODE_ENV !== "production",
      })
    : null;
  const historyRecords = useLiveQuery(
    () => (memoryStatus === "ready" ? repository.listHistory() : Promise.resolve([])),
    [memoryStatus, repository],
  );
  const history = historyRecords ?? [];
  const historyResolved = memoryStatus === "unavailable" || (memoryStatus === "ready" && historyRecords !== undefined);
  const [state, dispatch] = useReducer(
    workspaceReducer,
    {
      taskType: "auto",
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
        taskType: "auto",
        level: defaultLevel ?? DEFAULT_ENHANCEMENT_LEVEL,
        sections: defaultSections.length > 0 ? defaultSections : DEFAULT_PROMPT_SECTIONS,
        presetId: null,
      },
    });
  }, [defaultLevel, defaultSections, preferencesSynced, state.controls]);

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
    if (!historyEnabled) return;
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

  const runEnhancement = async (service: EnhancementService, promptOverride?: string) => {
    const effectivePrompt = promptOverride ?? state.prompt;
    const validation = validatePrompt(effectivePrompt);
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
          prompt: effectivePrompt,
          selection: buildSelection(),
          level: state.controls.level,
          sections: state.controls.sections,
        },
        { signal: controller.signal },
      );
      const document = documentFromEnhancement(runId, effectivePrompt, state.controls, response.result);
      dispatch({ type: "enhancement-succeeded", runId, document });
      setActiveTab("result");
      // Clear the enhance input after success so the field is fresh for next prompt.
      // Keep editing only in Result tab (markdown). Prompt input is cleared.
      dispatch({ type: "prompt-changed", prompt: "" });

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
      toast.error(described.message);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const enhance = () => {
    const service = aiService.current;
    if (service === null) {
      dispatch({ type: "input-error", message: describeCode("service_disabled"), fallbackEligible: false });
      toast.error("AI enhancement is unavailable. Please check your connection and try again.");
      return;
    }
    void runEnhancement(service);
  };

  const reEnhance = () => {
    if (!state.document) return;
    // Re-enhance from Result tab without requiring a return to Enhance.
    // Use the current Enhance input if user typed something new, otherwise
    // fall back to the last result's source (edited markdown if dirty).
    const source =
      state.prompt.trim().length > 0
        ? state.prompt
        : state.document.dirty
          ? state.document.markdown
          : state.document.originalPrompt;
    const service = aiService.current;
    if (service === null) {
      dispatch({ type: "input-error", message: describeCode("service_disabled"), fallbackEligible: false });
      toast.error("AI enhancement is unavailable. Please check your connection and try again.");
      return;
    }
    // Ensure the prompt state reflects the source for validation/history
    if (state.prompt.trim() === "") {
      dispatch({ type: "prompt-changed", prompt: source });
    }
    void runEnhancement(service, source);
  };

  const cancel = () => {
    abortRef.current?.abort();
  };

  const retry = () => {
    enhance();
  };

  const useLocalRules = () => {
    // Local Rules are disabled per user request — show feedback instead of fallback
    toast.error("Local rules are disabled. AI enhancement is required. Please try again.");
    dispatch({
      type: "input-error",
      message: "Local rules are disabled. Please retry with AI.",
      fallbackEligible: false,
    });
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

  const copyMarkdown = async () => {
    if (!state.document) return;
    try {
      await copyText(state.document.markdown);
      toast.success("Markdown copied.");
    } catch {
      toast.error("Clipboard access failed. Select the Markdown and copy it manually.");
    }
  };

  const copyPlainText = async () => {
    if (!state.document) return;
    try {
      await copyText(markdownToPlainText(state.document.markdown));
      toast.success("Plain text copied.");
    } catch {
      toast.error("Clipboard access failed. Select the text and copy it manually.");
    }
  };

  const exportMarkdown = () => {
    if (!state.document) return;
    requestTextDownload("enhanced-prompt.md", state.document.markdown, "text/markdown;charset=utf-8");
    toast.success("Download requested.");
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "enhance" | "result")} className="w-full">
        <TabsList className="mx-auto grid w-fit grid-cols-2 rounded-full bg-muted p-1">
          <TabsTrigger value="enhance" className="rounded-full px-6 data-active:bg-background data-active:shadow-sm">
            Enhance
          </TabsTrigger>
          <TabsTrigger value="result" className="rounded-full px-6 data-active:bg-background data-active:shadow-sm">
            Result
          </TabsTrigger>
        </TabsList>
        <TabsContent value="enhance" className="mx-auto w-full max-w-3xl pt-4">
          <PromptInputPanel
            prompt={state.prompt}
            controls={state.controls}
            error={state.error !== null && !state.error.fallbackEligible ? state.error.message : null}
            promptLength={state.prompt.length}
            stale={state.document?.stale ?? false}
            running={state.status === "running"}
            history={history}
            historyResolved={historyResolved}
            predictionService={predictionService.current}
            dispatch={(action) => {
              if (action.type === "controls-changed") onControlsChange(action.controls);
              else dispatch(action);
            }}
            onEnhance={enhance}
            onCancel={cancel}
          />
        </TabsContent>
        <TabsContent value="result" className="w-full pt-4">
          <ResultPanel
            state={state}
            onViewChange={(view) => dispatch({ type: "view-changed", view })}
            onMarkdownChange={(markdown) => dispatch({ type: "markdown-changed", markdown })}
            onCopyMarkdown={copyMarkdown}
            onCopyPlainText={copyPlainText}
            onExport={exportMarkdown}
            onSave={save}
            saveDisabled={savePending || historyPending || memoryStatus !== "ready"}
            saving={savePending}
            onRetry={retry}
            onUseLocalRules={useLocalRules}
            fallbackPending={fallbackPending}
            onReEnhance={reEnhance}
          />
        </TabsContent>
      </Tabs>
      {dialog}
    </div>
  );
}
