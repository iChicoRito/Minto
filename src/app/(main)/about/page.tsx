import { Database, Lock, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">About Minto</h1>
        <p className="text-muted-foreground text-sm">
          A local-first tool for turning rough instructions into clearer, structured prompts.
        </p>
      </div>

      <div className="grid gap-4">
        <Card className="rounded-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lime-500/10 text-lime-600 dark:bg-lime-400/10 dark:text-lime-400">
                <Sparkles className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lime-600 dark:text-lime-400">What is Minto?</CardTitle>
                <CardDescription>Built for clarity, speed, and privacy.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p className="text-muted-foreground">
              Minto helps you turn rough ideas into well-structured prompts with a built-in rule engine. No setup, no
              accounts — just open the app and enhance. Choose a preset or start from scratch, then refine with levels
              and sections that fit your workflow.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="secondary" className="capitalize">
                Local-first
              </Badge>
              <Badge variant="outline" className="capitalize">
                No account required
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-lime-500/10 text-lime-600 dark:bg-lime-400/10 dark:text-lime-400">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <CardTitle className="text-sm">Privacy First — Clear Data Boundaries</CardTitle>
              <CardDescription>Local data stays in your browser; online AI features are optional.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-4">
              <div className="flex size-8 items-center justify-center rounded-lg bg-background text-lime-600 dark:text-lime-400">
                <Database className="size-4" />
              </div>
              <p className="font-medium text-sm">Local Data</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                History, library, folders, settings, and local prediction ranking stay in your browser via IndexedDB.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-4">
              <div className="flex size-8 items-center justify-center rounded-lg bg-background text-lime-600 dark:text-lime-400">
                <Lock className="size-4" />
              </div>
              <p className="font-medium text-sm">No Tracking</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                No analytics or tracking database is introduced. History is never transmitted for prediction, while
                optional online AI features have separate provider data handling.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-4">
              <div className="flex size-8 items-center justify-center rounded-lg bg-background text-lime-600 dark:text-lime-400">
                <ShieldCheck className="size-4" />
              </div>
              <p className="font-medium text-sm">You Own Your Data</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Export a backup anytime or clear everything with one click. Local app data is not synced.
              </p>
            </div>
          </div>
          <p className="pt-4 text-muted-foreground text-xs">
            Local ranking and browser data stay on this device. Explicit AI enhancement and unmatched predictive drafts
            may use the configured online provider; do not use sensitive or confidential prompts with online AI
            features. Provider retention and training terms are documented in the project README.
          </p>
        </CardContent>
      </Card>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-muted-foreground text-xs">
        <span>© {new Date().getFullYear()} Minto — by Mr. Mark Adrianne Salunga. All rights reserved.</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-lime-500" /> Local-first • Private by design
        </span>
      </div>
    </div>
  );
}
