/**
 * How each preference should be saved.
 *
 * "client-cookie"  → write cookie on the browser only.
 * "server-cookie"  → write cookie through a Server Action.
 * "localStorage"   → save only on the client (non-layout stuff).
 * "none"           → no saving, resets on reload.
 *
 * Layout-critical prefs (sidebar_variant / sidebar_collapsible)
 * must stay consistent during SSR → so they can’t use localStorage.
 * Others are flexible and can use any persistence.
 */

import type { EnhancementLevel, PromptTaskType } from "../../prompt-engine/types";
import type { FontKey } from "../fonts/registry";
import type { ContentLayout, NavbarStyle, SidebarCollapsible, SidebarVariant } from "./layout";
import type { ThemeMode, ThemePreset } from "./theme";

export type PreferencePersistence = "none" | "client-cookie" | "server-cookie" | "localStorage";

/**
 * All available preference keys and their value types.
 */
export type PreferenceValueMap = {
  theme_mode: ThemeMode;
  theme_preset: ThemePreset;
  font: FontKey;
  content_layout: ContentLayout;
  navbar_style: NavbarStyle;
  sidebar_variant: SidebarVariant;
  sidebar_collapsible: SidebarCollapsible;
  default_enhancement_level: EnhancementLevel;
  default_prompt_sections: string;
  default_prompt_type: "auto" | PromptTaskType;
  history_enabled: "true" | "false";
  history_max_entries: "100" | "250" | "500" | "1000";
};

export type PreferenceKey = keyof PreferenceValueMap;

/**
 * Layout-critical keys → these affect SSR UI (sidebar shape)
 * so they must be accessible on the server.
 */
export const LAYOUT_CRITICAL_KEYS = ["sidebar_variant", "sidebar_collapsible"] as const;
export type LayoutCriticalKey = (typeof LAYOUT_CRITICAL_KEYS)[number];

/**
 * Everything else is non-critical and can be read from the client.
 */
export type NonCriticalKey = Exclude<PreferenceKey, LayoutCriticalKey>;

/**
 * Layout-critical cannot use "localStorage" because SSR needs the value.
 * So remove it from allowed persistence types for those keys.
 */
type LayoutCriticalPersistence = Exclude<PreferencePersistence, "localStorage">;

/**
 * Final config:
 * - layout-critical keys → restricted persistence
 * - non-critical keys → can use any persistence
 */
type PreferencePersistenceConfig = {
  [K in LayoutCriticalKey]: LayoutCriticalPersistence;
} & {
  [K in NonCriticalKey]: PreferencePersistence;
};

/**
 * Default preference values on first load.
 */
export const PREFERENCE_DEFAULTS: PreferenceValueMap = {
  theme_mode: "light",
  theme_preset: "default",
  font: "geist",
  content_layout: "centered",
  navbar_style: "sticky",
  sidebar_variant: "inset",
  sidebar_collapsible: "icon",
  default_enhancement_level: "standard",
  default_prompt_sections: "objective,requirements,constraints,verification",
  default_prompt_type: "auto",
  history_enabled: "true",
  history_max_entries: "500",
};

/**
 * How each preference is persisted.
 * You can change these per-key.
 */
export const PREFERENCE_PERSISTENCE: PreferencePersistenceConfig = {
  theme_mode: "client-cookie",
  theme_preset: "client-cookie",
  font: "client-cookie",
  content_layout: "client-cookie",
  navbar_style: "client-cookie",
  sidebar_variant: "client-cookie", // layout-critical → cannot be "localStorage"
  sidebar_collapsible: "client-cookie", // layout-critical → cannot be "localStorage"
  default_enhancement_level: "localStorage",
  default_prompt_sections: "localStorage",
  default_prompt_type: "localStorage",
  history_enabled: "localStorage",
  history_max_entries: "localStorage",
};
