import type { SectionId } from "../../prompt-engine/templates/template-types";
import type { EnhancementLevel, PromptCategory, PromptTaskType } from "../../prompt-engine/types";
import type { GenerationDescriptor } from "../ai-enhancement/contracts";
import type { PromptPresetId } from "../prompt-presets";

export type HistoryRecord = {
  id: string;
  createdAt: number;
  originalPrompt: string;
  enhancedPrompt: string;
  requestedTaskType: "auto" | PromptTaskType;
  taskType: PromptTaskType;
  category: PromptCategory;
  level: EnhancementLevel;
  sectionIds: SectionId[];
  presetId: PromptPresetId | null;
  generation?: GenerationDescriptor;
};

export type SavedPrompt = {
  id: string;
  sourceHistoryId: string | null;
  createdAt: number;
  updatedAt: number;
  title: string;
  originalPrompt: string;
  enhancedPrompt: string;
  requestedTaskType: "auto" | PromptTaskType;
  taskType: PromptTaskType;
  category: PromptCategory;
  level: EnhancementLevel;
  sectionIds: SectionId[];
  presetId: PromptPresetId | null;
  favorite: boolean;
  folderId: string | null;
  tags: string[];
  generation?: GenerationDescriptor;
};

export type FolderRecord = {
  id: string;
  name: string;
  nameKey: string;
  createdAt: number;
  updatedAt: number;
};

export type SavedPromptChanges = Partial<
  Pick<SavedPrompt, "title" | "enhancedPrompt" | "favorite" | "folderId" | "tags">
> & {
  updatedAt: number;
};

export type MemoryExportData = {
  history: HistoryRecord[];
  prompts: SavedPrompt[];
  folders: FolderRecord[];
};

export type PromptEnhancerBackupV1 = {
  format: "prompt-enhancer-backup";
  version: 1;
  exportedAt: string;
  data: MemoryExportData;
};

export type PromptEnhancerBackupV2 = {
  format: "prompt-enhancer-backup";
  version: 2;
  exportedAt: string;
  settings: import("../preferences/preference-snapshot").PreferenceSnapshot;
  data: MemoryExportData;
};

export type MemoryErrorCode = "unavailable" | "blocked" | "quota" | "open" | "write" | "unknown";

export class MemoryRepositoryError extends Error {
  constructor(
    public readonly code: MemoryErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "MemoryRepositoryError";
  }
}
