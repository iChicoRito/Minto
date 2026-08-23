"use client";

import type { Dispatch } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
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
  promptLength,
  stale,
  running,
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
  dispatch: Dispatch<WorkspaceAction>;
  onEnhance: () => void;
  onCancel: () => void;
}) {
  const changeControls = (next: Partial<WorkspaceControls>) => {
    // Level and section edits keep preset identity; an explicit task-type
    // switch is a manual selection and clears it.
    const clearsPreset = next.taskType !== undefined && next.taskType !== controls.taskType;
    dispatch({
      type: "controls-changed",
      controls: { ...controls, ...next, ...(clearsPreset ? { presetId: null } : {}) },
    });
  };

  return (
    <section className="space-y-5" aria-labelledby="prompt-input-title">
      <div>
        <h2 id="prompt-input-title" className="font-medium text-lg">
          Your Prompt
        </h2>
        <p className="text-muted-foreground text-sm">
          Start with rough wording. AI enhances it according to your selected preset, type, and level.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="prompt-input">Prompt</Label>
        <Textarea
          id="prompt-input"
          className="min-h-44 resize-y"
          placeholder="Describe what you want to accomplish..."
          value={prompt}
          onChange={(event) => dispatch({ type: "prompt-changed", prompt: event.target.value })}
          disabled={running}
        />
        <p className={promptLength > 15_000 ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
          {promptLength.toLocaleString()} / 15,000 characters
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prompt-type">Prompt Type</Label>
          <Select
            value={controls.taskType}
            onValueChange={(value) => changeControls({ taskType: value as WorkspaceControls["taskType"] })}
            disabled={running}
          >
            <SelectTrigger id="prompt-type" className="w-full">
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
        <div className="space-y-2">
          <Label htmlFor="enhancement-level">Enhancement Level</Label>
          <Select
            value={controls.level}
            onValueChange={(value) => changeControls({ level: value as EnhancementLevel })}
            disabled={running}
          >
            <SelectTrigger id="enhancement-level" className="w-full">
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
      <fieldset className="space-y-3">
        <legend className="font-medium text-sm">Include Sections</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {SECTION_OPTIONS.map((section) => {
            const checked = controls.sections.includes(section.value);
            const sectionId = `section-option-${section.value}`;
            return (
              <div key={section.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  id={sectionId}
                  checked={checked}
                  disabled={running}
                  onCheckedChange={() => {
                    if (checked && controls.sections.length === 1) {
                      toast.warning("Keep at least one section selected.");
                      return;
                    }
                    const sections = checked
                      ? controls.sections.filter((item) => item !== section.value)
                      : [...controls.sections, section.value];
                    changeControls({ sections });
                  }}
                />
                <Label htmlFor={sectionId} className="font-normal">
                  {section.label}
                </Label>
              </div>
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
      <div aria-live="polite" className="sr-only">
        {running ? "Enhancing your prompt." : ""}
      </div>
      <div className="flex gap-2">
        <Button type="button" className="flex-1" onClick={onEnhance} disabled={running}>
          {running && <Spinner />} {running ? "Enhancing..." : "Enhance Prompt"}
        </Button>
        {running && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </section>
  );
}
