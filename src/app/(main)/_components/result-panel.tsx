"use client";

import { Copy, Download, Edit3, Save } from "lucide-react";

import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import { MarkdownPreview } from "@/components/markdown/markdown-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { WorkspaceState } from "./workspace-state";

export function ResultPanel({
  state,
  onViewChange,
  onMarkdownChange,
  onCopy,
  onExport,
  onSave,
  saveDisabled = false,
}: {
  state: WorkspaceState;
  onViewChange: (view: WorkspaceState["view"]) => void;
  onMarkdownChange: (markdown: string) => void;
  onCopy: () => void;
  onExport: () => void;
  onSave?: () => void;
  saveDisabled?: boolean;
}) {
  const document = state.document;
  if (!document) {
    return (
      <Card className="h-full min-h-96">
        <CardHeader>
          <CardTitle>Result</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center text-center text-muted-foreground">
          Your enhanced prompt will appear here.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-h-96">
      <CardHeader className="gap-3 border-b">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Enhanced Prompt</CardTitle>
          <div className="flex flex-wrap justify-end gap-1">
            <Button type="button" variant="outline" size="sm" onClick={onCopy}>
              <Copy /> Copy
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onViewChange("edit")}>
              <Edit3 /> Edit
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onSave} disabled={!onSave || saveDisabled}>
              <Save /> Save
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onExport}>
              <Download /> Export
            </Button>
          </div>
        </div>
        {state.actionMessage && (
          <p className="text-muted-foreground text-sm" role="status">
            {state.actionMessage}
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        <Tabs value={state.view} onValueChange={(value) => onViewChange(value as WorkspaceState["view"])}>
          <TabsList>
            <TabsTrigger value="result">Result</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="edit">Edit</TabsTrigger>
          </TabsList>
          <TabsContent value="result" className="pt-4">
            <textarea
              aria-label="Enhanced Markdown result"
              className="min-h-80 w-full resize-y rounded-lg border bg-muted/20 p-4 font-mono text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              value={document.markdown}
              readOnly
            />
          </TabsContent>
          <TabsContent value="preview" className="min-h-80 rounded-lg border bg-muted/20 p-4 pt-4">
            <MarkdownPreview markdown={document.markdown} />
          </TabsContent>
          <TabsContent value="edit" className="pt-4">
            <MarkdownEditor
              value={document.markdown}
              initialValue={document.generatedMarkdown}
              onChange={onMarkdownChange}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
