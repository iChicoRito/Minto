import { ClockFading, Info, LibraryBig, type LucideIcon, Settings2, Shapes, Sparkles } from "lucide-react";

export interface EnhancerNavItem {
  id: string;
  title: string;
  url: string;
  icon: LucideIcon;
}

/**
 * Flat navigation for the Prompt Enhancer shell.
 * Note: lucide-react no longer exports `History` — `ClockFading` is its
 * official rename successor, used here for the History destination.
 */
export const enhancerNavItems: readonly EnhancerNavItem[] = [
  { id: "enhance", title: "Enhance", url: "/", icon: Sparkles },
  { id: "presets", title: "Presets", url: "/presets", icon: Shapes },
  { id: "library", title: "Library", url: "/library", icon: LibraryBig },
  { id: "history", title: "History", url: "/history", icon: ClockFading },
  { id: "settings", title: "Settings", url: "/settings", icon: Settings2 },
  { id: "about", title: "About", url: "/about", icon: Info },
];
