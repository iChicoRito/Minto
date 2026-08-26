"use client";

import { Spinner } from "@/components/ui/spinner";

export function PredictionPendingIndicator({ pending }: { pending: boolean }) {
  return (
    <p className="flex h-4 items-center gap-2 px-1 text-muted-foreground text-xs" role="status">
      {pending ? (
        <>
          <Spinner className="size-3" />
          Predicting text...
        </>
      ) : null}
    </p>
  );
}
