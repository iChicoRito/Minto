import type { ReactNode } from "react";

import type { Metadata } from "next";

import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { MemoryProvider } from "./_components/memory-provider";
import { AppSidebar } from "./_components/sidebar/app-sidebar";

export const metadata: Metadata = {
  title: "Prompt Enhancer",
  description:
    "Turn rough instructions into well-structured prompts — local-first, rule-based, nothing leaves your browser.",
};

// Static by design: no cookies()/dynamic APIs here — sidebar defaults are
// client-side so every page in this group stays statically renderable.
export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        </header>
        <main className="flex-1 p-4 md:p-6">
          <MemoryProvider>{children}</MemoryProvider>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
