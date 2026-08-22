import { SettingsScreen } from "./_components/settings-screen";

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-semibold text-xl">Settings</h1>
        <p className="text-muted-foreground text-sm">Control your defaults, appearance, and local data.</p>
      </div>
      <SettingsScreen />
    </div>
  );
}
