import { HistoryScreen } from "./_components/history-screen";

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-semibold text-xl">History</h1>
      <p className="text-muted-foreground text-sm">Automatic history for successful enhancements, stored locally.</p>
      <HistoryScreen />
    </div>
  );
}
