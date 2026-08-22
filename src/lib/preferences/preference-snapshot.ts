import type { FontKey } from "../fonts/registry";
import {
  CONTENT_LAYOUT_VALUES,
  NAVBAR_STYLE_VALUES,
  SIDEBAR_COLLAPSIBLE_VALUES,
  SIDEBAR_VARIANT_VALUES,
} from "./layout";
import { PREFERENCE_DEFAULTS, type PreferenceValueMap } from "./preferences-config";
import {
  DEFAULT_ENHANCEMENT_LEVEL,
  DEFAULT_HISTORY_LIMIT,
  DEFAULT_PROMPT_TYPE,
  parseHistoryLimit,
  parsePromptSections,
  parsePromptType,
  serializePromptSections,
} from "./prompt-preferences";
import { THEME_MODE_VALUES, THEME_PRESET_VALUES } from "./theme";

export type PreferenceSnapshot = PreferenceValueMap;

export const PREFERENCE_SNAPSHOT_KEYS = Object.keys(PREFERENCE_DEFAULTS) as (keyof PreferenceSnapshot)[];

function safeValue<T extends string>(value: string | undefined, values: readonly T[], fallback: T): T {
  return value && values.includes(value as T) ? (value as T) : fallback;
}

function safeString(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 80) : fallback;
}

export function normalizePreferenceSnapshot(
  input: Partial<Record<keyof PreferenceSnapshot, string>>,
): PreferenceSnapshot {
  return {
    theme_mode: safeValue(input.theme_mode, THEME_MODE_VALUES, PREFERENCE_DEFAULTS.theme_mode),
    theme_preset: safeValue(input.theme_preset, THEME_PRESET_VALUES, PREFERENCE_DEFAULTS.theme_preset),
    font: safeString(input.font, PREFERENCE_DEFAULTS.font) as FontKey,
    content_layout: safeValue(input.content_layout, CONTENT_LAYOUT_VALUES, PREFERENCE_DEFAULTS.content_layout),
    navbar_style: safeValue(input.navbar_style, NAVBAR_STYLE_VALUES, PREFERENCE_DEFAULTS.navbar_style),
    sidebar_variant: safeValue(input.sidebar_variant, SIDEBAR_VARIANT_VALUES, PREFERENCE_DEFAULTS.sidebar_variant),
    sidebar_collapsible: safeValue(
      input.sidebar_collapsible,
      SIDEBAR_COLLAPSIBLE_VALUES,
      PREFERENCE_DEFAULTS.sidebar_collapsible,
    ),
    default_enhancement_level: safeValue(
      input.default_enhancement_level,
      ["light", "standard", "detailed"],
      DEFAULT_ENHANCEMENT_LEVEL,
    ),
    default_prompt_sections: serializePromptSections(
      parsePromptSections(input.default_prompt_sections ?? PREFERENCE_DEFAULTS.default_prompt_sections),
    ),
    default_prompt_type: parsePromptType(input.default_prompt_type ?? DEFAULT_PROMPT_TYPE),
    history_enabled: input.history_enabled === "false" ? "false" : "true",
    history_max_entries: String(
      parseHistoryLimit(input.history_max_entries ?? String(DEFAULT_HISTORY_LIMIT)),
    ) as PreferenceSnapshot["history_max_entries"],
  };
}

export function defaultPreferenceSnapshot(): PreferenceSnapshot {
  return normalizePreferenceSnapshot(PREFERENCE_DEFAULTS);
}
