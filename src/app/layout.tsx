import type { ReactNode } from "react";

import type { Metadata } from "next";

import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_CONFIG } from "@/config/app-config";
import { fontVars } from "@/lib/fonts/registry";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { parsePromptSections } from "@/lib/preferences/prompt-preferences";
import { ThemeBootScript } from "@/scripts/theme-boot";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: APP_CONFIG.meta.title,
  description: APP_CONFIG.meta.description,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const {
    theme_mode,
    theme_preset,
    content_layout,
    navbar_style,
    sidebar_variant,
    sidebar_collapsible,
    font,
    default_enhancement_level,
    default_prompt_sections,
    default_prompt_type,
    history_enabled,
    history_max_entries,
  } = PREFERENCE_DEFAULTS;
  return (
    <html
      lang="en"
      data-theme-mode={theme_mode}
      data-theme-preset={theme_preset}
      data-content-layout={content_layout}
      data-navbar-style={navbar_style}
      data-sidebar-variant={sidebar_variant}
      data-sidebar-collapsible={sidebar_collapsible}
      data-font={font}
      data-default-enhancement-level={default_enhancement_level}
      data-default-prompt-sections={default_prompt_sections}
      data-default-prompt-type={default_prompt_type}
      data-history-enabled={history_enabled}
      data-history-max-entries={history_max_entries}
      suppressHydrationWarning
    >
      <head>
        {/* Applies theme and layout preferences on load to avoid flicker and unnecessary server rerenders. */}
        <ThemeBootScript />
      </head>
      <body className={`${fontVars} min-h-screen antialiased`}>
        <TooltipProvider>
          <PreferencesStoreProvider
            themeMode={theme_mode}
            themePreset={theme_preset}
            contentLayout={content_layout}
            navbarStyle={navbar_style}
            font={font}
            defaultEnhancementLevel={default_enhancement_level}
            defaultPromptSections={parsePromptSections(default_prompt_sections)}
            defaultPromptType={default_prompt_type}
            historyEnabled={history_enabled === "true"}
            historyMaxEntries={Number(history_max_entries) as 100 | 250 | 500 | 1000}
          >
            {children}
            <Toaster />
            <ServiceWorkerRegister />
          </PreferencesStoreProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
