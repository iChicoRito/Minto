import { PromptPresetCard } from "@/components/prompt-preset-card";
import { PROMPT_PRESETS, type PromptPreset, type PromptPresetId } from "@/lib/prompt-presets";

const GROUPS = [
  { category: "development", label: "Development" },
  { category: "writing", label: "Writing" },
  { category: "research", label: "Research" },
  { category: "design", label: "Design" },
] as const;

export type PromptPresetGalleryProps = {
  onSelectPreset?: (preset: PromptPreset) => void;
  selectedPresetId?: PromptPresetId | null;
};

export function PromptPresetGallery({ onSelectPreset, selectedPresetId = null }: PromptPresetGalleryProps) {
  return (
    <div className="w-full min-w-0 space-y-8">
      {GROUPS.map((group) => {
        const presets = PROMPT_PRESETS.filter((preset) => preset.category === group.category);

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
            <div className="grid min-w-0 gap-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {presets.map((preset) => (
                <PromptPresetCard
                  key={preset.id}
                  preset={preset}
                  onSelectPreset={onSelectPreset}
                  selected={selectedPresetId === preset.id}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
