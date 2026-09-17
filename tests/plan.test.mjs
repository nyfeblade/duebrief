import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const Plan = require(join(root, "plan.js"));

const now = new Date("2026-09-17T12:00:00");
const items = [
  { title: "Unit 3 test", course: "Physics", due: "2026-09-18T14:00:00", points: 100, type: "test", difficulty: 5 },
  { title: "DBQ", course: "History", due: "2026-09-16T16:00:00", points: 50, type: "project", difficulty: 4 },
  { title: "4.2 workbook", course: "Spanish", due: "2026-09-17T23:59:00", points: 10, type: "homework", difficulty: 2 },
];

const packed = Plan.tonight(items, now, 3);
assert.ok(packed.packed.length >= 1);
assert.equal(packed.packed[0].item.title, "Unit 3 test");
assert.ok(packed.used <= packed.budget || packed.overflow);

const week = Plan.weekMap(items, now);
assert.equal(week.length, 7);
assert.ok(week[0].count >= 2, "overdue + tonight land on day 0");

const s = Plan.stakes(items, now);
assert.equal(s.overduePoints, 50);
assert.ok(s.points48h >= 160);

const courses = Plan.courseLoad(items, now);
assert.equal(courses[0].course, "Physics");

assert.equal(Plan.heatFor(60), "ok");
assert.equal(Plan.heatFor(120), "tight");
assert.equal(Plan.heatFor(200), "blown");

console.log("plan tests ok");
