"use client";

import { useRef, useState } from "react";

import { Bold, Code, Expand, Heading2, Italic, Link, List, ListOrdered, RotateCcw, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  type EditorSelection,
  getMarkdownCounts,
  insertLink,
  prefixSelectedLines,
  wrapSelection,
} from "./markdown-editor-utils";
import { MarkdownPreview } from "./markdown-preview";

type ToolbarAction = {
  label: string;
  icon: typeof Bold;
  apply: (state: EditorSelection) => EditorSelection;
};

const TOOLBAR_ACTIONS: readonly ToolbarAction[] = [
  { label: "Heading", icon: Heading2, apply: (state) => prefixSelectedLines(state, "## ") },
  { label: "Bold", icon: Bold, apply: (state) => wrapSelection(state, "**", "**", "bold text") },
  { label: "Italic", icon: Italic, apply: (state) => wrapSelection(state, "_", "_", "italic text") },
  { label: "Bulleted list", icon: List, apply: (state) => prefixSelectedLines(state, "- ") },
  { label: "Numbered list", icon: ListOrdered, apply: (state) => prefixSelectedLines(state, "1. ") },
  { label: "Code", icon: Code, apply: (state) => wrapSelection(state, "`", "`", "code") },
  { label: "Link", icon: Link, apply: insertLink },
];

export function MarkdownEditor({
  value,
  initialValue,
  onChange,
  className,
}: {
  value: string;
  initialValue: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const counts = getMarkdownCounts(value);

  const apply = (transform: (state: EditorSelection) => EditorSelection) => {
    const textarea = textareaRef.current;
    const state = {
      value,
      selectionStart: textarea?.selectionStart ?? value.length,
      selectionEnd: textarea?.selectionEnd ?? value.length,
    };
    const next = transform(state);
    setHistory((items) => [...items.slice(-99), value]);
    onChange(next.value);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  };

  const undo = () => {
    const previous = history.at(-1);
    if (previous === undefined) return;
    setHistory((items) => items.slice(0, -1));
    onChange(previous);
  };

  const reset = () => {
    setHistory((items) => [...items.slice(-99), value]);
    onChange(initialValue);
  };

  const editor = (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b pb-2">
        {TOOLBAR_ACTIONS.map(({ label, icon: Icon, apply: transform }) => (
          <Button
            key={label}
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            onClick={() => apply(transform)}
          >
            <Icon />
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Undo"
          disabled={history.length === 0}
          onClick={undo}
        >
          <Undo2 />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Reset" onClick={reset}>
          <RotateCcw />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Fullscreen"
          onClick={() => setFullscreen(true)}
        >
          <Expand />
        </Button>
      </div>
      <Tabs
        value={mobileView}
        onValueChange={(next) => setMobileView(next as "edit" | "preview")}
        className="md:hidden"
      >
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={mobileView === "edit" ? "block" : "hidden md:block"}>
          <Textarea
            ref={textareaRef}
            aria-label="Markdown editor"
            className="min-h-72 resize-y font-mono text-sm"
            value={value}
            onChange={(event) => {
              setHistory((items) => [...items.slice(-99), value]);
              onChange(event.target.value);
            }}
          />
        </div>
        <div className={mobileView === "preview" ? "block" : "hidden md:block"}>
          <div className="min-h-72 rounded-lg border bg-muted/20 p-4">
            <MarkdownPreview markdown={value} />
          </div>
        </div>
      </div>
      <p className="text-muted-foreground text-xs" aria-live="polite">
        {counts.words} words · {counts.characters} characters
      </p>
    </div>
  );

  return (
    <>
      {editor}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="h-[90vh] max-w-5xl">
          <DialogHeader>
            <DialogTitle>Markdown editor</DialogTitle>
            <DialogDescription>Edit the current result and preview it safely.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto">{editor}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
