"use client";

import type { Dispatch } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SECTION_TITLES, type SectionId } from "@/prompt-engine/templates/template-types";
import type { EnhancementLevel, PromptTaskType } from "@/prompt-engine/types";

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

export function PromptInputPanel({
  prompt,
  controls,
  error,
  stale,
  disabled,
  dispatch,
  onEnhance,
}: {
  prompt: string;
  controls: WorkspaceControls;
  error: string | null;
  stale: boolean;
  disabled: boolean;
  dispatch: Dispatch<WorkspaceAction>;
  onEnhance: () => void;
}) {
  const changeControls = (next: Partial<WorkspaceControls>) => {
    dispatch({ type: "controls-changed", controls: { ...controls, ...next, presetId: null } });
  };

  return (
    <section className="space-y-5" aria-labelledby="prompt-input-title">
      <div>
        <h2 id="prompt-input-title" className="font-medium text-lg">
          Your Prompt
        </h2>
        <p className="text-muted-foreground text-sm">Start with rough wording. The local rules engine structures it.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="prompt-input">Prompt</Label>
        <Textarea
          id="prompt-input"
          className="min-h-44 resize-y"
          placeholder="Describe what you want to accomplish..."
          value={prompt}
          onChange={(event) => dispatch({ type: "prompt-changed", prompt: event.target.value })}
          disabled={disabled}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prompt-type">Prompt Type</Label>
          <select
            id="prompt-type"
            className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
            value={controls.taskType}
            onChange={(event) => changeControls({ taskType: event.target.value as WorkspaceControls["taskType"] })}
            disabled={disabled}
          >
            <option value="auto">Auto Detect</option>
            {TASK_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="enhancement-level">Enhancement Level</Label>
          <select
            id="enhancement-level"
            className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
            value={controls.level}
            onChange={(event) => changeControls({ level: event.target.value as EnhancementLevel })}
            disabled={disabled}
          >
            {LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <fieldset className="space-y-3">
        <legend className="font-medium text-sm">Include Sections</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {SECTION_OPTIONS.map((section) => {
            const checked = controls.sections.includes(section.value);
            const objective = section.value === "objective";
            return (
              <label key={section.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled || objective}
                  onChange={() => {
                    const sections = checked
                      ? controls.sections.filter((item) => item !== section.value)
                      : [...controls.sections, section.value];
                    changeControls({ sections });
                  }}
                />
                {section.label}
              </label>
            );
          })}
        </div>
      </fieldset>
      {stale && <p className="text-amber-600 text-sm">Controls changed. Click Enhance to generate a new result.</p>}
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <Button type="button" className="w-full" onClick={onEnhance} disabled={disabled}>
        {disabled ? "Enhancing..." : "Enhance Prompt"}
      </Button>
    </section>
  );
}
