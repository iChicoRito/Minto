"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { useLiveQuery } from "dexie-react-hooks";
import {
  ChevronDown,
  Copy,
  Edit3,
  Folder,
  Heart,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  Tag,
  Tags,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirm } from "@/hooks/use-confirm";
import { copyText } from "@/lib/browser-actions.client";
import { filterLibraryPrompts, normalizeFolderName, normalizeTags } from "@/lib/browser-memory/record-utils";
import type { SavedPrompt } from "@/lib/browser-memory/types";
import type { PromptCategory } from "@/prompt-engine/types";

import { MemoryErrorBoundary } from "../../_components/memory-error-boundary";
import { useMemory } from "../../_components/memory-provider";

type View = "all" | "favorites" | PromptCategory;

const VIEWS: readonly { value: View; label: string }[] = [
  { value: "all", label: "All Prompts" },
  { value: "favorites", label: "Favorites" },
  { value: "development", label: "Development" },
  { value: "research", label: "Research" },
  { value: "writing", label: "Writing" },
  { value: "design", label: "Design" },
];

// Helper to format level label
function formatLevel(level: string) {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function LibraryContent() {
  const { status, repository } = useMemory();
  const { confirm, dialog } = useConfirm();
  const prompts = useLiveQuery(
    () => (status === "ready" ? repository.listPrompts() : Promise.resolve([])),
    [repository, status],
  );
  const folders = useLiveQuery(
    () => (status === "ready" ? repository.listFolders() : Promise.resolve([])),
    [repository, status],
  );
  const [view, setView] = useState<View>("all");
  const [search, setSearch] = useState("");
  const [folderId, setFolderId] = useState<string | null | undefined>(undefined);
  const [tag, setTag] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [showAllTags, setShowAllTags] = useState(false);

  // Folder counts — keep hooks before early returns per rules-of-hooks
  const folderCounts = useMemo(() => {
    const map = new Map<string, number>();
    const list = prompts ?? [];
    for (const p of list) {
      const key = p.folderId ?? "__unfiled__";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [prompts]);

  // Tag counts
  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    const list = prompts ?? [];
    for (const p of list) {
      for (const t of p.tags) map.set(t, (map.get(t) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [prompts]);

  if (status === "unavailable")
    return <p className="text-destructive text-sm">Local library is unavailable in this browser.</p>;
  if (prompts === undefined || folders === undefined)
    return <p className="text-muted-foreground text-sm">Loading local library...</p>;

  const filtered = filterLibraryPrompts(prompts, {
    search,
    favorite: view === "favorites" ? true : undefined,
    category: view === "all" || view === "favorites" ? undefined : view,
    folderId,
    tags: tag ? [tag] : [],
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const start = filtered.length === 0 ? 0 : (safePage - 1) * perPage + 1;
  const end = Math.min(safePage * perPage, filtered.length);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const visibleTags = showAllTags ? tagCounts : tagCounts.slice(0, 5);

  const update = async (id: string, changes: Parameters<typeof repository.updatePrompt>[1]) => {
    try {
      await repository.updatePrompt(id, changes);
      setMessage("Library updated.");
    } catch {
      setMessage("The library could not be updated.");
    }
  };

  const safePrompt = (message: string, defaultValue?: string): string | null => {
    if (typeof window === "undefined") return null;
    try {
      // window.prompt throws "prompt() is not supported." on server/unsupported contexts
      return window.prompt(message, defaultValue);
    } catch {
      return null;
    }
  };

  const rename = (prompt: SavedPrompt) => {
    const title = safePrompt("Rename prompt", prompt.title);
    if (title?.trim()) void update(prompt.id, { title: title.trim(), updatedAt: Date.now() });
  };

  const editTags = (prompt: SavedPrompt) => {
    const value = safePrompt("Tags, separated by commas", prompt.tags.join(", "));
    if (value !== null) void update(prompt.id, { tags: normalizeTags(value.split(",")), updatedAt: Date.now() });
  };

  const createFolder = () => {
    const name = safePrompt("Folder name");
    if (!name?.trim()) return;
    const normalized = normalizeFolderName(name);
    void repository
      .createFolder({ id: crypto.randomUUID(), ...normalized, createdAt: Date.now(), updatedAt: Date.now() })
      .then(() => setMessage("Folder created."))
      .catch(() => setMessage("Folder names must be unique."));
  };

  const handleCopyMarkdown = async () => {
    if (filtered.length === 0) {
      toast.message("No prompts to copy.");
      return;
    }
    const md = filtered.map((p) => `## ${p.title}\n\n${p.enhancedPrompt}`).join("\n\n---\n\n");
    try {
      await copyText(md);
      toast.success("Markdown copied.");
    } catch {
      toast.error("Could not copy.");
    }
  };

  const handlePageChange = (next: number) => setPage(Math.max(1, Math.min(totalPages, next)));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Library</h1>
          <p className="text-muted-foreground text-sm">Organize, manage, and reuse your saved prompts.</p>
        </div>
        <Button type="button" onClick={createFolder} size="sm" className="shrink-0">
          <Plus className="size-4" /> New Folder
        </Button>
      </div>

      {/* Search + Copy */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button type="button" variant="outline" onClick={() => void handleCopyMarkdown()} className="shrink-0">
          <Copy className="size-4" /> Copy Markdown
        </Button>
      </div>

      {/* Tabs - line variant to match reference */}
      <Tabs
        value={view}
        onValueChange={(v) => {
          setView(v as View);
          setPage(1);
        }}
      >
        <TabsList variant="line" className="justify-start gap-6 rounded-none border-b bg-transparent p-0">
          {VIEWS.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="rounded-none border-0 px-0 pb-2 text-sm data-active:shadow-none"
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Two column layout */}
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        {/* Left nav: Folders + Tags */}
        <div className="space-y-4">
          <Card className="rounded-xl">
            <CardContent className="space-y-4 p-3">
              <div>
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="font-medium text-sm">Folders</span>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="New folder" onClick={createFolder}>
                    <Plus className="size-4" />
                  </Button>
                </div>
                <div className="space-y-0.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFolderId(undefined);
                      setPage(1);
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${folderId === undefined ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
                  >
                    <Folder className="size-4 shrink-0" />
                    <span className="truncate">All Prompts</span>
                    <span className="ml-auto text-muted-foreground text-xs">{prompts.length}</span>
                  </button>
                  {folders.map((folder) => {
                    const isActive = folderId === folder.id;
                    const count = folderCounts.get(folder.id) ?? 0;
                    return (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => {
                          setFolderId(folder.id);
                          setPage(1);
                        }}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${isActive ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
                      >
                        <Folder className="size-4 shrink-0" />
                        <span className="truncate">{folder.name}</span>
                        <span className="ml-auto text-muted-foreground text-xs">{count}</span>
                      </button>
                    );
                  })}
                  {/* Unfiled pseudo folder for completeness */}
                  <button
                    type="button"
                    onClick={() => {
                      setFolderId(null);
                      setPage(1);
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${folderId === null ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
                  >
                    <Folder className="size-4 shrink-0" />
                    <span className="truncate">Unfiled</span>
                    <span className="ml-auto text-muted-foreground text-xs">
                      {folderCounts.get("__unfiled__") ?? 0}
                    </span>
                  </button>
                </div>
                {folderId && (
                  <div className="mt-3 flex gap-1 border-t pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 flex-1 text-xs"
                      onClick={() => {
                        const folder = folders.find((item) => item.id === folderId);
                        const name = folder && safePrompt("Rename folder", folder.name);
                        if (name?.trim())
                          void repository
                            .renameFolder(folderId, name)
                            .catch(() => setMessage("Folder names must be unique."));
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 flex-1 text-xs"
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: "Delete this folder?",
                          description: "Prompts will become Unfiled.",
                          confirmLabel: "Delete folder",
                          destructive: true,
                        });
                        if (confirmed)
                          void repository.deleteFolderAndUnassign(folderId).then(() => setFolderId(undefined));
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="font-medium text-sm">Tags</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Add tag filter"
                    onClick={() => {
                      const value = safePrompt("Filter by tag");
                      if (value?.trim()) {
                        setTag(value.trim().toLowerCase());
                        setPage(1);
                      }
                    }}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                <div className="space-y-0.5 pt-1">
                  {visibleTags.length === 0 ? (
                    <p className="px-2 py-1 text-muted-foreground text-xs">No tags yet.</p>
                  ) : (
                    visibleTags.map(([t, count]) => {
                      const isActive = tag === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setTag(isActive ? "" : t);
                            setPage(1);
                          }}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${isActive ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
                        >
                          <Tag className="size-3.5 shrink-0" />
                          <span className="truncate">{t}</span>
                          <span className="ml-auto text-muted-foreground text-xs">{count}</span>
                        </button>
                      );
                    })
                  )}
                  {tag && (
                    <button
                      type="button"
                      onClick={() => {
                        setTag("");
                        setPage(1);
                      }}
                      className="w-full rounded-md px-2 py-1 text-left text-muted-foreground text-xs hover:text-foreground"
                    >
                      Clear tag filter
                    </button>
                  )}
                  {tagCounts.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllTags((v) => !v)}
                      className="flex w-full items-center gap-1 px-2 py-1 text-muted-foreground text-xs hover:text-foreground"
                    >
                      {showAllTags ? "Show less" : "Show more"}{" "}
                      <ChevronDown className={`size-3 transition ${showAllTags ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: prompt table */}
        <div className="min-w-0">
          {filtered.length === 0 ? (
            <Card className="rounded-xl">
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                Save an enhanced prompt to build your library.
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              {/* Header row — hidden on mobile */}
              <div className="hidden grid-cols-[1fr_90px_130px_120px_100px] gap-4 border-b bg-muted/30 px-4 py-2.5 text-muted-foreground text-xs md:grid">
                <span>Prompt</span>
                <span>Type</span>
                <span>Enhancement Level</span>
                <span>Updated</span>
                <span className="text-right">Actions</span>
              </div>

              {paginated.map((prompt) => {
                const updated = new Intl.DateTimeFormat(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(prompt.updatedAt);
                const time = new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(prompt.updatedAt);
                return (
                  <div
                    key={prompt.id}
                    className="flex flex-col gap-3 border-b px-3 py-3 last:border-0 md:grid md:grid-cols-[1fr_90px_130px_120px_100px] md:items-center md:gap-4 md:px-4"
                  >
                    {/* Prompt cell */}
                    <div className="flex min-w-0 gap-3">
                      <button
                        type="button"
                        aria-label={prompt.favorite ? "Remove favorite" : "Add favorite"}
                        onClick={() => void update(prompt.id, { favorite: !prompt.favorite, updatedAt: Date.now() })}
                        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <Star className={`size-4 ${prompt.favorite ? "fill-foreground text-foreground" : ""}`} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm leading-tight">{prompt.title}</p>
                        <p className="mt-1 line-clamp-2 text-muted-foreground text-xs leading-relaxed">
                          {prompt.enhancedPrompt.slice(0, 160)}
                          {prompt.enhancedPrompt.length > 160 ? "…" : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {prompt.tags.slice(0, 1).map((item) => (
                            <Badge key={item} variant="outline" className="rounded-md px-1.5 py-0 font-normal text-xs">
                              {item}
                            </Badge>
                          ))}
                          {prompt.tags.length === 0 && prompt.category && (
                            <Badge variant="outline" className="rounded-md px-1.5 py-0 font-normal text-xs capitalize">
                              {prompt.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Type — visible on md+ */}
                    <div className="hidden md:block">
                      <Badge variant="outline" className="rounded-md px-2 py-0.5 font-normal text-xs capitalize">
                        {prompt.category === "general" ? "General" : prompt.category}
                      </Badge>
                    </div>

                    {/* Level */}
                    <div className="hidden md:block">
                      <Badge variant="outline" className="rounded-md px-2 py-0.5 font-normal text-xs capitalize">
                        {formatLevel(prompt.level)}
                      </Badge>
                    </div>

                    {/* Updated */}
                    <div className="hidden text-muted-foreground text-xs md:block">
                      <div>{updated}</div>
                      <div>{time}</div>
                    </div>

                    {/* Actions — only context menu; inline icons removed per request */}
                    <div className="flex items-center justify-between gap-1 md:justify-end">
                      <div className="flex items-center gap-1 text-muted-foreground text-xs md:hidden">
                        <span>
                          {prompt.category} · {formatLevel(prompt.level)} · {updated}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Prompt actions">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                void update(prompt.id, { favorite: !prompt.favorite, updatedAt: Date.now() })
                              }
                            >
                              <Heart className={prompt.favorite ? "fill-current" : undefined} />
                              {prompt.favorite ? "Remove favorite" : "Add favorite"}
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/?library=${prompt.id}`}>
                                <Edit3 /> Open
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void repository.duplicatePrompt(prompt.id)}>
                              <Copy /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => rename(prompt)}>Rename</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editTags(prompt)}>
                              <Tags /> Tags
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <Folder /> Move to folder
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuRadioGroup
                                  value={prompt.folderId ?? "unfiled"}
                                  onValueChange={(value) =>
                                    void update(prompt.id, {
                                      folderId: value === "unfiled" ? null : value,
                                      updatedAt: Date.now(),
                                    })
                                  }
                                >
                                  <DropdownMenuRadioItem value="unfiled">Unfiled</DropdownMenuRadioItem>
                                  {folders.map((folder) => (
                                    <DropdownMenuRadioItem key={folder.id} value={folder.id}>
                                      {folder.name}
                                    </DropdownMenuRadioItem>
                                  ))}
                                </DropdownMenuRadioGroup>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={async () => {
                                const confirmed = await confirm({
                                  title: "Delete this saved prompt?",
                                  description: "This cannot be undone.",
                                  confirmLabel: "Delete",
                                  destructive: true,
                                });
                                if (confirmed) void repository.deletePrompt(prompt.id);
                              }}
                            >
                              <Trash2 /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination footer */}
          {filtered.length > 0 && (
            <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground text-xs">
                Showing {start} to {end} of {filtered.length} prompts
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={safePage <= 1}
                    onClick={() => handlePageChange(safePage - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronDown className="size-4 rotate-90" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(0, 6)
                    .map((p) => (
                      <Button
                        key={p}
                        type="button"
                        variant={p === safePage ? "default" : "ghost"}
                        size="icon-sm"
                        onClick={() => handlePageChange(p)}
                        aria-label={`Page ${p}`}
                        aria-current={p === safePage ? "page" : undefined}
                      >
                        {p}
                      </Button>
                    ))}
                  {totalPages > 6 && <span className="px-1 text-muted-foreground text-xs">…</span>}
                  {totalPages > 6 && (
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => handlePageChange(totalPages)}>
                      {totalPages}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={safePage >= totalPages}
                    onClick={() => handlePageChange(safePage + 1)}
                    aria-label="Next page"
                  >
                    <ChevronDown className="size-4 -rotate-90" />
                  </Button>
                </div>
                <Select
                  value={String(perPage)}
                  onValueChange={(value) => {
                    setPerPage(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger size="sm" className="w-32" aria-label="Items per page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="20">20 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>

      {message && (
        <p className="text-muted-foreground text-sm" role="status">
          {message}
        </p>
      )}
      {dialog}
    </div>
  );
}

export function LibraryScreen() {
  return (
    <MemoryErrorBoundary>
      <LibraryContent />
    </MemoryErrorBoundary>
  );
}
