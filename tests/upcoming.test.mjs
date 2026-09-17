import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const Upcoming = require(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "upcoming.js"));

const csv = `title,course,due,points,type,difficulty
Unit 3 Test,Physics,2026-09-18,100,test,5
DBQ: Reconstruction,History,2026-09-16T08:00,50,project,4
4.2 workbook,Spanish,2026-09-17T23:59,10,hw,2`;

const items = Upcoming.parse(csv);
assert.equal(items.length, 3);
assert.equal(items[0].type, "test");
assert.equal(items[0].course, "Physics");
assert.equal(items[1].type, "project");
assert.equal(items[2].type, "homework");
assert.ok(items[0].due.startsWith("2026-09-18"));

const pipes = Upcoming.parse("Mole quiz | Chem | 2026-09-19 | 25 | quiz | 3");
assert.equal(pipes[0].title, "Mole quiz");
assert.equal(pipes[0].type, "quiz");

assert.equal(Upcoming.parseType("exam"), "test");
assert.equal(Upcoming.parseType("DBQ"), "project");

console.log("upcoming tests ok");
