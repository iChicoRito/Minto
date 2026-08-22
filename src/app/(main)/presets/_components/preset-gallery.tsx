import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PROMPT_PRESETS } from "@/lib/prompt-presets";

const GROUPS = [
  { category: "development", label: "Development" },
  { category: "writing", label: "Writing" },
  { category: "research", label: "Research" },
  { category: "design", label: "Design" },
] as const;

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
                    <CardTitle>{preset.label}</CardTitle>
                    <CardDescription>{preset.taskType.replaceAll("-", " ")} · Standard</CardDescription>
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
