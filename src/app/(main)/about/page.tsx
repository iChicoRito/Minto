export default function AboutPage() {
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="font-semibold text-xl">About Minto</h1>
        <p className="text-muted-foreground text-sm">
          A local-first tool for turning rough instructions into clearer prompts with a built-in rule engine and
          optional online enhancement.
        </p>
      </div>
      <section className="space-y-2 rounded-lg border p-4" aria-labelledby="privacy-title">
        <h2 id="privacy-title" className="font-medium">
          Privacy and data handling
        </h2>
        <p className="text-muted-foreground text-sm">
          The built-in rule engine processes prompts locally in your browser. History, the prompt library, and settings
          are stored in this browser only; they are not encrypted or synced.
        </p>
        <p className="text-muted-foreground text-sm">
          Online enhancement uses a separate path. When it is configured and selected, your prompt and the resulting
          completion leave your browser and are processed by the configured enhancement service and its third-party
          provider. The provider may retain prompts and completions.
        </p>
        <p className="text-muted-foreground text-sm">
          Provider terms may permit training, evaluation, and improvement on submitted content. Assume that sensitive or
          confidential information is prohibited.
        </p>
        <p className="text-muted-foreground text-sm">
          The enhancement pipeline treats prompt text as untrusted and applies bounded safeguards, but no
          prompt-injection defense is universal. Do not rely on this tool to prevent prompt injection.
        </p>
        <p className="text-muted-foreground text-sm">
          The application files come from its static host. Browser-local data is subject to access by the browser
          profile and device, so export a backup before clearing browser data or changing origins.
        </p>
      </section>
    </div>
  );
}
