"use client";

import { type Dispatch, useEffect, useState } from "react";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { PredictiveHistoryEntry, PredictiveTextService } from "@/lib/predictive-text/contracts";
import type { PromptPreset } from "@/lib/prompt-presets";
import { SECTION_TITLES, type SectionId } from "@/prompt-engine/templates/template-types";
import type { EnhancementLevel, PromptTaskType } from "@/prompt-engine/types";

import { PredictivePromptInput } from "./predictive-prompt-input";
import { PresetPickerDialog } from "./preset-picker-dialog";
import type { WorkspaceAction, WorkspaceControls } from "./workspace-state";

const TASK_TYPES: readonly { value: PromptTaskType; label: string }[] = [
  { value: "general", label: "General" },
  { value: "bug-fix", label: "Bug Fix" },
  { value: "feature", label: "Build Feature" },
  { value: "code-review", label: "Code Review" },
  { value: "refactor", label: "Refactor" },
  { value: "testing", label: "Testing" },
  { value: "documentation", label: "Documentation" },
  { value: "rewrite", label: "Rewrite" },
  { value: "summarize", label: "Summarize" },
  { value: "research", label: "Research" },
  { value: "comparison", label: "Compare Options" },
  { value: "ui-review", label: "UX Review" },
  { value: "image-prompt", label: "Image Prompt" },
];

const LEVELS: readonly { value: EnhancementLevel; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "standard", label: "Standard" },
  { value: "detailed", label: "Detailed" },
];

const PROMPT_SECTION_OPTIONS = [
  "objective",
  "requirements",
  "constraints",
  "verification",
  "acceptance-criteria",
] as const satisfies readonly SectionId[];

const SECTION_OPTIONS: readonly { value: SectionId; label: string }[] = PROMPT_SECTION_OPTIONS.map((value) => ({
  value,
  label: SECTION_TITLES[value],
}));

const GENZ_ENHANCING_MESSAGES: readonly string[] = [
  "Crafting your enhanced prompt.",
  "Cooking... this finna be fire",
  "Giving your prompt rizz",
  "Making it slay, no cap",
  "Main character energy loading...",
  "Brewing your prompt tea",
  "Slay mode: activated",
  "Lowkey perfecting your words...",
  "Highkey making it elite",
  "Sheesh, your prompt bout to pop off!",
  "We love a glow-up moment",
  "Prompt so clean, it's giving",
] as const;

