"use client";

import { Copy, Download, Edit3, MoreVertical, RefreshCw, Save, Wand2 } from "lucide-react";

import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import { MarkdownPreview } from "@/components/markdown/markdown-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { WorkspaceState } from "./workspace-state";

const TASK_LABELS: Record<string, string> = {
  "bug-fix": "Bug Fix",
  feature: "Build Feature",
  "code-review": "Code Review",
  refactor: "Refactor",
  testing: "Testing",
  documentation: "Documentation",
  rewrite: "Rewrite",
  summarize: "Summarize",
  research: "Research",
  comparison: "Compare Options",
  "ui-review": "UX Review",
  "image-prompt": "Image Prompt",
  general: "General",
};

function sourceLabel(state: WorkspaceState): string | null {
  if (!state.document) return null;
  return state.document.generation.kind === "ai" ? "Enhanced" : "Local rules";
}

export function ResultPanel({
  state,
  onViewChange,
  onMarkdownChange,
  onCopy,
  onExport,
  onSave,
  saveDisabled = false,
  saving = false,
  onRetry,
  onUseLocalRules,
  fallbackPending = false,
  onReEnhance,
}: {
  state: WorkspaceState;
  onViewChange: (view: WorkspaceState["view"]) => void;
  onMarkdownChange: (markdown: string) => void;
  onCopy: () => void;
  onExport: () => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  saving?: boolean;
  onRetry?: () => void;
  onUseLocalRules?: () => void;
  fallbackPending?: boolean;
  onReEnhance?: () => void;
}) {
  const document = state.document;
  const source = sourceLabel(state);
  if (!document) {
    return (
      <Card className="flex h-full min-h-96 w-full flex-col">
        <CardHeader>
          <CardTitle>Result</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
          <p>Your enhanced prompt will appear here.</p>
          {state.status === "running" && (
            <p className="flex items-center gap-2 text-muted-foreground text-sm" role="status">
              <Spinner /> Enhancing your prompt...
            </p>
          )}
          {state.error?.fallbackEligible && (
            <>
              <p className="text-destructive" role="alert">
                {state.error.message}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={onUseLocalRules} disabled={fallbackPending}>
                {fallbackPending ? <Spinner /> : <Wand2 />}{" "}
                {fallbackPending ? "Enhancing..." : "Use local rules instead"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex min-h-96 w-full flex-col">
      <CardHeader className="gap-3 border-b">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle>Enhanced Prompt</CardTitle>
            {source && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">{source}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCopy} aria-label="Copy result">
              <Copy /> Copy
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Result actions">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onViewChange("edit")}>
                  <Edit3 /> Edit in result
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSave} disabled={!onSave || saveDisabled}>
                  {saving ? <Spinner /> : <Save />} {saving ? "Saving..." : "Save to library"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExport}>
                  <Download /> Export markdown
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {state.actionMessage && (
          <p className="text-muted-foreground text-sm" role="status">
            {state.actionMessage}
          </p>
        )}
        {state.status === "running" && (
          <p className="flex items-center gap-2 text-muted-foreground text-sm" role="status">
            <Spinner /> Enhancing your prompt...
          </p>
        )}
        {state.error?.fallbackEligible && (
          <div className="flex flex-wrap items-center gap-2" role="alert">
            <p className="text-destructive text-sm">{state.error.message}</p>
            {onRetry && (
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw /> Retry
              </Button>
            )}
            {onUseLocalRules && (
              <Button type="button" variant="outline" size="sm" onClick={onUseLocalRules} disabled={fallbackPending}>
                {fallbackPending ? <Spinner /> : <Wand2 />}{" "}
                {fallbackPending ? "Enhancing..." : "Use local rules instead"}
              </Button>
            )}
          </div>
        )}
        {document.classification.topMatches.length > 1 && (
          <p className="text-muted-foreground text-sm" role="status">
            Detected: {TASK_LABELS[document.classification.topMatches[0]]}; Also matches:{" "}
            {document.classification.topMatches
              .slice(1)
              .map((type) => TASK_LABELS[type])
              .join(", ")}
          </p>
        )}
        {document.classification.topMatches.length === 0 && document.classification.fallbackToGeneral && (
          <p className="text-muted-foreground text-sm" role="status">
            Low confidence — using General. You can choose a type manually before enhancing again.
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-4">
        <Tabs
          value={state.view}
          onValueChange={(value) => onViewChange(value as WorkspaceState["view"])}
          className="flex flex-1 flex-col"
        >
          <TabsList>
            <TabsTrigger value="result">Result</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="edit">Edit</TabsTrigger>
          </TabsList>
          <TabsContent value="result" className="flex-1 pt-4">
            <textarea
              aria-label="Enhanced Markdown result"
              className="min-h-80 w-full flex-1 resize-y rounded-lg border bg-muted/20 p-4 font-mono text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              value={document.markdown}
              readOnly
            />
          </TabsContent>
          <TabsContent value="preview" className="flex-1 pt-4">
            <div className="min-h-80 rounded-lg border bg-muted/20 p-4">
              <MarkdownPreview markdown={document.markdown} />
            </div>
          </TabsContent>
          <TabsContent value="edit" className="flex-1 pt-4">
            <MarkdownEditor
              value={document.markdown}
              initialValue={document.generatedMarkdown}
              onChange={onMarkdownChange}
            />
          </TabsContent>
        </Tabs>
        {onReEnhance && (
          <div className="mt-4 flex justify-end border-t pt-4">
            <Button type="button" onClick={onReEnhance} disabled={state.status === "running"}>
              <Wand2 /> Re-Enhance
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
