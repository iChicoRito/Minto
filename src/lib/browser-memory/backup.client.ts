"use client";

import { requestTextDownload } from "@/lib/browser-actions.client";
import { PREFERENCE_SNAPSHOT_KEYS, type PreferenceSnapshot } from "@/lib/preferences/preference-snapshot";
import { PREFERENCE_PERSISTENCE } from "@/lib/preferences/preferences-config";
import { applyThemeMode } from "@/lib/preferences/theme-utils";

import { readPreferenceSnapshot } from "../preferences/preference-snapshot.client";
import { persistPreference } from "../preferences/preferences-storage";
import { type BackupPreview, type ParsedBackup, parseBackup } from "./backup-schema";
import type { MemoryRepository } from "./repository.client";
import type { MemoryExportData } from "./types";

const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

export async function exportLocalMemory(repository: MemoryRepository): Promise<void> {
  const backup = {
    format: "prompt-enhancer-backup" as const,
    version: 2 as const,
    exportedAt: new Date().toISOString(),
    settings: readPreferenceSnapshot(),
    data: await repository.exportSnapshot(),
  };
  requestTextDownload("prompt-enhancer-backup.json", JSON.stringify(backup, null, 2), "application/json;charset=utf-8");
}

export async function readBackupFile(file: File): Promise<{ backup: ParsedBackup; preview: BackupPreview }> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error("This backup is larger than the 20 MiB import limit.");
  let value: unknown;
  try {
    value = JSON.parse(await file.text()) as unknown;
  } catch {
    throw new Error("This backup is not valid JSON.");
  }
  const result = parseBackup(value);
  if ("error" in result) throw new Error(result.error);
  return result;
}

async function applyPreferenceSnapshot(snapshot: PreferenceSnapshot): Promise<void> {
  for (const key of PREFERENCE_SNAPSHOT_KEYS) {
    await persistPreference(key, snapshot[key], { throwOnError: true });
    document.documentElement.setAttribute(`data-${key.replaceAll("_", "-")}`, snapshot[key]);
  }
  applyThemeMode(snapshot.theme_mode);
}

export async function restoreLocalMemory(repository: MemoryRepository, backup: ParsedBackup): Promise<void> {
  const currentSettings = readPreferenceSnapshot();
  const currentData: MemoryExportData = await repository.exportSnapshot();
  const nextSettings = backup.version === 1 ? currentSettings : backup.settings;
  try {
    await repository.replaceSnapshot(backup.data);
    await applyPreferenceSnapshot(nextSettings);
  } catch (error) {
    try {
      await repository.replaceSnapshot(currentData);
      await applyPreferenceSnapshot(currentSettings);
    } catch {
      throw new Error("Restore failed and local data could not be rolled back.", { cause: error });
    }
    throw error;
  }
}

export { MAX_BACKUP_BYTES, PREFERENCE_PERSISTENCE };
