import { LibraryScreen } from "./_components/library-screen";

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-semibold text-xl">Library</h1>
      <p className="text-muted-foreground text-sm">Prompts you deliberately save, organized locally.</p>
      <LibraryScreen />
    </div>
  );
}
