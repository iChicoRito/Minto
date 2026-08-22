import type { HistoryRecord, SavedPrompt } from "./types";

export function titleFromPrompt(prompt: string): string {
  const title = prompt.trim().replace(/\s+/g, " ").slice(0, 80);
  return title || "Untitled Prompt";
}

export function normalizeTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))]
    .slice(0, 20)
    .map((tag) => tag.slice(0, 40));
}

export function normalizeFolderName(name: string): { name: string; nameKey: string } {
  const normalized = name.trim().slice(0, 80);
  return { name: normalized, nameKey: normalized.toLowerCase() };
}

export function createSavedPromptFromHistory(history: HistoryRecord, now: number, id: string): SavedPrompt {
  return {
    id,
    sourceHistoryId: history.id,
    createdAt: now,
    updatedAt: now,
    title: titleFromPrompt(history.originalPrompt),
    originalPrompt: history.originalPrompt,
    enhancedPrompt: history.enhancedPrompt,
    requestedTaskType: history.requestedTaskType,
    taskType: history.taskType,
    category: history.category,
    level: history.level,
    sectionIds: [...history.sectionIds],
    presetId: history.presetId,
    favorite: false,
    folderId: null,
    tags: [],
  };
}

export function filterLibraryPrompts(
  prompts: readonly SavedPrompt[],
  query: {
    search?: string;
    favorite?: boolean;
    category?: SavedPrompt["category"];
    folderId?: string | null;
    tags?: readonly string[];
  },
): SavedPrompt[] {
  const search = query.search?.trim().toLowerCase();
  const tags = normalizeTags(query.tags ?? []);
  return prompts.filter((prompt) => {
    const haystack = [prompt.title, prompt.originalPrompt, prompt.enhancedPrompt, ...prompt.tags]
      .join(" ")
      .toLowerCase();
    return (
      (!search || haystack.includes(search)) &&
      (query.favorite === undefined || prompt.favorite === query.favorite) &&
      (!query.category || prompt.category === query.category) &&
      (query.folderId === undefined || prompt.folderId === query.folderId) &&
      tags.every((tag) => prompt.tags.includes(tag))
    );
  });
}
