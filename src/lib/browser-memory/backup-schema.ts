import { z } from "zod";

import { defaultPreferenceSnapshot, type PreferenceSnapshot } from "../preferences/preference-snapshot";
import type { MemoryExportData } from "./types";

const ID = z.string().trim().min(1).max(128);
const PROMPT_TEXT = z.string().max(1_000_000);
const TASK_TYPES = [
  "bug-fix",
  "feature",
  "code-review",
  "refactor",
  "testing",
  "documentation",
  "rewrite",
  "summarize",
  "research",
  "comparison",
  "ui-review",
  "image-prompt",
  "general",
] as const;
const CATEGORIES = ["development", "writing", "research", "design", "general"] as const;
const LEVELS = ["light", "standard", "detailed"] as const;
const SECTION_ID = z.string().trim().min(1).max(80);

const historySchema = z
  .object({
    id: ID,
    createdAt: z.number().finite(),
    originalPrompt: PROMPT_TEXT,
    enhancedPrompt: PROMPT_TEXT,
    requestedTaskType: z.enum(["auto", ...TASK_TYPES]),
    taskType: z.enum(TASK_TYPES),
    category: z.enum(CATEGORIES),
    level: z.enum(LEVELS),
    sectionIds: z.array(SECTION_ID).max(80),
    presetId: z.string().max(128).nullable(),
  })
  .strict();

const promptSchema = z
  .object({
    id: ID,
    sourceHistoryId: ID.nullable(),
    createdAt: z.number().finite(),
    updatedAt: z.number().finite(),
    title: z.string().max(120),
    originalPrompt: PROMPT_TEXT,
    enhancedPrompt: PROMPT_TEXT,
    requestedTaskType: z.enum(["auto", ...TASK_TYPES]),
    taskType: z.enum(TASK_TYPES),
    category: z.enum(CATEGORIES),
    level: z.enum(LEVELS),
    sectionIds: z.array(SECTION_ID).max(80),
    presetId: z.string().max(128).nullable(),
    favorite: z.boolean(),
    folderId: ID.nullable(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20),
  })
  .strict();

const folderSchema = z
  .object({
    id: ID,
    name: z.string().trim().min(1).max(80),
    nameKey: z.string().trim().min(1).max(80),
    createdAt: z.number().finite(),
    updatedAt: z.number().finite(),
  })
  .strict();

const dataSchema = z
  .object({
    history: z.array(historySchema).max(1000),
    prompts: z.array(promptSchema).max(10_000),
    folders: z.array(folderSchema).max(10_000),
  })
  .strict();

const settingsSchema = z
  .object({
    theme_mode: z.enum(["light", "dark", "system"]),
    theme_preset: z.string().trim().min(1).max(80),
    font: z.string().trim().min(1).max(80),
    content_layout: z.string().trim().min(1).max(80),
    navbar_style: z.string().trim().min(1).max(80),
    sidebar_variant: z.string().trim().min(1).max(80),
    sidebar_collapsible: z.string().trim().min(1).max(80),
    default_enhancement_level: z.enum(LEVELS),
    default_prompt_sections: z.string().max(500),
    default_prompt_type: z.enum(["auto", ...TASK_TYPES]),
    history_enabled: z.enum(["true", "false"]),
    history_max_entries: z.enum(["100", "250", "500", "1000"]),
  })
  .strict();

const baseBackupSchema = z
  .object({
    format: z.literal("prompt-enhancer-backup"),
    version: z.literal(1),
    exportedAt: z.string().trim().min(1).max(80),
    data: dataSchema,
  })
  .strict();

const v2BackupSchema = z
  .object({
    format: z.literal("prompt-enhancer-backup"),
    version: z.literal(2),
    exportedAt: z.string().trim().min(1).max(80),
    settings: settingsSchema,
    data: dataSchema,
  })
  .strict();

export type ParsedBackup = {
  version: 1 | 2;
  exportedAt: string;
  settings: PreferenceSnapshot;
  data: MemoryExportData;
};

export type BackupPreview = {
  version: 1 | 2;
  exportedAt: string;
  historyCount: number;
  promptCount: number;
  folderCount: number;
  settingsChanged: boolean;
};

function hasUniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function refineData(data: z.infer<typeof dataSchema>): string | null {
  if (!hasUniqueValues(data.history.map((record) => record.id))) return "History contains duplicate IDs.";
  if (!hasUniqueValues(data.prompts.map((record) => record.id))) return "Library contains duplicate IDs.";
  if (!hasUniqueValues(data.folders.map((record) => record.id))) return "Folders contain duplicate IDs.";
  if (!hasUniqueValues(data.folders.map((record) => record.nameKey))) return "Folder names must be unique.";

  const folderIds = new Set(data.folders.map((folder) => folder.id));
  if (data.prompts.some((prompt) => prompt.folderId !== null && !folderIds.has(prompt.folderId))) {
    return "A saved prompt references a missing folder.";
  }
  return null;
}

export function parseBackup(input: unknown): { backup: ParsedBackup; preview: BackupPreview } | { error: string } {
  const parsed = v2BackupSchema.safeParse(input);
  if (parsed.success) {
    const dataError = refineData(parsed.data.data);
    if (dataError) return { error: dataError };
    const settings = parsed.data.settings as PreferenceSnapshot;
    return {
      backup: { version: 2, exportedAt: parsed.data.exportedAt, settings, data: parsed.data.data as MemoryExportData },
      preview: createPreview(2, parsed.data.exportedAt, settings, parsed.data.data),
    };
  }

  const legacy = baseBackupSchema.safeParse(input);
  if (!legacy.success) return { error: "This backup is invalid or uses an unsupported version." };
  const dataError = refineData(legacy.data.data);
  if (dataError) return { error: dataError };
  const settings = defaultPreferenceSnapshot();
  return {
    backup: { version: 1, exportedAt: legacy.data.exportedAt, settings, data: legacy.data.data as MemoryExportData },
    preview: createPreview(1, legacy.data.exportedAt, settings, legacy.data.data),
  };
}

function createPreview(
  version: 1 | 2,
  exportedAt: string,
  settings: PreferenceSnapshot,
  data: z.infer<typeof dataSchema>,
): BackupPreview {
  return {
    version,
    exportedAt,
    historyCount: data.history.length,
    promptCount: data.prompts.length,
    folderCount: data.folders.length,
    settingsChanged: JSON.stringify(settings) !== JSON.stringify(defaultPreferenceSnapshot()),
  };
}

export { dataSchema, settingsSchema, v2BackupSchema };
