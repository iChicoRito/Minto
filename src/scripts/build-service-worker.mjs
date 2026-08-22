import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function filesIn(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...(await filesIn(path.join(directory, entry.name), relative)));
    else files.push(relative.replaceAll(path.sep, "/"));
  }
  return files;
}

export async function writeServiceWorker(outDirectory, basePath = "") {
  const base = basePath ? `/${basePath.replace(/^\/+|\/+$/g, "")}` : "";
  const files = (await filesIn(outDirectory)).filter((file) => file !== "sw.js");
  const entries = [];
  const hash = createHash("sha256");
  for (const file of files.sort()) {
    const content = await readFile(path.join(outDirectory, file));
    hash.update(file);
    hash.update(content);
    const url =
      file === "index.html"
        ? `${base}/`
        : file.endsWith("/index.html")
          ? `${base}/${file.slice(0, -10)}`
          : `${base}/${file}`;
    entries.push(url.replaceAll("//", "/"));
  }
  const revision = hash.digest("hex").slice(0, 16);
  const source = `const CACHE_NAME = "prompt-enhancer-${revision}";
const PRECACHE = ${JSON.stringify(entries)};
const ROOT_URL = ${JSON.stringify(`${base}/`)};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("prompt-enhancer-") && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then((cached) => cached ?? (event.request.mode === "navigate" ? caches.match(ROOT_URL) : fetch(event.request))));
});
`;
  await writeFile(path.join(outDirectory, "sw.js"), source, "utf8");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeServiceWorker(process.argv[2], process.argv[3] ?? "");
}
