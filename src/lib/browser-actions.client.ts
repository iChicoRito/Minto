"use client";

export async function copyText(value: string): Promise<void> {
  if (!navigator.clipboard) throw new Error("Clipboard is unavailable in this browser.");
  await navigator.clipboard.writeText(value);
}

export function requestTextDownload(filename: string, text: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
