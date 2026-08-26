"use client";

import { useState } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/** Render remote markdown images directly, degrading to an alt-text chip when unsafe or broken. */
function SafeImage({ alt, src }: { alt?: string; src?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">{alt ?? "Image"}</span>;
  }
  return (
    // biome-ignore lint/performance/noImgElement: arbitrary remote markdown URLs are not next/image candidates
    <img
      alt={alt ?? ""}
      className="mx-auto max-h-80 rounded-lg border"
      draggable={false}
      loading="lazy"
      referrerPolicy="no-referrer"
      src={src}
      onError={() => setFailed(true)}
    />
  );
}

export function MarkdownPreview({ className, markdown }: { className?: string; markdown: string }) {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
        skipHtml
        components={{
          a: ({ href, children, ...props }) => {
            const external = href?.startsWith("http://") || href?.startsWith("https://");
            return (
              <a
                {...props}
                href={href}
                rel={external ? "noopener noreferrer" : undefined}
                target={external ? "_blank" : undefined}
              >
                {children}
              </a>
            );
          },
          img: ({ alt, src }) => <SafeImage alt={alt} src={typeof src === "string" ? src : undefined} />,
          pre: ({ children, className, ...props }) => (
            <pre
              {...props}
              className={cn(className, "overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs")}
            >
              {children}
            </pre>
          ),
          table: ({ children, className, ...props }) => (
            <div className="overflow-x-auto">
              <table {...props} className={cn("my-4 w-full", className)}>
                {children}
              </table>
            </div>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
