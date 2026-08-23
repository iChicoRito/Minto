import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function PresetGallery() {
  return (
    <div className="space-y-8">
      {GROUPS.map((group) => {
        const presets = PROMPT_PRESETS.filter((preset) => preset.category === group.category);
        return (
          <section key={group.category} className="space-y-3" aria-labelledby={`${group.category}-presets-title`}>
            <div>
              <h2 id={`${group.category}-presets-title`} className="font-medium text-lg">
                {group.label}
              </h2>
              <p className="text-muted-foreground text-sm">
                Start with a focused configuration, then adjust it on Enhance.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {presets.map((preset) => (
                <Card key={preset.id} size="sm">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle>{preset.label}</CardTitle>
                      <Badge variant="secondary" className="shrink-0 capitalize">
                        {preset.level}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">{DESCRIPTIONS[preset.id]}</p>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline" className="w-full">
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
