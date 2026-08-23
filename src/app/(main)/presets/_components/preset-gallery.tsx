import Link from "next/link";

import { Code, Palette, PenLine, Search, Shapes } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PROMPT_PRESETS, type PromptPresetId } from "@/lib/prompt-presets";

const GROUPS = [
  { category: "development", label: "Development" },
  { category: "writing", label: "Writing" },
  { category: "research", label: "Research" },
  { category: "design", label: "Design" },
] as const;

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
};

const CATEGORY_ICON: Record<string, typeof Shapes> = {
  development: Code,
  writing: PenLine,
  research: Search,
  design: Palette,
};

export function PresetGallery() {
  return (
    <div className="space-y-8">
      {GROUPS.map((group) => {
        const presets = PROMPT_PRESETS.filter((preset) => preset.category === group.category);
        const Icon = CATEGORY_ICON[group.category] ?? Shapes;
        return (
          <section
            key={group.category}
            className="flex flex-col gap-2"
            aria-labelledby={`${group.category}-presets-title`}
          >
            <div className="flex items-center justify-between">
              <h2 id={`${group.category}-presets-title`} className="font-medium text-lg">
                {group.label}
              </h2>
              <span className="text-muted-foreground text-sm">{presets.length} presets</span>
            </div>
            <div className="grid gap-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {presets.map((preset) => (
                <Card key={preset.id} size="sm" className="flex flex-col">
                  <CardHeader>
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-lime-500/10 text-lime-600 dark:bg-lime-400/10 dark:text-lime-400">
                        <Icon className="size-4.5" />
                      </div>
                      <div className="flex min-w-0 flex-col gap-1">
                        <CardTitle className="truncate text-lime-600 leading-none dark:text-lime-400">
                          {preset.label}
                        </CardTitle>
                        <CardDescription className="text-xs capitalize">{preset.category}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3">
                    <p className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">
                      {DESCRIPTIONS[preset.id]}
                    </p>
                    <div className="flex justify-start">
                      <Badge variant="secondary" className="shrink-0 text-xs capitalize">
                        {preset.category}
                      </Badge>
                    </div>
                    <Button asChild variant="outline" size="sm" className="mt-auto w-full">
                      <Link href={`/?preset=${preset.id}`}>Use preset</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
