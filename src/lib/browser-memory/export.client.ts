"use client";

import { requestTextDownload } from "../browser-actions.client";
import type { MemoryRepository } from "./repository.client";
import type { PromptEnhancerBackupV1 } from "./types";

export async function exportLocalMemory(repository: MemoryRepository): Promise<void> {
  const data = await repository.exportSnapshot();
  const backup: PromptEnhancerBackupV1 = {
    format: "prompt-enhancer-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
  const date = new Date().toISOString().slice(0, 10);
  requestTextDownload(
    `prompt-enhancer-backup-${date}.json`,
    JSON.stringify(backup, null, 2),
    "application/json;charset=utf-8",
  );
}
