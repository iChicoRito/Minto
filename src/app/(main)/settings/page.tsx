import { SettingsScreen } from "./_components/settings-screen";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Customize your Prompt Enhancer experience and manage your data.</p>
      </div>
      <SettingsScreen />
    </div>
  );
}
