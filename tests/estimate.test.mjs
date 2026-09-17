import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const Estimate = require(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "estimate.js"));

const testMins = Estimate.minutes({ type: "test", difficulty: 5, points: 100 });
const hwMins = Estimate.minutes({ type: "homework", difficulty: 2, points: 10 });
assert.ok(testMins > hwMins * 2, "a unit test should eat more of the night than a workbook");
assert.equal(Estimate.label(45), "45m");
assert.equal(Estimate.label(90), "1h 30m");
assert.equal(Estimate.minutes({ type: "mystery", difficulty: 3, points: 20 }), Estimate.minutes({ type: "other", difficulty: 3, points: 20 }));

console.log("estimate tests ok");
