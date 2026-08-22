"use client";

import type { Table } from "dexie";

import { getPromptDatabase } from "./database.client";
import { createSavedPromptFromHistory, normalizeFolderName, normalizeTags } from "./record-utils";
import {
  type FolderRecord,
  type HistoryRecord,
  type MemoryExportData,
  MemoryRepositoryError,
  type SavedPrompt,
  type SavedPromptChanges,
} from "./types";

function errorCode(error: unknown, fallback: MemoryRepositoryError["code"]): MemoryRepositoryError["code"] {
  const name = error instanceof DOMException ? error.name : error instanceof Error ? error.name : "";
  if (
    name === "QuotaExceededError" ||
    (error as { inner?: { name?: string } } | null)?.inner?.name === "QuotaExceededError"
  ) {
    return "quota";
  }
  if (name === "MissingAPIError") return "unavailable";
  if (name === "VersionError" || name === "UpgradeError") return "open";
  return fallback;
}

function wrapError(error: unknown, fallback: MemoryRepositoryError["code"]): MemoryRepositoryError {
  if (error instanceof MemoryRepositoryError) return error;
  return new MemoryRepositoryError(errorCode(error, fallback), "Local memory is unavailable for this action.", {
    cause: error,
  });
}

async function safe<T>(operation: () => Promise<T>, fallback: MemoryRepositoryError["code"] = "unknown"): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw wrapError(error, fallback);
  }
}

function wait<T>(value: PromiseLike<T>): Promise<T> {
  return new Promise((resolve, reject) => value.then(resolve, reject));
}

function promptTable(): Table<SavedPrompt, string> {
  return getPromptDatabase().prompts;
}

