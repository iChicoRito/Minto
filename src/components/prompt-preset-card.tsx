import Link from "next/link";

import { Code, Palette, PenLine, Search, Shapes } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PromptPreset, PromptPresetId } from "@/lib/prompt-presets";
import { cn } from "@/lib/utils";

const DESCRIPTIONS: Record<PromptPresetId, string> = {
  "bug-fix": "Turn a rough defect report into a fixable, verifiable task.",
  "build-feature": "Clarify user value, scope, and delivery requirements.",
  "code-review": "Scope the review and get severity-ordered, evidence-backed findings.",
  refactor: "Improve structure while locking in current behavior.",
  testing: "Specify setup, scenarios, edge cases, and proof of coverage.",
  documentation: "Plan audience-ready docs with clear topics, examples, and voice.",
  "api-design": "Design consumer-focused contracts with validation, auth, and versioning.",
  database: "Cover schema integrity, queries, migration, performance, and rollback.",
  rewrite: "Reshape content for your audience without losing the original meaning.",
  summarize: "Compress source material into faithful, well-scoped key points.",
  "improve-writing": "Polish clarity, grammar, and flow while preserving intent.",
  "research-topic": "Frame answerable questions backed by quality sources and citations.",
  "compare-options": "Weigh options against criteria and arrive at a justified recommendation.",
  "analyze-information": "Draw conclusions with explicit assumptions, evidence, and limits.",
  "ui-design": "Set direction for hierarchy, states, responsiveness, and accessibility.",
  "ux-review": "Surface prioritized usability issues with actionable recommendations.",
  "image-prompt": "Specify subject, style, lighting, camera, and negative constraints.",
  "grammar-correction": "Fix grammar, spelling, and punctuation while preserving meaning.",
};

const CATEGORY_ICON: Record<string, typeof Shapes> = {
  development: Code,
  writing: PenLine,
  research: Search,
  design: Palette,
};

export type PromptPresetCardProps = {
  preset: PromptPreset;
  onSelectPreset?: (preset: PromptPreset) => void;
  selected?: boolean;
};

export function PromptPresetCard({ preset, onSelectPreset, selected = false }: PromptPresetCardProps) {
  const Icon = CATEGORY_ICON[preset.category] ?? Shapes;

  return (
    <Card
      className={cn(
        "h-full w-full min-w-0 max-w-sm justify-self-center",
        selected && "border-lime-500 ring-2 ring-lime-500/20",
      )}
      size="sm"
    >
      <CardHeader>
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-lime-500/10 text-lime-600 dark:bg-lime-400/10 dark:text-lime-400">
            <Icon className="size-4.5" />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="truncate text-lime-600 leading-none dark:text-lime-400">{preset.label}</CardTitle>
            <CardDescription className="text-xs capitalize">{preset.category}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <p className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">{DESCRIPTIONS[preset.id]}</p>
        <div className="flex justify-start">
          <Badge variant="secondary" className="shrink-0 text-xs capitalize">
            {preset.category}
          </Badge>
        </div>
        {onSelectPreset ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-auto w-full"
            aria-pressed={selected}
            onClick={() => onSelectPreset(preset)}
          >
            Use preset
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="mt-auto w-full">
            <Link href={`/?preset=${preset.id}`}>Use preset</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
