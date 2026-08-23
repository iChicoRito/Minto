"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { useLiveQuery } from "dexie-react-hooks";
import { Clock3, Copy, ExternalLink, FileText, MoreVertical, Save, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/hooks/use-confirm";
import { copyText } from "@/lib/browser-actions.client";
import type { HistoryRecord } from "@/lib/browser-memory/types";

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

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(timestamp);
}

function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60_000) return "Just now";
  const label = dayLabel(timestamp);
  const time = formatTime(timestamp);
  if (label === "Today") return time;
  if (label === "Yesterday") return `Yesterday, ${time}`;
  const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(timestamp);
  return `${date}, ${time}`;
}

function HistoryContent() {
  const { status, repository } = useMemory();
  const { confirm, dialog } = useConfirm();
  const [search, setSearch] = useState("");
  const records = useLiveQuery(
    () => (status === "ready" ? repository.listHistory() : Promise.resolve([])),
    [repository, status],
  );

  const filtered = useMemo(() => {
    if (!records) return undefined;
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((record) => {
      const haystack = `${record.originalPrompt} ${record.taskType} ${record.level}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [records, search]);

  if (status === "unavailable") {
    return <p className="text-destructive text-sm">Local history is unavailable in this browser.</p>;
  }
  if (filtered === undefined) return <p className="text-muted-foreground text-sm">Loading local history...</p>;

  const groups = filtered.reduce<Map<string, HistoryRecord[]>>((result, record) => {
    const raw = dayLabel(record.createdAt);
    const key = raw === "Today" || raw === "Yesterday" ? raw : "Earlier";
    const items = result.get(key) ?? [];
    items.push(record);
    result.set(key, items);
    return result;
  }, new Map());
  // Ensure Today/Yesterday/Earlier ordering mirrors occurrence; map already is insertion order.
  const copy = async (record: HistoryRecord) => {
    try {
      await copyText(record.enhancedPrompt);
    } catch {
      // The raw prompt remains available from Open and the workspace result.
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-64 max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search history..."
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={filtered.length === 0}
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
          <Trash2 /> Clear History
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            {search ? "No history matches your search." : "Successful enhancements will appear here."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([label, items]) => (
            <section key={label} className="space-y-2" aria-labelledby={`history-${label}`}>
              <h2 id={`history-${label}`} className="font-medium text-sm">
                {label}
              </h2>
              <div className="overflow-hidden rounded-xl border bg-card">
                {items.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center gap-3 border-b px-3 py-3 last:border-0 hover:bg-muted/40 sm:gap-4 sm:px-4"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted/30">
                      <FileText className="size-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm leading-tight">{record.originalPrompt}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="rounded-md px-1.5 py-0 font-normal text-xs capitalize">
                          {record.taskType}
                        </Badge>
                        <Badge variant="outline" className="rounded-md px-1.5 py-0 font-normal text-xs capitalize">
                          {record.level}
                        </Badge>
                      </div>
                    </div>
                    <span className="hidden shrink-0 text-muted-foreground text-xs sm:block">
                      {formatTimestamp(record.createdAt)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="History actions"
                          className="shrink-0 text-muted-foreground"
                        >
                          <MoreVertical />
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
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-3 text-muted-foreground text-xs">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="size-4" /> History is saved locally on your device.
        </span>
        <span>{filtered.length} entries</span>
      </div>

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