export const memoryRepository = {
  open: () => safe(() => getPromptDatabase().open(), "open"),

  addHistoryAndPrune: (record: HistoryRecord, limit = 500) =>
    safe(async () => {
      const db = getPromptDatabase();
      await wait(
        db.transaction("rw", db.history, async () => {
          await wait(db.history.add({ ...record, sectionIds: [...record.sectionIds] }));
          const count = await db.history.count();
          if (count <= limit) return;
          const excess = await db.history
            .orderBy("createdAt")
            .limit(count - limit)
            .toArray();
          await wait(db.history.bulkDelete(excess.map((item) => item.id)));
        }),
      );
    }, "write"),

  getHistory: (id: string) => safe(() => getPromptDatabase().history.get(id), "open"),
  listHistory: () => safe(() => getPromptDatabase().history.orderBy("createdAt").reverse().toArray(), "open"),
  deleteHistory: (id: string) => safe(() => getPromptDatabase().history.delete(id), "write"),
  clearHistory: () => safe(() => getPromptDatabase().history.clear(), "write"),
  pruneHistory: (limit: number) =>
    safe(async () => {
      const db = getPromptDatabase();
      const count = await db.history.count();
      if (count <= limit) return;
      const excess = await db.history
        .orderBy("createdAt")
        .limit(count - limit)
        .toArray();
      await wait(db.history.bulkDelete(excess.map((item) => item.id)));
    }, "write"),

  createPrompt: (record: SavedPrompt) =>
    safe(
      () => promptTable().add({ ...record, tags: normalizeTags(record.tags), sectionIds: [...record.sectionIds] }),
      "write",
    ).then(() => undefined),

  updatePrompt: (id: string, changes: SavedPromptChanges) =>
    safe(async () => {
      const db = getPromptDatabase();
      return db.transaction("rw", db.prompts, async () => {
        const current = await db.prompts.get(id);
        if (!current) throw new MemoryRepositoryError("write", "That saved prompt no longer exists.");
        const next = {
          ...current,
          ...changes,
          title: changes.title?.trim().slice(0, 120) ?? current.title,
          tags: changes.tags ? normalizeTags(changes.tags) : current.tags,
          updatedAt: changes.updatedAt,
        };
        await wait(db.prompts.put(next));
        return next;
      });
    }, "write"),

  getPrompt: (id: string) => safe(() => promptTable().get(id), "open"),
  listPrompts: () => safe(() => promptTable().orderBy("updatedAt").reverse().toArray(), "open"),
  deletePrompt: (id: string) => safe(() => promptTable().delete(id), "write"),

  clearLibrary: () =>
    safe(async () => {
      const db = getPromptDatabase();
      await wait(
        db.transaction("rw", db.prompts, db.folders, async () => {
          await wait(db.prompts.clear());
          await wait(db.folders.clear());
        }),
      );
    }, "write"),

  clearAll: () =>
    safe(async () => {
      const db = getPromptDatabase();
      await wait(
        db.transaction("rw", db.history, db.prompts, db.folders, async () => {
          await wait(db.history.clear());
          await wait(db.prompts.clear());
          await wait(db.folders.clear());
        }),
      );
    }, "write"),

  duplicatePrompt: (id: string) =>
    safe(async () => {
      const db = getPromptDatabase();
      return db.transaction("rw", db.prompts, async () => {
        const current = await db.prompts.get(id);
        if (!current) throw new MemoryRepositoryError("write", "That saved prompt no longer exists.");
        const now = Date.now();
        const copy: SavedPrompt = {
          ...current,
          id: crypto.randomUUID(),
          title: `${current.title} Copy`.slice(0, 120),
          createdAt: now,
          updatedAt: now,
          favorite: false,
        };
        await wait(db.prompts.add(copy));
        return copy;
      });
    }, "write"),

  promoteHistory: (id: string) =>
    safe(async () => {
      const db = getPromptDatabase();
      return db.transaction("rw", db.history, db.prompts, async () => {
        const history = await db.history.get(id);
        if (!history) throw new MemoryRepositoryError("write", "That history entry no longer exists.");
        const prompt = createSavedPromptFromHistory(history, Date.now(), crypto.randomUUID());
        await wait(db.prompts.add(prompt));
        return prompt;
      });
    }, "write"),

  createFolder: (record: FolderRecord) =>
    safe(async () => {
      const db = getPromptDatabase();
      const normalized = normalizeFolderName(record.name);
      await wait(db.folders.add({ ...record, ...normalized }));
    }, "write"),

  renameFolder: (id: string, name: string) =>
    safe(async () => {
      const db = getPromptDatabase();
      const normalized = normalizeFolderName(name);
      await wait(db.folders.update(id, { ...normalized, updatedAt: Date.now() }));
    }, "write"),

  listFolders: () => safe(() => getPromptDatabase().folders.orderBy("updatedAt").toArray(), "open"),

  deleteFolderAndUnassign: (id: string) =>
    safe(async () => {
      const db = getPromptDatabase();
      await wait(
        db.transaction("rw", db.folders, db.prompts, async () => {
          await wait(db.folders.delete(id));
          await wait(db.prompts.where("folderId").equals(id).modify({ folderId: null, updatedAt: Date.now() }));
        }),
      );
    }, "write"),

  exportSnapshot: () =>
    safe(async (): Promise<MemoryExportData> => {
      const db = getPromptDatabase();
      return db.transaction("r", db.history, db.prompts, db.folders, async () => ({
        history: await db.history.toArray(),
        prompts: await db.prompts.toArray(),
        folders: await db.folders.toArray(),
      }));
    }, "open"),

  replaceSnapshot: (data: MemoryExportData) =>
    safe(async () => {
      const db = getPromptDatabase();
      await wait(
        db.transaction("rw", db.history, db.prompts, db.folders, async () => {
          await wait(db.history.clear());
          await wait(db.prompts.clear());
          await wait(db.folders.clear());
          if (data.history.length > 0)
            await wait(
              db.history.bulkAdd(data.history.map((record) => ({ ...record, sectionIds: [...record.sectionIds] }))),
            );
          if (data.prompts.length > 0)
            await wait(
              db.prompts.bulkAdd(
                data.prompts.map((record) => ({
                  ...record,
                  sectionIds: [...record.sectionIds],
                  tags: [...record.tags],
                })),
              ),
            );
          if (data.folders.length > 0) await wait(db.folders.bulkAdd(data.folders.map((record) => ({ ...record }))));
        }),
      );
    }, "write"),
};

export type MemoryRepository = typeof memoryRepository;
