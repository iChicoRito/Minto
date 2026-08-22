import { createStore } from "zustand/vanilla";

import type { FontKey } from "@/lib/fonts/registry";
import type { ContentLayout, NavbarStyle, SidebarCollapsible, SidebarVariant } from "@/lib/preferences/layout";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import {
  DEFAULT_HISTORY_LIMIT,
  DEFAULT_PROMPT_SECTIONS,
  DEFAULT_PROMPT_TYPE,
  type HistoryLimit,
  type PromptPreferenceSectionId,
  type PromptPreferenceType,
  parseHistoryLimit,
  parsePromptSections,
  parsePromptType,
} from "@/lib/preferences/prompt-preferences";
import type { ResolvedThemeMode, ThemeMode, ThemePreset } from "@/lib/preferences/theme";
import type { EnhancementLevel } from "@/prompt-engine/types";

export type PreferencesState = {
  themeMode: ThemeMode;
  resolvedThemeMode: ResolvedThemeMode;
  themePreset: ThemePreset;
  font: FontKey;
  contentLayout: ContentLayout;
  navbarStyle: NavbarStyle;
  sidebarVariant: SidebarVariant;
  sidebarCollapsible: SidebarCollapsible;
  defaultEnhancementLevel: EnhancementLevel;
  defaultPromptSections: readonly PromptPreferenceSectionId[];
  defaultPromptType: PromptPreferenceType;
  historyEnabled: boolean;
  historyMaxEntries: HistoryLimit;
  setThemeMode: (mode: ThemeMode) => void;
  setResolvedThemeMode: (mode: ResolvedThemeMode) => void;
  setThemePreset: (preset: ThemePreset) => void;
  setFont: (font: FontKey) => void;
  setContentLayout: (layout: ContentLayout) => void;
  setNavbarStyle: (style: NavbarStyle) => void;
  setSidebarVariant: (variant: SidebarVariant) => void;
  setSidebarCollapsible: (mode: SidebarCollapsible) => void;
  setDefaultEnhancementLevel: (level: EnhancementLevel) => void;
  setDefaultPromptSections: (sections: readonly PromptPreferenceSectionId[]) => void;
  setDefaultPromptType: (type: PromptPreferenceType) => void;
  setHistoryEnabled: (enabled: boolean) => void;
  setHistoryMaxEntries: (limit: HistoryLimit) => void;
  isSynced: boolean;
  setIsSynced: (val: boolean) => void;
};

export const createPreferencesStore = (init?: Partial<PreferencesState>) =>
  createStore<PreferencesState>()((set) => ({
    themeMode: init?.themeMode ?? PREFERENCE_DEFAULTS.theme_mode,
    resolvedThemeMode: init?.resolvedThemeMode ?? "light",
    themePreset: init?.themePreset ?? PREFERENCE_DEFAULTS.theme_preset,
    font: init?.font ?? PREFERENCE_DEFAULTS.font,
    contentLayout: init?.contentLayout ?? PREFERENCE_DEFAULTS.content_layout,
    navbarStyle: init?.navbarStyle ?? PREFERENCE_DEFAULTS.navbar_style,
    sidebarVariant: init?.sidebarVariant ?? PREFERENCE_DEFAULTS.sidebar_variant,
    sidebarCollapsible: init?.sidebarCollapsible ?? PREFERENCE_DEFAULTS.sidebar_collapsible,
    defaultEnhancementLevel: init?.defaultEnhancementLevel ?? PREFERENCE_DEFAULTS.default_enhancement_level,
    defaultPromptSections:
      init?.defaultPromptSections ??
      parsePromptSections(PREFERENCE_DEFAULTS.default_prompt_sections) ??
      DEFAULT_PROMPT_SECTIONS,
    defaultPromptType:
      init?.defaultPromptType ?? parsePromptType(PREFERENCE_DEFAULTS.default_prompt_type) ?? DEFAULT_PROMPT_TYPE,
    historyEnabled: init?.historyEnabled ?? PREFERENCE_DEFAULTS.history_enabled === "true",
    historyMaxEntries:
      init?.historyMaxEntries ?? parseHistoryLimit(PREFERENCE_DEFAULTS.history_max_entries) ?? DEFAULT_HISTORY_LIMIT,
    setThemeMode: (mode) => set({ themeMode: mode }),
    setResolvedThemeMode: (mode) => set({ resolvedThemeMode: mode }),
    setThemePreset: (preset) => set({ themePreset: preset }),
    setFont: (font) => set({ font }),
    setContentLayout: (layout) => set({ contentLayout: layout }),
    setNavbarStyle: (style) => set({ navbarStyle: style }),
    setSidebarVariant: (variant) => set({ sidebarVariant: variant }),
    setSidebarCollapsible: (mode) => set({ sidebarCollapsible: mode }),
    setDefaultEnhancementLevel: (level) => set({ defaultEnhancementLevel: level }),
    setDefaultPromptSections: (sections) => set({ defaultPromptSections: sections }),
    setDefaultPromptType: (type) => set({ defaultPromptType: type }),
    setHistoryEnabled: (enabled) => set({ historyEnabled: enabled }),
    setHistoryMaxEntries: (limit) => set({ historyMaxEntries: limit }),
    isSynced: init?.isSynced ?? false,
    setIsSynced: (val) => set({ isSynced: val }),
  }));
