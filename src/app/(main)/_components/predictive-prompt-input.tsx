"use client";

import { type KeyboardEvent, type SyntheticEvent, useCallback, useEffect, useRef, useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import type { PredictiveHistoryEntry, PredictiveTextService } from "@/lib/predictive-text/contracts";

import { PredictionPendingIndicator } from "./prediction-pending-indicator";
import { usePredictiveSuggestion } from "./use-predictive-suggestion";

export type PredictivePromptInputProps = {
  id: string;
  value: string;
  disabled: boolean;
  history: readonly PredictiveHistoryEntry[];
  historyResolved: boolean;
  predictionService: PredictiveTextService | null;
  predictiveEnabled: boolean;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
};

const TEXTAREA_CLASS_NAME =
  "max-h-64 min-h-28 resize-none border-0 bg-transparent px-1 py-1 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 md:text-base dark:bg-transparent";

export function PredictivePromptInput({
  id,
  value,
  disabled,
  history,
  historyResolved,
  predictionService,
  predictiveEnabled,
  onValueChange,
  onSubmit,
}: PredictivePromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = useState(false);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [composing, setComposing] = useState(false);
  const [mirrorWidth, setMirrorWidth] = useState<number | null>(null);
  const helpId = `${id}-prediction-help`;
  const statusId = `${id}-prediction-status`;

  const refreshSelection = useCallback(() => {
    const textarea = textareaRef.current as HTMLTextAreaElement | null;
    if (!textarea) return;
    const nextStart = textarea.selectionStart ?? 0;
    const nextEnd = textarea.selectionEnd ?? 0;
    setSelectionStart(nextStart);
    setSelectionEnd(nextEnd);
  }, []);

  const eligible =
    focused &&
    !disabled &&
    !composing &&
    selectionStart === selectionEnd &&
    selectionStart === value.length &&
    selectionEnd === value.length;
  const { suggestion, pending, dismiss } = usePredictiveSuggestion({
    input: value,
    eligible: eligible && predictiveEnabled,
    history,
    historyResolved,
    service: predictionService,
  });

  useEffect(() => {
    const textarea = textareaRef.current as HTMLTextAreaElement | null;
    if (!textarea) return;
    const updateWidth = () => setMirrorWidth(textarea.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(textarea);
    window.addEventListener("resize", updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  useEffect(() => {
    if (!focused) return;
    const frame = window.requestAnimationFrame(() => {
      if (textareaRef.current?.value === value) refreshSelection();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focused, refreshSelection, value]);

  const syncScroll = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    const mirror = mirrorRef.current as HTMLDivElement | null;
    if (!mirror) return;
    const textarea = event.currentTarget;
    mirror.scrollTop = textarea.scrollTop;
    mirror.scrollLeft = textarea.scrollLeft;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (composing || event.nativeEvent.isComposing) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
      return;
    }
    if (event.key === "Escape" && (suggestion !== null || pending)) {
      event.preventDefault();
      dismiss();
      return;
    }
    if (
      event.key === "Tab" &&
      !event.shiftKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      suggestion !== null
    ) {
      event.preventDefault();
      const nextValue = value + suggestion.completion;
      onValueChange(nextValue);
      window.requestAnimationFrame(() => {
        const textarea = textareaRef.current as HTMLTextAreaElement | null;
        if (!textarea) return;
        textarea.focus();
        textarea.setSelectionRange(nextValue.length, nextValue.length);
        refreshSelection();
      });
    }
  };

  const suggestionAvailable = suggestion !== null;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="sr-only">
        Prompt to enhance
      </label>
      <div className="relative overflow-hidden">
        <div
          ref={mirrorRef}
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 overflow-hidden ${TEXTAREA_CLASS_NAME} whitespace-pre-wrap break-words`}
          style={mirrorWidth === null ? undefined : { width: mirrorWidth }}
        >
          <span className="text-transparent">{value}</span>
          {suggestion !== null && (
            <>
              <span className="text-muted-foreground/30">{suggestion.completion}</span>
              <kbd className="ml-1 rounded border border-lime-500/30 bg-lime-500/10 px-1 py-0.5 align-middle font-mono text-[10px] text-lime-700 dark:border-lime-400/30 dark:bg-lime-400/10 dark:text-lime-300">
                Tab
              </kbd>
            </>
          )}
        </div>
        <Textarea
          ref={textareaRef}
          id={id}
          placeholder="Paste your rough prompt here to enhance..."
          className={`${TEXTAREA_CLASS_NAME} relative z-10`}
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value);
            setSelectionStart(event.target.selectionStart ?? 0);
            setSelectionEnd(event.target.selectionEnd ?? 0);
          }}
          onFocus={() => {
            setFocused(true);
            refreshSelection();
          }}
          onBlur={() => setFocused(false)}
          onSelect={() => refreshSelection()}
          onClick={() => refreshSelection()}
          onKeyUp={() => refreshSelection()}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => {
            setComposing(false);
            refreshSelection();
          }}
          onScroll={syncScroll}
          disabled={disabled}
          aria-autocomplete="inline"
          aria-keyshortcuts={suggestionAvailable ? "Enter Tab" : "Enter"}
          aria-describedby={`${helpId} ${statusId}`}
        />
      </div>
      <PredictionPendingIndicator pending={pending} />
      <p id={helpId} className="sr-only">
        Press Enter to submit. Press Shift+Enter to add a new line. Press Tab to accept an inline suggestion.
      </p>
      <p id={statusId} aria-live="polite" className="sr-only">
        {suggestionAvailable ? "Prediction available. Press Tab to accept, or Escape to dismiss." : ""}
      </p>
    </div>
  );
}
