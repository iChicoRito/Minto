"use client";

import { useState } from "react";

import { Check, ChevronsUpDown } from "lucide-react";

import { PromptPresetGallery } from "@/components/prompt-preset-gallery";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getPromptPreset, type PromptPreset, type PromptPresetId } from "@/lib/prompt-presets";

type PresetPickerDialogProps = {
  value: PromptPresetId | null;
  disabled?: boolean;
  onSelect: (preset: PromptPreset) => void;
};

export function PresetPickerDialog({ value, disabled = false, onSelect }: PresetPickerDialogProps) {
  const [open, setOpen] = useState(false);
  const selectedPreset = value ? getPromptPreset(value) : undefined;

  function handleSelect(preset: PromptPreset) {
    onSelect(preset);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-haspopup="dialog"
          className="max-w-44 justify-between gap-2"
        >
          <span className="truncate">{selectedPreset?.label ?? "Choose preset"}</span>
          {selectedPreset ? <Check aria-hidden="true" /> : <ChevronsUpDown aria-hidden="true" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="!max-w-[calc(100vw-1rem)] sm:!max-w-5xl flex h-[min(90vh,64rem)] max-h-[calc(100vh-2rem)] min-h-0 w-[calc(100vw-1rem)] min-w-0 flex-col gap-4 overflow-hidden sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="min-w-0">
          <DialogTitle className="min-w-0 break-words">Choose a preset</DialogTitle>
          <DialogDescription className="min-w-0 break-words">
            Select a prompt preset to guide the enhancer.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-0 w-full min-w-0 flex-1 overflow-x-hidden">
          <div className="w-full min-w-0 px-4 pb-4">
            <PromptPresetGallery selectedPresetId={value} onSelectPreset={handleSelect} />
          </div>
        </ScrollArea>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
