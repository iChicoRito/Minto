"use client";

import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface PromptOptions {
  title: string;
  description?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

/**
 * Replaces native `window.prompt` with shadcn Dialog + Input.
 * `prompt` resolves to `string` when user confirms, `null` when cancelled/dismissed.
 */
export function usePrompt() {
  const [options, setOptions] = useState<PromptOptions | null>(null);
  const [value, setValue] = useState("");
  const resolverRef = useRef<((value: string | null) => void) | null>(null);

  const prompt = useCallback((next: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve;
      setOptions(next);
      setValue(next.defaultValue ?? "");
    });
  }, []);

  const close = useCallback((result: string | null) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      close(value);
    },
    [close, value],
  );

  const dialog = options ? (
    <Dialog open onOpenChange={(open) => !open && close(null)}>
      <DialogContent className="sm:max-w-md" onCloseAutoFocus={(e) => e.preventDefault()}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{options.title}</DialogTitle>
            {options.description && <DialogDescription>{options.description}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="prompt-input" className="sr-only">
              {options.title}
            </Label>
            <Input
              id="prompt-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={options.placeholder}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(null)}>
              {options.cancelLabel ?? "Cancel"}
            </Button>
            <Button type="submit">{options.confirmLabel ?? "Confirm"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  ) : null;

  return { prompt, dialog };
}
