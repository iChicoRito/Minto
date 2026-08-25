"use client";

import { useRef, useState } from "react";

import { Download, Info, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useConfirm } from "@/hooks/use-confirm";
import { exportLocalMemory, readBackupFile, restoreLocalMemory } from "@/lib/browser-memory/backup.client";
import { defaultPreferenceSnapshot, PREFERENCE_SNAPSHOT_KEYS } from "@/lib/preferences/preference-snapshot";
import { persistPreference } from "@/lib/preferences/preferences-storage";
import {
  applyPromptPreferenceAttribute,
  HISTORY_LIMIT_OPTIONS,
  type HistoryLimit,
  PROMPT_SECTION_IDS,
  type PromptPreferenceSectionId,
  serializePromptSections,
} from "@/lib/preferences/prompt-preferences";
import { applyThemeMode } from "@/lib/preferences/theme-utils";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { useMemory } from "../../_components/memory-provider";
import { DataSettings } from "./data-settings";

const SECTION_LABELS: Record<PromptPreferenceSectionId, string> = {
  objective: "Objective",
  requirements: "Requirements",
  constraints: "Constraints",
  verification: "Verification",
  "acceptance-criteria": "Acceptance Criteria",
};

function InfoTip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="More info"
          className="inline-flex text-muted-foreground hover:text-foreground"
        >
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-60 text-xs">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function SettingsScreen() {
  const preferences = usePreferencesStore((state) => state);
  const { status: memoryStatus, repository } = useMemory();
  const { confirm, dialog } = useConfirm();
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const save = (key: Parameters<typeof persistPreference>[0], value: string) => {
    applyPromptPreferenceAttribute(
      key === "default_enhancement_level"
        ? "default-enhancement-level"
        : key === "default_prompt_sections"
          ? "default-prompt-sections"
          : key === "default_prompt_type"
            ? "default-prompt-type"
            : key === "history_max_entries"
              ? "history-max-entries"
              : "history-enabled",
      value,
    );
    void persistPreference(key, value).catch(() => setMessage("The preference could not be saved."));
  };

  const updateSections = (section: PromptPreferenceSectionId) => {
    const current = preferences.defaultPromptSections;
    const next = current.includes(section) ? current.filter((item) => item !== section) : [...current, section];
    const normalized = serializePromptSections(next);
    const parsed = normalized.split(",") as PromptPreferenceSectionId[];
    preferences.setDefaultPromptSections(parsed);
    save("default_prompt_sections", normalized);
  };

  const clearAll = async () => {
    const confirmed = await confirm({
      title: "Clear all local data?",
      description: "Clear all local prompts, history, folders, and settings? This cannot be undone.",
      confirmLabel: "Clear everything",
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await repository.clearAll();
      const defaults = defaultPreferenceSnapshot();
      for (const key of PREFERENCE_SNAPSHOT_KEYS) await persistPreference(key, defaults[key], { throwOnError: true });
      window.location.reload();
    } catch {
      setMessage("All local data could not be cleared. Nothing was reloaded.");
    }
  };

  const handleExport = async () => {
    try {
      await exportLocalMemory(repository);
      toast.success("Backup exported.");
    } catch {
      toast.error("The backup could not be exported.");
      setMessage("The backup could not be exported.");
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { preview, backup } = await readBackupFile(file);
      const confirmed = await confirm({
        title: "Replace local data with this backup?",
        description: `${preview.historyCount} history entries, ${preview.promptCount} prompts, and ${preview.folderCount} folders will be restored.`,
        confirmLabel: "Restore backup",
        destructive: true,
      });
      if (!confirmed) return;
      await restoreLocalMemory(repository, backup);
      toast.success("Backup restored. Reloading…");
      window.location.reload();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "This backup could not be read.";
      setMessage(msg);
      toast.error(msg);
    } finally {
      // biome-ignore lint/suspicious/noUnnecessaryConditions: input ref may be null before mount
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const maxOptions = HISTORY_LIMIT_OPTIONS as readonly number[];

  return (
    <TooltipProvider>
      <div className="space-y-5">
        <Tabs defaultValue="general">
          <TabsList variant="line" className="justify-start gap-6 rounded-none border-b bg-transparent p-0">
            <TabsTrigger value="general" className="rounded-none border-0 px-0 pb-2 data-active:shadow-none">
              General
            </TabsTrigger>
            <TabsTrigger value="sections" className="rounded-none border-0 px-0 pb-2 data-active:shadow-none">
              Sections
            </TabsTrigger>
            <TabsTrigger value="appearance" className="rounded-none border-0 px-0 pb-2 data-active:shadow-none">
              Appearance
            </TabsTrigger>
            <TabsTrigger value="data" className="rounded-none border-0 px-0 pb-2 data-active:shadow-none">
              Data
            </TabsTrigger>
          </TabsList>

          {/* General tab: matches reference — Defaults + History Settings + Local Data */}
          <TabsContent value="general" className="space-y-4 pt-4">
            {/* Defaults */}
            <Card className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Defaults</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <span className="inline-flex items-center gap-1.5 font-medium text-sm">
                        Default Enhancement Level <InfoTip content="Controls how much structure is added on enhance." />
                      </span>
                      <Select
                        value={preferences.defaultEnhancementLevel}
                        onValueChange={(value) => {
                          const typed = value as typeof preferences.defaultEnhancementLevel;
                          preferences.setDefaultEnhancementLevel(typed);
                          save("default_enhancement_level", typed);
                        }}
                      >
                        <SelectTrigger aria-label="Default enhancement level" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="detailed">Detailed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="inline-flex items-center gap-1.5 font-medium text-sm">
                      Include Sections by Default{" "}
                      <InfoTip content="Objective is always included. Others are optional." />
                    </span>
                    <div className="space-y-2.5 pt-1">
                      {PROMPT_SECTION_IDS.map((section) => {
                        const sectionId = `default-section-${section}`;
                        const isObjective = section === "objective";
                        return (
                          <div key={section} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              id={sectionId}
                              checked={preferences.defaultPromptSections.includes(section)}
                              disabled={isObjective}
                              onCheckedChange={() => updateSections(section)}
                            />
                            <Label htmlFor={sectionId} className="font-normal">
                              {SECTION_LABELS[section]}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* History Settings */}
            <Card className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">History Settings</CardTitle>
                <CardDescription>Control how your prompt history is saved and managed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-0 p-0 px-6 pb-6">
                <div className="flex items-start justify-between gap-4 py-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 font-medium text-sm">
                      Save history locally <InfoTip content="When off, new enhancements won't be added to history." />
                    </span>
                    <p className="text-muted-foreground text-xs">Store your prompt history on this device.</p>
                  </div>
                  <Switch
                    checked={preferences.historyEnabled}
                    onCheckedChange={(checked) => {
                      preferences.setHistoryEnabled(checked);
                      save("history_enabled", String(checked));
                    }}
                    aria-label="Save history locally"
                  />
                </div>
                <div className="flex items-center justify-between gap-4 border-t pt-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 font-medium text-sm">
                      Max history items <InfoTip content="Oldest entries are pruned when the limit is exceeded." />
                    </span>
                    <p className="text-muted-foreground text-xs">
                      Set the maximum number of history items to keep locally.
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Select
                      value={String(preferences.historyMaxEntries)}
                      onValueChange={(value) => {
                        const limit = Number(value) as HistoryLimit;
                        preferences.setHistoryMaxEntries(limit);
                        save("history_max_entries", String(limit));
                        if (memoryStatus === "ready") void repository.pruneHistory(limit);
                      }}
                    >
                      <SelectTrigger
                        aria-label="Max history items"
                        className="w-28 justify-between bg-muted/20"
                        size="sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {maxOptions.map((limit) => (
                          <SelectItem key={limit} value={String(limit)}>
                            {limit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Local Data */}
            <Card className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Local Data</CardTitle>
                <CardDescription>
                  Manage your local data. This includes history and any saved preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-0 p-0 px-6 pb-6">
                <div className="flex items-center justify-between gap-4 py-4">
                  <div className="space-y-0.5">
                    <span className="inline-flex items-center gap-1.5 font-medium text-sm">
                      Export backup <InfoTip content="Download a JSON backup of your local data." />
                    </span>
                    <p className="text-muted-foreground text-xs">Download a backup of your local data.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => void handleExport()}>
                    <Download className="size-4" /> Export
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-4 border-t py-4">
                  <div className="space-y-0.5">
                    <span className="inline-flex items-center gap-1.5 font-medium text-sm">
                      Import backup <InfoTip content="Restore from a previously exported JSON file." />
                    </span>
                    <p className="text-muted-foreground text-xs">Import a previously exported backup file.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleImportClick}>
                    <Upload className="size-4" /> Import
                  </Button>
                </div>
                <div className="mt-4 rounded-lg border border-destructive/30">
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-0.5">
                      <span className="inline-flex items-center gap-1.5 font-medium text-destructive text-sm">
                        Clear local data{" "}
                        <InfoTip content="Permanently deletes all prompts, history, folders, and settings on this device." />
                      </span>
                      <p className="text-muted-foreground text-xs">
                        Permanently delete all local data from this device.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground dark:border-destructive/40"
                      onClick={() => void clearAll()}
                    >
                      <Trash2 className="size-4" /> Clear Data
                    </Button>
                  </div>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(event) => void handleImportFile(event.target.files?.[0])}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sections" className="pt-4">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-sm">Default sections</CardTitle>
                <CardDescription>Objective is always included. The other sections are optional.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {PROMPT_SECTION_IDS.map((section) => {
                  const sectionId = `default-section-tab-${section}`;
                  return (
                    <div key={section} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        id={sectionId}
                        checked={preferences.defaultPromptSections.includes(section)}
                        disabled={section === "objective"}
                        onCheckedChange={() => updateSections(section)}
                      />
                      <Label htmlFor={sectionId} className="font-normal">
                        {SECTION_LABELS[section]}
                      </Label>
                    </div>
                  );
                })}
                {preferences.defaultPromptSections.length === 0 && (
                  <p className="text-destructive text-sm">Choose at least Objective.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="pt-4">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-sm">Appearance</CardTitle>
                <CardDescription>Choose how the interface follows your device.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="theme-mode" className="font-medium text-sm">
                  Color mode
                </Label>
                <Select
                  value={preferences.themeMode}
                  onValueChange={(value) => {
                    const typed = value as typeof preferences.themeMode;
                    preferences.setThemeMode(typed);
                    applyThemeMode(typed);
                    void persistPreference("theme_mode", typed).catch(() =>
                      setMessage("The theme could not be saved."),
                    );
                  }}
                >
                  <SelectTrigger id="theme-mode" className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="pt-4">
            <DataSettings
              historyMaxEntries={preferences.historyMaxEntries}
              memoryStatus={memoryStatus}
              repository={repository}
              onHistoryMaxEntriesChange={(limit: HistoryLimit) => {
                preferences.setHistoryMaxEntries(limit);
                save("history_max_entries", String(limit));
                if (memoryStatus === "ready") void repository.pruneHistory(limit);
              }}
              onClearAll={clearAll}
            />
          </TabsContent>
        </Tabs>
        {message && (
          <p className="text-muted-foreground text-sm" role="status">
            {message}
          </p>
        )}
        {dialog}
      </div>
    </TooltipProvider>
  );
}
