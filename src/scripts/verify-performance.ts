import { enhancePrompt } from "../prompt-engine";
import { ENGINE_DATASET } from "./engine-dataset";
import { performance } from "node:perf_hooks";

const WARMUP_RUNS = 20;
const MEASURED_PASSES = 5;
const TARGET_MS = 100;

for (let index = 0; index < WARMUP_RUNS; index += 1) {
  for (const testCase of ENGINE_DATASET) enhancePrompt(testCase.input);
}

const durations: number[] = [];
for (let pass = 0; pass < MEASURED_PASSES; pass += 1) {
  const start = performance.now();
  for (const testCase of ENGINE_DATASET) enhancePrompt(testCase.input);
  durations.push(performance.now() - start);
}

const sorted = [...durations].sort((left, right) => left - right);
const percentile = (ratio: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
const median = percentile(0.5);
const p95 = percentile(0.95);
const worst = sorted[sorted.length - 1];

console.log(
  `verify-performance: ${ENGINE_DATASET.length} prompts × ${MEASURED_PASSES} passes; median=${median.toFixed(2)}ms p95=${p95.toFixed(2)}ms worst=${worst.toFixed(2)}ms`,
);
if (p95 >= TARGET_MS) {
  console.error(`verify-performance: p95 must be <${TARGET_MS}ms`);
  process.exitCode = 1;
}
