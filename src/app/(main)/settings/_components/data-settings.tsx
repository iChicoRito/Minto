"use client";

import { useRef, useState } from "react";

import { Download, FileInput, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useConfirm } from "@/hooks/use-confirm";
import { exportLocalMemory, readBackupFile, restoreLocalMemory } from "@/lib/browser-memory/backup.client";
import type { BackupPreview, ParsedBackup } from "@/lib/browser-memory/backup-schema";
import type { MemoryRepository } from "@/lib/browser-memory/repository.client";
import { HISTORY_LIMIT_OPTIONS, type HistoryLimit } from "@/lib/preferences/prompt-preferences";

export function DataSettings({
  historyMaxEntries,
  memoryStatus,
  repository,
  onHistoryMaxEntriesChange,
  onClearAll,
}: {
  historyMaxEntries: HistoryLimit;
  memoryStatus: "loading" | "ready" | "unavailable";
  repository: MemoryRepository;
  onHistoryMaxEntriesChange: (limit: HistoryLimit) => void;
  onClearAll: () => Promise<void>;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ backup: ParsedBackup; preview: BackupPreview } | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const ready = memoryStatus === "ready";
  const { confirm, dialog } = useConfirm();

  const runAction = async (
    key: string,
    action: () => Promise<void>,
    successMessage: string,
    failureMessage: string,
  ) => {
    setPendingAction(key);
    try {
      await action();
      toast.success(successMessage);
      setMessage(null);
    } catch {
      toast.error(failureMessage);
      setMessage(failureMessage);
    } finally {
      setPendingAction(null);
    }
  };

  const clearHistory = () =>
    runAction(
      "clear-history",
      async () => {
        if (!ready) throw new Error("cancelled");
        const confirmed = await confirm({
          title: "Clear local history?",
          description: "Saved library prompts will remain.",
          confirmLabel: "Clear history",
          destructive: true,
        });
        if (!confirmed) throw new Error("cancelled");
        await repository.clearHistory();
      },
      "Local history cleared.",
      "History could not be cleared.",
    );

  const clearLibrary = () =>
    runAction(
      "clear-library",
      async () => {
        if (!ready) throw new Error("cancelled");
        const confirmed = await confirm({
          title: "Clear the local library and folders?",
          description: "History will remain.",
          confirmLabel: "Clear library",
          destructive: true,
        });
        if (!confirmed) throw new Error("cancelled");
        await repository.clearLibrary();
      },
      "Local library and folders cleared.",
      "The library could not be cleared.",
    );

  const exportBackup = () =>
    runAction("export", () => exportLocalMemory(repository), "Backup exported.", "The backup could not be exported.");

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPending(await readBackupFile(file));
      setMessage(null);
      toast.success("Backup read. Review it below before restoring.");
    } catch (error) {
      setPending(null);
      const failureMessage = error instanceof Error ? error.message : "This backup could not be read.";
      setMessage(failureMessage);
      toast.error(failureMessage);
    }
  };

  const confirmImport = async () => {
    if (!pending || !ready) return;
    const { preview, backup } = pending;
    const confirmed = await confirm({
      title: "Replace local data with this backup?",
      description: `${preview.historyCount} history entries, ${preview.promptCount} prompts, and ${preview.folderCount} folders will be restored.`,
      confirmLabel: "Restore backup",
      destructive: true,
    });
    if (!confirmed) return;
    await runAction(
      "restore",
      async () => {
        await restoreLocalMemory(repository, backup);
      },
      "Backup restored. Reloadingâ€¦",
      "The backup could not be restored.",
    );
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Local data</CardTitle>
          <CardDescription>Prompts and history stay in this browser. They are not encrypted or synced.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="history-max-entries" className="font-medium text-sm">
              Maximum history entries
            </Label>
            <Select
              value={String(historyMaxEntries)}
              onValueChange={(value) => onHistoryMaxEntriesChange(Number(value) as HistoryLimit)}
            >
              <SelectTrigger id="history-max-entries" className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {HISTORY_LIMIT_OPTIONS.map((limit) => (
                  <SelectItem key={limit} value={String(limit)}>
                    {limit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!ready || pendingAction !== null}
              onClick={() => void exportBackup()}
            >
              {pendingAction === "export" ? <Spinner /> : <Download />} Export backup
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!ready || pendingAction !== null}
              onClick={() => fileInput.current?.click()}
            >
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
            <Button
              type="button"
              variant="destructive"
              disabled={!ready || pendingAction !== null}
              onClick={() => void clearHistory()}
            >
              {pendingAction === "clear-history" && <Spinner />} <Trash2 /> Clear history
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!ready || pendingAction !== null}
              onClick={() => void clearLibrary()}
            >
              {pendingAction === "clear-library" && <Spinner />} Clear library
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!ready || pendingAction !== null}
              onClick={() => void onClearAll()}
            >
              {pendingAction === "clear-all" && <Spinner />} <Trash2 /> Clear all local data
            </Button>
          </div>
          {memoryStatus === "loading" && <p className="text-muted-foreground text-sm">Opening local storageâ€¦</p>}
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
      {dialog}
    </div>
  );
}
