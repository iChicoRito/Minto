"use client";

import { useRef, useState } from "react";

import { Download, Eraser, FileInput, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { exportLocalMemory, readBackupFile, restoreLocalMemory } from "@/lib/browser-memory/backup.client";
import type { BackupPreview, ParsedBackup } from "@/lib/browser-memory/backup-schema";
import type { MemoryRepository } from "@/lib/browser-memory/repository.client";
import { HISTORY_LIMIT_OPTIONS, type HistoryLimit } from "@/lib/preferences/prompt-preferences";

export function DataSettings({
  historyEnabled,
  historyMaxEntries,
  memoryStatus,
  repository,
  onHistoryEnabledChange,
  onHistoryMaxEntriesChange,
  onClearAll,
}: {
  historyEnabled: boolean;
  historyMaxEntries: HistoryLimit;
  memoryStatus: "loading" | "ready" | "unavailable";
  repository: MemoryRepository;
  onHistoryEnabledChange: (enabled: boolean) => void;
  onHistoryMaxEntriesChange: (limit: HistoryLimit) => void;
  onClearAll: () => Promise<void>;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ backup: ParsedBackup; preview: BackupPreview } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const ready = memoryStatus === "ready";

  const clearHistory = async () => {
    if (!ready || !window.confirm("Clear local history? Saved library prompts will remain.")) return;
    try {
      await repository.clearHistory();
      setMessage("Local history cleared.");
    } catch {
      setMessage("History could not be cleared.");
    }
  };

  const clearLibrary = async () => {
    if (!ready || !window.confirm("Clear the local library and folders? History will remain.")) return;
    try {
      await repository.clearLibrary();
      setMessage("Local library and folders cleared.");
    } catch {
      setMessage("The library could not be cleared.");
    }
  };

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPending(await readBackupFile(file));
      setMessage(null);
    } catch (error) {
      setPending(null);
      setMessage(error instanceof Error ? error.message : "This backup could not be read.");
    }
  };

  const confirmImport = async () => {
    if (!pending || !ready) return;
    const { preview, backup } = pending;
    const confirmed = window.confirm(
      `Replace local data with this backup? ${preview.historyCount} history entries, ${preview.promptCount} prompts, and ${preview.folderCount} folders will be restored.`,
    );
    if (!confirmed) return;
    try {
      await restoreLocalMemory(repository, backup);
      setMessage("Backup restored. Reloading…");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The backup could not be restored.");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Local data</CardTitle>
          <CardDescription>Prompts and history stay in this browser. They are not encrypted or synced.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={historyEnabled}
              onChange={(event) => onHistoryEnabledChange(event.target.checked)}
            />
            Save successful enhancements in local history
          </label>
          <div className="space-y-2">
            <label htmlFor="history-max-entries" className="font-medium text-sm">
              Maximum history entries
            </label>
            <select
              id="history-max-entries"
              className="h-9 w-full max-w-xs rounded-lg border border-input bg-background px-2 text-sm"
              value={historyMaxEntries}
              onChange={(event) => onHistoryMaxEntriesChange(Number(event.target.value) as HistoryLimit)}
            >
              {HISTORY_LIMIT_OPTIONS.map((limit) => (
                <option key={limit} value={limit}>
                  {limit}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!ready}
              onClick={() => void exportLocalMemory(repository)}
            >
              <Download /> Export backup
            </Button>
            <Button type="button" variant="outline" disabled={!ready} onClick={() => fileInput.current?.click()}>
              <FileInput /> Import backup
            </Button>
            <Input
              ref={fileInput}
              className="hidden"
              type="file"
              accept="application/json,.json"
              onChange={(event) => void importBackup(event.target.files?.[0])}
            />
          </div>
          {pending && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">Backup ready to restore</p>
              <p className="text-muted-foreground">
                Version {pending.preview.version}: {pending.preview.historyCount} history entries,{" "}
                {pending.preview.promptCount} prompts, {pending.preview.folderCount} folders.
              </p>
              <Button type="button" className="mt-3" size="sm" onClick={() => void confirmImport()}>
                Restore this backup
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button type="button" variant="destructive" disabled={!ready} onClick={() => void clearHistory()}>
              <Trash2 /> Clear history
            </Button>
            <Button type="button" variant="destructive" disabled={!ready} onClick={() => void clearLibrary()}>
              <Eraser /> Clear library
            </Button>
            <Button type="button" variant="destructive" disabled={!ready} onClick={() => void onClearAll()}>
              <Trash2 /> Clear all local data
            </Button>
          </div>
          {memoryStatus === "loading" && <p className="text-muted-foreground text-sm">Opening local storage…</p>}
          {memoryStatus === "unavailable" && (
            <p className="text-destructive text-sm">
              Local storage is unavailable. Your current workspace still works.
            </p>
          )}
          {message && (
            <p className="text-muted-foreground text-sm" role="status">
              {message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
