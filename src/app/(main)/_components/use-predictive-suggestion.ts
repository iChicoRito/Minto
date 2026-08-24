"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  MAX_PREDICTIVE_INPUT_CHARACTERS,
  MIN_AI_PREDICTION_INPUT_CHARACTERS,
  PREDICTIVE_TEXT_API_VERSION,
  PREDICTIVE_TEXT_REQUEST_KIND,
  type PredictiveHistoryEntry,
  type PredictiveTextService,
} from "@/lib/predictive-text/contracts";
import { findHistorySuggestion } from "@/lib/predictive-text/history-ranker";

export type PredictiveSuggestion = { source: "history"; completion: string } | { source: "ai"; completion: string };

type AiState = { input: string; completion: string };

export function usePredictiveSuggestion(options: {
  input: string;
  eligible: boolean;
  history: readonly PredictiveHistoryEntry[];
  historyResolved: boolean;
  service: PredictiveTextService | null;
}): {
  suggestion: PredictiveSuggestion | null;
  pending: boolean;
  dismiss: () => void;
} {
  const { input, eligible, history, historyResolved, service } = options;
  const localSuggestion = useMemo(() => findHistorySuggestion(input, history, Date.now()), [history, input]);
  const [aiState, setAiState] = useState<AiState | null>(null);
  const [pending, setPending] = useState(false);
  const [dismissedInput, setDismissedInput] = useState<string | null>(null);
  const cacheRef = useRef(new Map<string, string | null>());
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const mountedRef = useRef({ value: true as boolean });
  const currentInputRef = useRef(input);
  currentInputRef.current = input;

  const dismissed = dismissedInput === input;
  const visibleAi = aiState?.input === input ? aiState : null;

  useEffect(() => {
    mountedRef.current.value = true;
    return () => {
      mountedRef.current.value = false;
      generationRef.current += 1;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    generationRef.current += 1;
    const generation = generationRef.current;
    abortRef.current?.abort();
    abortRef.current = null;

    setAiState((current) => (current !== null && current.input !== input ? null : current));
    setPending(false);

    const canUseAi =
      eligible &&
      historyResolved &&
      localSuggestion === null &&
      service !== null &&
      input.length >= MIN_AI_PREDICTION_INPUT_CHARACTERS &&
      input.length <= MAX_PREDICTIVE_INPUT_CHARACTERS &&
      !dismissed;
    if (!canUseAi) return;

    const cached = cacheRef.current.get(input);
    if (cacheRef.current.has(input)) {
      setAiState(cached === null || cached === undefined ? null : { input, completion: cached });
      return;
    }

    setPending(true);
    const timer = window.setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      void service
        .complete(
          { kind: PREDICTIVE_TEXT_REQUEST_KIND, version: PREDICTIVE_TEXT_API_VERSION, input },
          { signal: controller.signal },
        )
        .then(
          (response) => {
            if (
              !mountedRef.current.value ||
              controller.signal.aborted ||
              generationRef.current !== generation ||
              currentInputRef.current !== input
            ) {
              return;
            }
            setPending(false);
            cacheResult(cacheRef.current, input, response.completion);
            setAiState({ input, completion: response.completion });
          },
          () => {
            if (
              !mountedRef.current.value ||
              controller.signal.aborted ||
              generationRef.current !== generation ||
              currentInputRef.current !== input
            ) {
              return;
            }
            setPending(false);
            cacheResult(cacheRef.current, input, null);
            setAiState(null);
          },
        );
    }, 600);

    return () => window.clearTimeout(timer);
  }, [dismissed, eligible, historyResolved, input, localSuggestion, service]);

  const dismiss = useCallback(() => {
    generationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setPending(false);
    setDismissedInput(input);
    setAiState(null);
  }, [input]);

  if (!eligible || dismissed) return { suggestion: null, pending: false, dismiss };
  if (localSuggestion !== null) {
    return { suggestion: { source: "history", completion: localSuggestion.completion }, pending: false, dismiss };
  }
  if (visibleAi !== null)
    return { suggestion: { source: "ai", completion: visibleAi.completion }, pending: false, dismiss };
  return { suggestion: null, pending, dismiss };
}

function cacheResult(cache: Map<string, string | null>, input: string, completion: string | null): void {
  if (cache.has(input)) cache.delete(input);
  cache.set(input, completion);
  while (cache.size > 20) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) return;
    cache.delete(oldest);
  }
}
