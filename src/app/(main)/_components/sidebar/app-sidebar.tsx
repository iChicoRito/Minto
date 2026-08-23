"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { WandSparkles } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { enhancerNavItems } from "./enhancer-nav-items";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/">
                <WandSparkles />
                <span className="font-semibold text-base">Prompt Enhancer</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {enhancerNavItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="rounded-lg border bg-muted/30 p-2 text-muted-foreground text-xs group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:text-center">
          <span className="font-medium text-foreground group-data-[collapsible=icon]:sr-only">
            Local data + optional AI
          </span>
          <span className="block group-data-[collapsible=icon]:sr-only">AI prompts leave your browser.</span>
          <span className="block group-data-[collapsible=icon]:sr-only">History, library, and settings stay here.</span>
          <span className="hidden group-data-[collapsible=icon]:inline" title="Local data + optional AI">
            🔒
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
