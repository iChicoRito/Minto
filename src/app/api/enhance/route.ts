import { handleAiHttpRequest } from "@/server/ai/http-handler";

import { appendFile } from "node:fs/promises";

// Local development serves the enhancement API through this Route Handler.
// The standalone Vercel deployment uses root api/enhance.ts instead; the
// static export excludes this directory entirely (see build-static.mjs).
export const dynamic = "force-dynamic";

function isDebug(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.ENHANCE_DEBUG_LOG === "1";
}

export async function POST(request: Request): Promise<Response> {
  if (!isDebug()) return handleAiHttpRequest(request);

  const raw = await request.text();
  const startedAt = Date.now();
  const response = await handleAiHttpRequest(
    new Request(request.url, { method: "POST", headers: request.headers, body: raw }),
  );
  const lines: string[] = [
    `${new Date().toISOString()} status=${response.status} bytes=${Buffer.byteLength(raw, "utf8")}`,
    `content-type=${request.headers.get("content-type") ?? "<none>"}`,
  ];
  if (response.status >= 400) {
    try {
      const parsed: unknown = JSON.parse(raw);
      const { EnhancementRequestV1Schema } = await import("@/lib/ai-enhancement/contracts");
      const checked = EnhancementRequestV1Schema.safeParse(parsed);
      lines.push(
        checked.success
          ? "schema=OK (failure came from transport/parse stage)"
          : `issues=${JSON.stringify(checked.error.issues.map((issue) => ({ path: issue.path, code: issue.code })))}`,
      );
      lines.push(
        `json-keys=${
          checked.success || !parsed
            ? "?"
            : Object.keys(parsed as object)
                .sort()
                .join(",")
        }`,
      );
    } catch {
      lines.push("body-was-not-valid-json");
    }
  }
  lines.push(`durationMs=${Date.now() - startedAt}`, "---");
  try {
    await appendFile(".next/enhance-debug.log", `${lines.join("\n")}\n`, "utf8");
  } catch {
    // Diagnostics must never break the API response.
  }
  return response;
}

export async function OPTIONS(request: Request): Promise<Response> {
  return handleAiHttpRequest(request);
}