export function PromptInputPanel({
  prompt,
  controls,
  error,
  promptLength,
  stale,
  running,
  history,
  historyResolved,
  predictionService,
  dispatch,
  onEnhance,
  onCancel,
}: {
  prompt: string;
  controls: WorkspaceControls;
  error: string | null;
  promptLength: number;
  stale: boolean;
  running: boolean;
  history: readonly PredictiveHistoryEntry[];
  historyResolved: boolean;
  predictionService: PredictiveTextService | null;
  dispatch: Dispatch<WorkspaceAction>;
  onEnhance: () => void;
  onCancel: () => void;
}) {
  const [genZIndex, setGenZIndex] = useState(0);

  useEffect(() => {
    if (!running) {
      setGenZIndex(0);
      return;
    }
    const id = window.setInterval(() => {
      setGenZIndex((prev) => (prev + 1) % GENZ_ENHANCING_MESSAGES.length);
    }, 2000);
    return () => window.clearInterval(id);
  }, [running]);

  const changeControls = (next: Partial<WorkspaceControls>) => {
    const clearsPreset = next.taskType !== undefined && next.taskType !== controls.taskType;
    dispatch({
      type: "controls-changed",
      controls: { ...controls, ...next, ...(clearsPreset ? { presetId: null } : {}) },
    });
  };

  const applyPreset = (preset: PromptPreset) => {
    changeControls({
      taskType: preset.taskType,
      level: preset.level,
      sections: preset.sections,
      presetId: preset.id,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting — persistent; only changes to Enhancing... when running */}
      {!running ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center sm:py-10">
          <div className="flex items-center gap-2">
            <Sparkles className="size-7 text-lime-600 dark:text-lime-400" />
            <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">Ready to enhance?</h2>
          </div>
          <p className="text-muted-foreground text-sm">Turn rough instructions into clear, structured prompts.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-6 text-center sm:py-10">
          <div className="flex items-center gap-2">
            <Spinner className="size-7 text-lime-600 dark:text-lime-400" />
            <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">Enhancing...</h2>
          </div>
          <p key={genZIndex} className="fade-in animate-in text-muted-foreground text-sm duration-300">
            {GENZ_ENHANCING_MESSAGES[genZIndex]}
          </p>
        </div>
      )}

      {/* Chat input card — rounded-2xl like Claude */}
      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="p-4 sm:p-5">
          <PredictivePromptInput
            id="prompt-input"
            value={prompt}
            disabled={running}
            history={history}
            historyResolved={historyResolved}
            predictionService={predictionService}
            onValueChange={(value) => dispatch({ type: "prompt-changed", prompt: value })}
            onSubmit={onEnhance}
          />
        </div>

        {/* Bottom toolbar inside card */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2">
            <PresetPickerDialog value={controls.presetId} disabled={running} onSelect={applyPreset} />
            <div className="hidden items-center gap-1.5 sm:flex">
              <Select
                value={controls.taskType}
                onValueChange={(value) => changeControls({ taskType: value as WorkspaceControls["taskType"] })}
                disabled={running}
              >
                <SelectTrigger size="sm" className="h-7 rounded-full bg-background px-3 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="auto">Auto Detect</SelectItem>
                  {TASK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="hidden text-muted-foreground text-xs sm:inline">
              {promptLength.toLocaleString()} / 15,000
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs sm:hidden">{promptLength.toLocaleString()} / 15k</span>
            <div className="hidden sm:flex">
              <Select
                value={controls.level}
                onValueChange={(value) => changeControls({ level: value as EnhancementLevel })}
                disabled={running}
              >
                <SelectTrigger size="sm" className="h-7 rounded-full bg-background px-3 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!running ? (
              <Button
                type="button"
                size="sm"
                className="px-5"
                onClick={onEnhance}
                disabled={running || prompt.trim().length === 0}
              >
                Enhance
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile selects */}
      <div className="grid gap-3 sm:hidden">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="prompt-type-mobile" className="text-xs">
              Prompt Type
            </Label>
            <Select
              value={controls.taskType}
              onValueChange={(value) => changeControls({ taskType: value as WorkspaceControls["taskType"] })}
              disabled={running}
            >
              <SelectTrigger id="prompt-type-mobile" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="auto">Auto Detect</SelectItem>
                {TASK_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="enhancement-level-mobile" className="text-xs">
              Level
            </Label>
            <Select
              value={controls.level}
              onValueChange={(value) => changeControls({ level: value as EnhancementLevel })}
              disabled={running}
            >
              <SelectTrigger id="enhancement-level-mobile" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Include Sections — as small pills */}
      <fieldset className="space-y-2">
        <legend className="text-center font-medium text-muted-foreground text-xs">Include Sections</legend>
        <div className="flex flex-wrap justify-center gap-2">
          {SECTION_OPTIONS.map((section) => {
            const checked = controls.sections.includes(section.value);
            const sectionId = `section-option-${section.value}`;
            return (
              <label
                key={section.value}
                htmlFor={sectionId}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${checked ? "border-lime-500/30 bg-lime-500/10 text-lime-700 dark:border-lime-400/30 dark:bg-lime-400/10 dark:text-lime-300" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
              >
                <Checkbox
                  id={sectionId}
                  checked={checked}
                  disabled={running}
                  onCheckedChange={() => {
                    const sections = checked
                      ? controls.sections.filter((item) => item !== section.value)
                      : [...controls.sections, section.value];
                    changeControls({ sections });
                  }}
                  className="size-3.5 rounded-full data-checked:bg-lime-600"
                />
                {section.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {stale && (
        <p className="text-center text-amber-600 text-sm">Controls changed. Click Enhance to generate a new result.</p>
      )}
      {error && (
        <p className="text-center text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <div aria-live="polite" className="sr-only">
        {running ? "Enhancing your prompt." : ""}
      </div>
      {running && (
        <p className="flex items-center justify-center gap-2 text-muted-foreground text-sm" role="status">
          <Spinner /> Enhancing your prompt...
        </p>
      )}
    </div>
  );
}
