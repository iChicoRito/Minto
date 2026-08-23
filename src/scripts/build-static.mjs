import { writeServiceWorker } from "./build-service-worker.mjs";
import { spawnSync } from "node:child_process";
import { access, cp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const stage = path.join(root, ".static-build");
const out = path.join(root, "out");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

await rm(stage, { recursive: true, force: true });
await rm(out, { recursive: true, force: true });
await mkdir(stage, { recursive: true });

const sourceRoot = path.join(root, "src");
await cp(sourceRoot, path.join(stage, "src"), {
  recursive: true,
  filter: (source) =>
    !source.includes(`${path.sep}app${path.sep}(template)`) && !/[/\\]app[/\\]api([/\\]|$)/.test(source),
});
await cp(path.join(root, "public"), path.join(stage, "public"), { recursive: true });
// The standalone Vercel Function source is staged so type checks can resolve
// its imports; Next ignores the root api/ directory during static export.
await cp(path.join(root, "api"), path.join(stage, "api"), { recursive: true });
try {
  await access(path.join(stage, "src/app/(template)"));
  throw new Error("Static staging source contains the frozen template.");
} catch (error) {
  if (error instanceof Error && error.message.includes("frozen template")) throw error;
}
for (const file of ["next.config.mjs", "tsconfig.json", "postcss.config.mjs"]) {
  await cp(path.join(root, file), path.join(stage, file));
}
await writeFile(path.join(stage, "package.json"), await readFile(path.join(root, "package.json")));
await symlink(path.join(root, "node_modules"), path.join(stage, "node_modules"), "junction");

const nextCli = path.join(root, "node_modules/next/dist/bin/next");
const result = spawnSync(process.execPath, [nextCli, "build"], {
  cwd: stage,
  env: {
    ...process.env,
    NEXT_STATIC_EXPORT: "1",
    NEXT_PUBLIC_STATIC_EXPORT: "1",
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  stdio: "inherit",
});
if (result.status !== 0) throw new Error("Static Next build failed.");

await cp(path.join(stage, "out"), out, { recursive: true });
await writeServiceWorker(out, basePath);
await writeFile(path.join(out, ".nojekyll"), "");

const required = [
  "index.html",
  "404.html",
  "presets/index.html",
  "library/index.html",
  "history/index.html",
  "settings/index.html",
  "about/index.html",
  "manifest.webmanifest",
  "sw.js",
  "icons/prompt-enhancer.svg",
];
for (const file of required) {
  try {
    await readFile(path.join(out, file));
  } catch {
    throw new Error(`Static artifact is missing ${file}.`);
  }
}
const outputFiles = await readFile(path.join(out, "sw.js"), "utf8");
if (!outputFiles.includes("const PRECACHE =")) throw new Error("Static artifact has no precache manifest.");
try {
  await access(path.join(out, "template"));
  throw new Error("Static artifact contains the frozen template.");
} catch (error) {
  if (error instanceof Error && error.message.includes("frozen template")) throw error;
}

await rm(stage, { recursive: true, force: true });
console.log(`static build: ${out}`);
