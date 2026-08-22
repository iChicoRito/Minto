import { PRODUCT_CASES } from "./verify-product-cases";
import assert from "node:assert/strict";

function main(): void {
  let passed = 0;
  for (const testCase of PRODUCT_CASES) {
    try {
      testCase.run();
      passed += 1;
    } catch (error) {
      console.error(`FAIL product / ${testCase.name}`);
      console.error(`    ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  assert.equal(passed, PRODUCT_CASES.length, `${PRODUCT_CASES.length - passed} product case(s) failed`);
  console.log(`product: ${passed}/${PRODUCT_CASES.length} passed`);
}

main();
