"use client";

import Link from "next/link";

import { useLiveQuery } from "dexie-react-hooks";
import { Copy, Download, ExternalLink, MoreHorizontal, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/hooks/use-confirm";
import { copyText } from "@/lib/browser-actions.client";
import { exportLocalMemory } from "@/lib/browser-memory/backup.client";
import type { HistoryRecord } from "@/lib/browser-memory/types";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { MemoryErrorBoundary } from "../../_components/memory-error-boundary";
import { useMemory } from "../../_components/memory-provider";

function dayLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (day === start) return "Today";
  if (day === start - 86_400_000) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function HistoryContent() {
  const { status, repository } = useMemory();
  const historyMaxEntries = usePreferencesStore((state) => state.historyMaxEntries);
  const { confirm, dialog } = useConfirm();
  const records = useLiveQuery(
    () => (status === "ready" ? repository.listHistory() : Promise.resolve([])),
    [repository, status],
  );

  if (status === "unavailable") {
    return <p className="text-destructive text-sm">Local history is unavailable in this browser.</p>;
  }
  if (records === undefined) return <p className="text-muted-foreground text-sm">Loading local history...</p>;

  const groups = records.reduce<Map<string, HistoryRecord[]>>((result, record) => {
    const key = dayLabel(record.createdAt);
    const items = result.get(key) ?? [];
    items.push(record);
    result.set(key, items);
    return result;
  }, new Map());

  const copy = async (record: HistoryRecord) => {
    try {
      await copyText(record.enhancedPrompt);
    } catch {
      // The raw prompt remains available from Open and the workspace result.
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
        <div>
          <p className="font-medium text-sm">Newest {historyMaxEntries} entries</p>
          <p className="text-muted-foreground text-xs">
            Automatic history stays in this browser and can be cleared at any time.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void exportLocalMemory(repository)}>
            <Download /> Export local data
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={records.length === 0}
            onClick={async () => {
              const confirmed = await confirm({
                title: "Clear all local history?",
                description: "Saved library prompts will remain.",
                confirmLabel: "Clear history",
                destructive: true,
              });
              if (confirmed) void repository.clearHistory();
            }}
          >
            <Trash2 /> Clear history
          </Button>
        </div>
      </div>
      {records.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Successful enhancements will appear here.
          </CardContent>
        </Card>
      ) : (
        [...groups.entries()].map(([label, items]) => (
          <section key={label} className="space-y-3" aria-labelledby={`history-${label}`}>
            <h2 id={`history-${label}`} className="font-medium text-lg">
              {label}
            </h2>
            {items.map((record) => (
              <Card key={record.id} size="sm">
                <CardHeader className="gap-1">
                  <CardTitle className="truncate text-sm">{record.originalPrompt}</CardTitle>
                  <CardAction>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label="History actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/?history=${record.id}`}>
                            <ExternalLink /> Open
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void copy(record)}>
                          <Copy /> Copy
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void repository.promoteHistory(record.id)}>
                          <Save /> Save to Library
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={async () => {
                            const confirmed = await confirm({
                              title: "Delete this history entry?",
                              description: "This cannot be undone.",
                              confirmLabel: "Delete",
                              destructive: true,
                            });
                            if (confirmed) void repository.deleteHistory(record.id);
                          }}
                        >
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-xs">
                    {record.taskType} · {record.level} ·{" "}
                    {new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(record.createdAt)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>
        ))
      )}
      {dialog}
    </div>
  );
}

export function HistoryScreen() {
  return (
    <MemoryErrorBoundary>
      <HistoryContent />
    </MemoryErrorBoundary>
  );
}
