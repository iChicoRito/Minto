import { EnhancerWorkspace } from "./_components/enhancer-workspace";

export default function EnhancePage() {
  return (
    <div className="space-y-6">
      <h1 className="font-semibold text-xl">Enhance</h1>
      <p className="text-muted-foreground text-sm">
        Turn rough instructions into clear, reusable prompts. Everything runs locally in your browser.
      </p>
      <EnhancerWorkspace />
    </div>
  );
}
