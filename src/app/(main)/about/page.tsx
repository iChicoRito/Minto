export default function AboutPage() {
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="font-semibold text-xl">About Prompt Enhancer</h1>
        <p className="text-muted-foreground text-sm">
          A local-first, rule-based tool for turning rough instructions into clearer prompts.
        </p>
      </div>
      <section className="space-y-2 rounded-lg border p-4" aria-labelledby="privacy-title">
        <h2 id="privacy-title" className="font-medium">
          Privacy
        </h2>
        <p className="text-muted-foreground text-sm">Your prompts are processed locally on your device.</p>
        <p className="text-muted-foreground text-sm">No prompt content is sent to an external server.</p>
        <p className="text-muted-foreground text-sm">
          The application files come from its static host. Local browser data is not encrypted or synced, so export a
          backup before clearing browser data or changing origins.
        </p>
      </section>
    </div>
  );
}
