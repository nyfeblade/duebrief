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

const now = new Date("2026-09-17T12:00:00");
const prose = Upcoming.parse("Physics: Unit 3 test 100 pts due Sep 18", now);
assert.equal(prose.length, 1);
assert.equal(prose[0].course, "Physics");
assert.equal(prose[0].title, "Unit 3 test");
assert.equal(prose[0].points, 100);
assert.equal(prose[0].type, "test");
assert.ok(prose[0].due.startsWith("2026-09-18"));

const tabs = Upcoming.parse("Mole quiz\tChem\t2026-09-19\t25\tquiz\t3");
assert.equal(tabs[0].course, "Chem");

const dashes = Upcoming.parse("DBQ: Reconstruction — History — Sep 16 — 50", now);
assert.equal(dashes[0].type, "project");

assert.equal(Upcoming.inferType("Unit 3 exam"), "test");
assert.equal(Upcoming.parseDue("tomorrow", now).startsWith("2026-09-18"), true);

console.log("upcoming tests ok");
