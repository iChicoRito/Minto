"use client";

import Dexie, { type Table } from "dexie";

import type { FolderRecord, HistoryRecord, SavedPrompt } from "./types";

export class PromptDatabase extends Dexie {
  history!: Table<HistoryRecord, string>;
  prompts!: Table<SavedPrompt, string>;
  folders!: Table<FolderRecord, string>;

  constructor() {
    super("prompt-enhancer");
    this.version(1).stores({
      history: "&id, createdAt, taskType, category, level",
      prompts: "&id, updatedAt, createdAt, folderId, *tags, taskType, category, level, sourceHistoryId",
      folders: "&id, &nameKey, updatedAt",
    });
  }
}

let database: PromptDatabase | null = null;

export function getPromptDatabase(): PromptDatabase {
  database ??= new PromptDatabase();
  return database;
}
