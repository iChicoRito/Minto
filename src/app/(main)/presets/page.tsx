import { PresetGallery } from "./_components/preset-gallery";

export default function PresetsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-semibold text-xl">Presets</h1>
      <p className="text-muted-foreground text-sm">Choose a starting point for the Enhance workspace.</p>
      <PresetGallery />
    </div>
  );
}
