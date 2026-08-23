// @ts-nocheck
import { createAiHttpHandler } from "../server/ai/http-handler";
import type { ModelAdapter } from "../server/ai/openrouter-adapter";
import { performance } from "node:perf_hooks";

// Reports end-to-end enhancement handler latency with the provider and the
// admission lease replaced by deterministic stubs, so runs are comparable
// across code revisions on the same machine. The stub delay dominates wall
// time by design; the "overhead" line isolates the pipeline cost (parsing,
// validation, policy/engine work) that internal streamlining can actually
// reduce. Report-only: always exits 0.

const MODEL_DELAY_MS = 20;
const WARMUP_RUNS = 200;
const MEASURED_RUNS = 400;
const ORIGIN = "https://custom.example";

const MODEL_JSON = JSON.stringify({ sections: [{ id: "objective", content: ["Fix the login flow."] }] });

const REQUEST_BODY = JSON.stringify({
  version: 1,
  prompt: "fix the login flow",
  selection: { kind: "manual", taskType: "bug-fix" },
  level: "standard",
  sections: ["objective"],
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const actualStubDelays: number[] = [];

const benchModel: ModelAdapter = {
  async complete() {
    const startedAt = performance.now();
    await sleep(MODEL_DELAY_MS);
    actualStubDelays.push(performance.now() - startedAt);
    return MODEL_JSON;
  },
};

const benchAdmission = {
  async acquire() {
    return {
      status: "admitted",
      leaseId: "bench-lease",
      expiresAt: Date.now() + 90_000,
      retryAfterMs: 0,
      retryAfterSeconds: 0,
      activeCount: 1,
      prunedCount: 0,
    };
  },
  async release() {
    // No shared lease state to clean up in the benchmark.
  },
};

const handler = createAiHttpHandler({
  environment: {
    AI_ENHANCEMENT_ENABLED: "true",
    OPENROUTER_API_KEY: "bench-key",
    ALLOWED_ORIGIN: ORIGIN,
  },
  model: benchModel,
  admission: benchAdmission,
  requestId: () => "req-bench",
});

function buildRequest(): Request {
  return new Request("https://api.example/enhance", {
    method: "POST",
    headers: { Origin: ORIGIN, "Content-Type": "application/json" },
    body: REQUEST_BODY,
  });
}

function percentile(sorted: number[], ratio: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

async function main(): Promise<void> {
  for (let index = 0; index < WARMUP_RUNS; index += 1) {
    const response = await handler(buildRequest());
    await response.text();
  }

  const walls: number[] = [];
  const delays: number[] = [];
  for (let index = 0; index < MEASURED_RUNS; index += 1) {
    const startedAt = performance.now();
    const response = await handler(buildRequest());
    await response.text();
    walls.push(performance.now() - startedAt);
    delays.push(actualStubDelays[actualStubDelays.length - MEASURED_RUNS + index]);
  }
  // Timer jitter can occasionally make a sample unusable; exclude it rather
  // than failing, but say so so the report stays honest.
  const validIndexes = walls.map((wall, index) => (wall > MODEL_DELAY_MS ? index : -1)).filter((index) => index >= 0);
  if (validIndexes.length < walls.length) {
    console.warn(
      `measure-enhancement-latency: excluded ${walls.length - validIndexes.length} jitter-affected sample(s)`,
    );
  }

  const validWalls = validIndexes.map((index) => walls[index]);
  const sortedWalls = [...validWalls].sort((left, right) => left - right);
  const overheads = validIndexes.map((index) => walls[index] - delays[index]).sort((left, right) => left - right);
  const medianWall = percentile(sortedWalls, 0.5);
  const p95Wall = percentile(sortedWalls, 0.95);
  const medianOverhead = percentile(overheads, 0.5);
  const p95Overhead = percentile(overheads, 0.95);

  const actualMedianDelay = percentile(
    [...delays].sort((left, right) => left - right),
    0.5,
  );
  console.log(
    `measure-enhancement-latency: ${validIndexes.length}/${MEASURED_RUNS} runs, model-stub nominal=${MODEL_DELAY_MS}ms ` +
      `actual-median=${actualMedianDelay.toFixed(2)}ms | ` +
      `end-to-end median=${medianWall.toFixed(2)}ms p95=${p95Wall.toFixed(2)}ms | ` +
      `pipeline-overhead median=${medianOverhead.toFixed(3)}ms p95=${p95Overhead.toFixed(3)}ms`,
  );
}

void main();
