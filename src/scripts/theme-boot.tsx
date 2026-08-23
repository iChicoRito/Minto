/**
 * Boot script that reads user preference values (theme mode, theme preset,
 * content layout, navbar style, and prompt defaults from cookies or localStorage based on the
 * configured persistence mode.
 *
 * Runs early in <head> to apply the correct data attributes before hydration,
 * preventing layout or theme flicker and keeping RootLayout fully static.
 */
import { PREFERENCE_DEFAULTS, PREFERENCE_PERSISTENCE } from "@/lib/preferences/preferences-config";

export function ThemeBootScript() {
  const persistence = JSON.stringify({
    theme_mode: PREFERENCE_PERSISTENCE.theme_mode,
    theme_preset: PREFERENCE_PERSISTENCE.theme_preset,
    font: PREFERENCE_PERSISTENCE.font,
    content_layout: PREFERENCE_PERSISTENCE.content_layout,
    navbar_style: PREFERENCE_PERSISTENCE.navbar_style,
    sidebar_variant: PREFERENCE_PERSISTENCE.sidebar_variant,
    sidebar_collapsible: PREFERENCE_PERSISTENCE.sidebar_collapsible,
    default_enhancement_level: PREFERENCE_PERSISTENCE.default_enhancement_level,
    default_prompt_sections: PREFERENCE_PERSISTENCE.default_prompt_sections,
    default_prompt_type: PREFERENCE_PERSISTENCE.default_prompt_type,
    history_enabled: PREFERENCE_PERSISTENCE.history_enabled,
    history_max_entries: PREFERENCE_PERSISTENCE.history_max_entries,
  });

  const defaults = JSON.stringify({
    theme_mode: PREFERENCE_DEFAULTS.theme_mode,
    theme_preset: PREFERENCE_DEFAULTS.theme_preset,
    font: PREFERENCE_DEFAULTS.font,
    content_layout: PREFERENCE_DEFAULTS.content_layout,
    navbar_style: PREFERENCE_DEFAULTS.navbar_style,
    sidebar_variant: PREFERENCE_DEFAULTS.sidebar_variant,
    sidebar_collapsible: PREFERENCE_DEFAULTS.sidebar_collapsible,
    default_enhancement_level: PREFERENCE_DEFAULTS.default_enhancement_level,
    default_prompt_sections: PREFERENCE_DEFAULTS.default_prompt_sections,
    default_prompt_type: PREFERENCE_DEFAULTS.default_prompt_type,
    history_enabled: PREFERENCE_DEFAULTS.history_enabled,
    history_max_entries: PREFERENCE_DEFAULTS.history_max_entries,
  });

  const code = `
    (function () {
      try {
        var root = document.documentElement;
        var PERSISTENCE = ${persistence};
        var DEFAULTS = ${defaults};

        function readCookie(name) {
          var match = document.cookie.split("; ").find(function(c) {
            return c.startsWith(name + "=");
          });
          return match ? decodeURIComponent(match.split("=")[1]) : null;
        }

        function readLocal(name) {
          try {
            return window.localStorage.getItem(name);
          } catch (e) {
            return null;
          }
        }

        function readPreference(key, fallback) {
          var mode = PERSISTENCE[key];
          var value = null;

          if (mode === "localStorage") {
            value = readLocal(key);
          }

          if (!value && (mode === "client-cookie" || mode === "server-cookie")) {
            value = readCookie(key);
          }

          if (!value || typeof value !== "string") {
            return fallback;
          }

          return value;
        }

        var rawMode = readPreference("theme_mode", DEFAULTS.theme_mode);
        var rawPreset = readPreference("theme_preset", DEFAULTS.theme_preset);
        var rawFont = readPreference("font", DEFAULTS.font);
        var rawContentLayout = readPreference("content_layout", DEFAULTS.content_layout);
        var rawNavbarStyle = readPreference("navbar_style", DEFAULTS.navbar_style);
         var rawSidebarVariant = readPreference("sidebar_variant", DEFAULTS.sidebar_variant);
         var rawSidebarCollapsible = readPreference("sidebar_collapsible", DEFAULTS.sidebar_collapsible);
         var rawDefaultLevel = readPreference("default_enhancement_level", DEFAULTS.default_enhancement_level);
         var rawDefaultSections = readPreference("default_prompt_sections", DEFAULTS.default_prompt_sections);
         var rawDefaultType = readPreference("default_prompt_type", DEFAULTS.default_prompt_type);
         var rawHistoryEnabled = readPreference("history_enabled", DEFAULTS.history_enabled);
         var rawHistoryMaxEntries = readPreference("history_max_entries", DEFAULTS.history_max_entries);

        var isValidMode = rawMode === "dark" || rawMode === "light" || rawMode === "system";
        var mode = isValidMode ? rawMode : DEFAULTS.theme_mode;
        var resolvedMode =
          mode === "system" && window.matchMedia
            ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
            : mode;
        // The product is pinned to the Lime preset and the plain sidebar
        // variant; stored values from earlier builds are clamped back.
        var preset = rawPreset === DEFAULTS.theme_preset ? rawPreset : DEFAULTS.theme_preset;
        var font = rawFont || DEFAULTS.font;
        var contentLayout = rawContentLayout || DEFAULTS.content_layout;
        var navbarStyle = rawNavbarStyle || DEFAULTS.navbar_style;
         var sidebarVariant = rawSidebarVariant === "sidebar" ? rawSidebarVariant : DEFAULTS.sidebar_variant;
         var sidebarCollapsible = rawSidebarCollapsible || DEFAULTS.sidebar_collapsible;
         var defaultLevel = rawDefaultLevel === "light" || rawDefaultLevel === "standard" || rawDefaultLevel === "detailed"
           ? rawDefaultLevel
           : DEFAULTS.default_enhancement_level;
          var defaultSections = rawDefaultSections || DEFAULTS.default_prompt_sections;
          var validPromptTypes = ["auto", "general", "bug-fix", "feature", "code-review", "refactor", "testing", "documentation", "rewrite", "summarize", "research", "comparison", "ui-review", "image-prompt"];
          var defaultType = validPromptTypes.indexOf(rawDefaultType) >= 0 ? rawDefaultType : DEFAULTS.default_prompt_type;
          var historyEnabled = rawHistoryEnabled === "false" ? "false" : "true";
          var validHistoryLimits = ["100", "250", "500", "1000"];
          var historyMaxEntries = validHistoryLimits.indexOf(rawHistoryMaxEntries) >= 0 ? rawHistoryMaxEntries : DEFAULTS.history_max_entries;

        root.classList.toggle("dark", resolvedMode === "dark");
        root.setAttribute("data-theme-mode", mode);
        root.setAttribute("data-theme-preset", preset);
        root.setAttribute("data-font", font);
        root.setAttribute("data-content-layout", contentLayout);
        root.setAttribute("data-navbar-style", navbarStyle);
         root.setAttribute("data-sidebar-variant", sidebarVariant);
         root.setAttribute("data-sidebar-collapsible", sidebarCollapsible);
          root.setAttribute("data-default-enhancement-level", defaultLevel);
          root.setAttribute("data-default-prompt-sections", defaultSections);
          root.setAttribute("data-default-prompt-type", defaultType);
          root.setAttribute("data-history-enabled", historyEnabled);
          root.setAttribute("data-history-max-entries", historyMaxEntries);

        root.style.colorScheme = resolvedMode === "dark" ? "dark" : "light";

      } catch (e) {
        console.warn("ThemeBootScript error:", e);
      }
    })();
  `;

  /* biome-ignore lint/security/noDangerouslySetInnerHtml: required for pre-hydration boot script */
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
