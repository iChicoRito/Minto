"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

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
          img: ({ alt }) => (
            <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">{alt || "Image"}</span>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
