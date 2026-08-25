/**
 * Contract verification harness for the versioned DeepSeek enhancement API.
 * This repository intentionally uses dependency-light node:assert runners
 * instead of a test framework.
 */

import { AI_CASES } from "./verify-ai-cases";
import assert from "node:assert/strict";

type Failure = { name: string; message: string };
type VerificationCase = { name: string; run: () => void | Promise<void> };

export async function runAiCases(
  cases: readonly VerificationCase[],
  options: { reportFailures?: boolean } = {},
): Promise<Failure[]> {
  const failures: Failure[] = [];

  for (const testCase of cases) {
    try {
      await testCase.run();
    } catch (error) {
      failures.push({ name: testCase.name, message: error instanceof Error ? error.message : String(error) });
      if (options.reportFailures !== false) {
        console.error(`FAIL ${testCase.name}`);
        console.error(`    ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return failures;
}

async function main(): Promise<void> {
  const asyncRejectionFailures = await runAiCases(
    [
      {
        name: "async rejection probe",
        run: async () => {
          throw new Error("async rejection probe");
        },
      },
    ],
    { reportFailures: false },
  );
  assert.equal(asyncRejectionFailures.length, 1, "the runner must await and capture rejected async cases");
  assert.equal(asyncRejectionFailures[0]?.message, "async rejection probe");

  const failures = await runAiCases(AI_CASES);

  const passed = AI_CASES.length - failures.length;
  console.log(`ai: ${passed}/${AI_CASES.length} passed`);

  if (failures.length > 0) {
    console.error(`verify-ai: ${failures.length} FAILURE(S)`);
    for (const failure of failures) console.error(`  - ${failure.name}: ${failure.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`verify-ai: ALL PASS (${AI_CASES.length} checks)`);
}

void main().catch((error) => {
  console.error(`verify-ai harness failure: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
