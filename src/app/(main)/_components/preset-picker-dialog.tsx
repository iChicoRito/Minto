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
      <DialogContent className="flex h-[min(90vh,64rem)] max-h-[calc(100vh-2rem)] min-h-0 w-[calc(100%-2rem)] max-w-[100rem] flex-col gap-4 overflow-hidden sm:max-w-[100rem]">
        <DialogHeader>
          <DialogTitle>Choose a preset</DialogTitle>
          <DialogDescription>Select a prompt preset to guide the enhancer.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-0 flex-1 pr-3">
          <PromptPresetGallery selectedPresetId={value} onSelectPreset={handleSelect} />
        </ScrollArea>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
