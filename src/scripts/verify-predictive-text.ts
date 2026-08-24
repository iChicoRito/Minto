import { PREDICTIVE_TEXT_CASES } from "./verify-predictive-text-cases";

type Failure = { name: string; message: string };

export async function runPredictiveTextCases(
  cases: readonly { name: string; run: () => void | Promise<void> }[],
  options: { reportFailures?: boolean } = {},
): Promise<Failure[]> {
  const failures: Failure[] = [];

  for (const testCase of cases) {
    try {
      await testCase.run();
    } catch (error) {
      failures.push({ name: testCase.name, message: error instanceof Error ? error.message : String(error) });
      if (options.reportFailures !== false) {
        console.error(`FAIL predictive-text / ${testCase.name}`);
        console.error(`    ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return failures;
}

async function main(): Promise<void> {
  const failures = await runPredictiveTextCases(PREDICTIVE_TEXT_CASES);
  const passed = PREDICTIVE_TEXT_CASES.length - failures.length;
  console.log(`predictive-text: ${passed}/${PREDICTIVE_TEXT_CASES.length} passed`);

  if (failures.length > 0) {
    console.error(`verify-predictive-text: ${failures.length} FAILURE(S)`);
    for (const failure of failures) console.error(`  - ${failure.name}: ${failure.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`verify-predictive-text: ALL PASS (${PREDICTIVE_TEXT_CASES.length} checks)`);
}

void main().catch((error) => {
  console.error(`verify-predictive-text harness failure: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
