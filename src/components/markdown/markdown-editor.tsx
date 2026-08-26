"use client";

import { Fragment, useRef, useState } from "react";

import {
  Asterisk,
  Bold,
  Code,
  Expand,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  RotateCcw,
  SquareCheck,
  SquareCode,
  Strikethrough,
  Table,
  TextQuote,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  type EditorSelection,
  getMarkdownCounts,
  insertCodeBlock,
  insertHorizontalRule,
  insertImage,
  insertLink,
  insertTableSkeleton,
  quoteSelectedLines,
  setHeadingLevel,
  taskPrefixSelectedLines,
  togglePrefixSelectedLines,
  toggleTaskChecked,
  toggleWrapSelection,
} from "./markdown-editor-utils";
import { MarkdownPreview } from "./markdown-preview";

type ToolbarAction = {
  label: string;
  icon: typeof Bold;
  apply: (state: EditorSelection) => EditorSelection;
};

const TOOLBAR_GROUPS: readonly (readonly ToolbarAction[])[] = [
  [
    { label: "Heading 1", icon: Heading1, apply: (state) => setHeadingLevel(state, 1) },
    { label: "Heading 2", icon: Heading2, apply: (state) => setHeadingLevel(state, 2) },
    { label: "Heading 3", icon: Heading3, apply: (state) => setHeadingLevel(state, 3) },
  ],
  [
    { label: "Bold", icon: Bold, apply: (state) => toggleWrapSelection(state, "**", "bold text") },
    { label: "Italic", icon: Italic, apply: (state) => toggleWrapSelection(state, "*", "italic text") },
    { label: "Bold italic", icon: Asterisk, apply: (state) => toggleWrapSelection(state, "***", "bold italic text") },
    { label: "Strikethrough", icon: Strikethrough, apply: (state) => toggleWrapSelection(state, "~~", "struck text") },
    { label: "Inline code", icon: Code, apply: (state) => toggleWrapSelection(state, "`", "code") },
    { label: "Link", icon: Link, apply: insertLink },
    { label: "Image", icon: Image, apply: insertImage },
  ],
  [
    { label: "Bulleted list", icon: List, apply: (state) => togglePrefixSelectedLines(state, "- ") },
    { label: "Numbered list", icon: ListOrdered, apply: (state) => togglePrefixSelectedLines(state, "1. ") },
    { label: "Task list", icon: ListTodo, apply: (state) => taskPrefixSelectedLines(state, false) },
    { label: "Toggle checked", icon: SquareCheck, apply: toggleTaskChecked },
    { label: "Quote", icon: TextQuote, apply: quoteSelectedLines },
  ],
  [
    { label: "Divider", icon: Minus, apply: insertHorizontalRule },
    { label: "Code block", icon: SquareCode, apply: insertCodeBlock },
    { label: "Table", icon: Table, apply: insertTableSkeleton },
  ],
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
        {TOOLBAR_GROUPS.map((group, groupIndex) => (
          <Fragment key={group[0].label}>
            {groupIndex > 0 && (
              <Separator orientation="vertical" className="mx-1 h-5 data-[orientation=vertical]:self-center" />
            )}
            {group.map(({ label, icon: Icon, apply: transform }) => (
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
          </Fragment>
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
      {!fullscreen && editor}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="!max-w-[calc(100vw-1rem)] sm:!max-w-5xl h-[90vh] w-[calc(100vw-1rem)] min-w-0 sm:w-[calc(100vw-2rem)]">
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
