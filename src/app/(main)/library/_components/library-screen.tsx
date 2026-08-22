"use client";

import { useState } from "react";

import Link from "next/link";

import { useLiveQuery } from "dexie-react-hooks";
import { Copy, Edit3, FolderPlus, Heart, MoreHorizontal, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

function LibraryContent() {
  const { status, repository } = useMemory();
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

  const update = async (id: string, changes: Parameters<typeof repository.updatePrompt>[1]) => {
    try {
      await repository.updatePrompt(id, changes);
      setMessage("Library updated.");
    } catch {
      setMessage("The library could not be updated.");
    }
  };

  const rename = (prompt: SavedPrompt) => {
    const title = window.prompt("Rename prompt", prompt.title);
    if (title?.trim()) void update(prompt.id, { title: title.trim(), updatedAt: Date.now() });
  };

  const editTags = (prompt: SavedPrompt) => {
    const value = window.prompt("Tags, separated by commas", prompt.tags.join(", "));
    if (value !== null) void update(prompt.id, { tags: normalizeTags(value.split(",")), updatedAt: Date.now() });
  };

  const createFolder = () => {
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;
    const normalized = normalizeFolderName(name);
    void repository
      .createFolder({ id: crypto.randomUUID(), ...normalized, createdAt: Date.now(), updatedAt: Date.now() })
      .then(() => setMessage("Folder created."))
      .catch(() => setMessage("Folder names must be unique."));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {VIEWS.map((item) => (
          <Button
            key={item.value}
            type="button"
            size="sm"
            variant={view === item.value ? "default" : "outline"}
            onClick={() => setView(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
        <Input
          placeholder="Search title, prompt, Markdown, or tags"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          aria-label="Filter by folder"
          className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
          value={folderId === undefined ? "all" : (folderId ?? "unfiled")}
          onChange={(event) =>
            setFolderId(
              event.target.value === "all" ? undefined : event.target.value === "unfiled" ? null : event.target.value,
            )
          }
        >
          <option value="all">All folders</option>
          <option value="unfiled">Unfiled</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
        <Input placeholder="Filter by tag" value={tag} onChange={(event) => setTag(event.target.value)} />
        <Button type="button" variant="outline" onClick={createFolder}>
          <FolderPlus /> New folder
        </Button>
      </div>
      {folderId && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const folder = folders.find((item) => item.id === folderId);
              const name = folder && window.prompt("Rename folder", folder.name);
              if (name?.trim())
                void repository.renameFolder(folderId, name).catch(() => setMessage("Folder names must be unique."));
            }}
          >
            Rename selected folder
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.confirm("Delete this folder? Prompts will become Unfiled.")) {
                void repository.deleteFolderAndUnassign(folderId).then(() => setFolderId(undefined));
              }
            }}
          >
            Delete selected folder
          </Button>
        </div>
      )}
      {message && (
        <p className="text-muted-foreground text-sm" role="status">
          {message}
        </p>
      )}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Save an enhanced prompt to build your library.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((prompt) => (
            <Card key={prompt.id} size="sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-sm">{prompt.title}</CardTitle>
                    <p className="text-muted-foreground text-xs">
                      {prompt.category} · {prompt.level}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={prompt.favorite ? "Remove favorite" : "Add favorite"}
                    aria-pressed={prompt.favorite}
                    onClick={() => void update(prompt.id, { favorite: !prompt.favorite, updatedAt: Date.now() })}
                  >
                    <Heart className={prompt.favorite ? "fill-current" : undefined} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-3 whitespace-pre-wrap text-sm">{prompt.enhancedPrompt}</p>
                <div className="flex flex-wrap gap-1 text-muted-foreground text-xs">
                  {prompt.tags.map((item) => (
                    <span key={item} className="rounded bg-muted px-1.5 py-0.5">
                      #{item}
                    </span>
                  ))}
                  {prompt.folderId && (
                    <span className="rounded bg-muted px-1.5 py-0.5">
                      {folders.find((folder) => folder.id === prompt.folderId)?.name}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild type="button" variant="outline" size="sm">
                    <Link href={`/?library=${prompt.id}`}>
                      <Edit3 /> Open
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void repository.duplicatePrompt(prompt.id)}
                  >
                    <Copy /> Duplicate
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => rename(prompt)}>
                    Rename
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => editTags(prompt)}>
                    <MoreHorizontal /> Tags
                  </Button>
                  <select
                    aria-label={`Folder for ${prompt.title}`}
                    className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                    value={prompt.folderId ?? ""}
                    onChange={(event) =>
                      void update(prompt.id, { folderId: event.target.value || null, updatedAt: Date.now() })
                    }
                  >
                    <option value="">Unfiled</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (window.confirm("Delete this saved prompt?")) void repository.deletePrompt(prompt.id);
                    }}
                  >
                    <Trash2 /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
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
