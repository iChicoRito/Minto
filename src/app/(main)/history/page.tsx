import { HistoryScreen } from "./_components/history-screen";

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">History</h1>
        <p className="text-muted-foreground text-sm">Browse your previously enhanced prompts.</p>
      </div>
      <HistoryScreen />
    </div>
  );
}
