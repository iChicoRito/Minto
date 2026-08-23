import { PresetGallery } from "./_components/preset-gallery";

export default function PresetsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Presets</h1>
        <p className="text-muted-foreground text-sm">Choose a starting point for the Enhance workspace.</p>
      </div>
      <PresetGallery />
    </div>
  );
}
