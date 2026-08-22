"use client";

import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { defaultPreferenceSnapshot, PREFERENCE_SNAPSHOT_KEYS } from "@/lib/preferences/preference-snapshot";
import { persistPreference } from "@/lib/preferences/preferences-storage";
import {
  applyPromptPreferenceAttribute,
  type HistoryLimit,
  PROMPT_SECTION_IDS,
  PROMPT_TYPE_OPTIONS,
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

export function SettingsScreen() {
  const preferences = usePreferencesStore((state) => state);
  const { status: memoryStatus, repository } = useMemory();
  const [message, setMessage] = useState<string | null>(null);

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
    if (!window.confirm("Clear all local prompts, history, folders, and settings? This cannot be undone.")) return;
    try {
      await repository.clearAll();
      const defaults = defaultPreferenceSnapshot();
      for (const key of PREFERENCE_SNAPSHOT_KEYS) await persistPreference(key, defaults[key], { throwOnError: true });
      window.location.reload();
    } catch {
      setMessage("All local data could not be cleared. Nothing was reloaded.");
    }
  };

  return (
    <div className="space-y-5">
      <Tabs defaultValue="general">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>General defaults</CardTitle>
              <CardDescription>
                These choices pre-fill new enhancements. Existing documents are unchanged.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Default prompt type</span>
                <select
                  className="h-9 w-full rounded-lg border border-input bg-background px-2"
                  value={preferences.defaultPromptType}
                  onChange={(event) => {
                    const value = event.target.value as typeof preferences.defaultPromptType;
                    preferences.setDefaultPromptType(value);
                    save("default_prompt_type", value);
                  }}
                >
                  {PROMPT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Default enhancement level</span>
                <select
                  className="h-9 w-full rounded-lg border border-input bg-background px-2"
                  value={preferences.defaultEnhancementLevel}
                  onChange={(event) => {
                    const value = event.target.value as typeof preferences.defaultEnhancementLevel;
                    preferences.setDefaultEnhancementLevel(value);
                    save("default_enhancement_level", value);
                  }}
                >
                  <option value="light">Light</option>
                  <option value="standard">Standard</option>
                  <option value="detailed">Detailed</option>
                </select>
              </label>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sections" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Default sections</CardTitle>
              <CardDescription>Objective is always included. The other sections are optional.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {PROMPT_SECTION_IDS.map((section) => (
                <label key={section} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={preferences.defaultPromptSections.includes(section)}
                    disabled={section === "objective"}
                    onChange={() => updateSections(section)}
                  />
                  {SECTION_LABELS[section]}
                </label>
              ))}
              {preferences.defaultPromptSections.length === 0 && (
                <p className="text-destructive text-sm">Choose at least Objective.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="appearance" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Choose how the interface follows your device.</CardDescription>
            </CardHeader>
            <CardContent>
              <label htmlFor="theme-mode" className="font-medium text-sm">
                Color mode
              </label>
              <select
                id="theme-mode"
                className="mt-2 h-9 w-full max-w-xs rounded-lg border border-input bg-background px-2 text-sm"
                value={preferences.themeMode}
                onChange={(event) => {
                  const value = event.target.value as typeof preferences.themeMode;
                  preferences.setThemeMode(value);
                  applyThemeMode(value);
                  void persistPreference("theme_mode", value).catch(() => setMessage("The theme could not be saved."));
                }}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="data" className="pt-4">
          <DataSettings
            historyEnabled={preferences.historyEnabled}
            historyMaxEntries={preferences.historyMaxEntries}
            memoryStatus={memoryStatus}
            repository={repository}
            onHistoryEnabledChange={(enabled) => {
              preferences.setHistoryEnabled(enabled);
              save("history_enabled", enabled ? "true" : "false");
            }}
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
    </div>
  );
}
