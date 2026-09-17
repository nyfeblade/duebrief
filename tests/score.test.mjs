import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const DuebriefScore = require(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "score.js"));

const now = new Date("2026-09-17T12:00:00");

function item(overrides) {
  return Object.assign(
    {
      title: "x",
      due: "2026-09-16T12:00:00",
      points: 20,
      type: "homework",
      difficulty: 3,
      status: "upcoming",
    },
    overrides
  );
}

assert.equal(DuebriefScore.score(item({}), now), 70.5);
assert.equal(
  DuebriefScore.score(
    item({
      due: "2026-09-18T12:00:00",
      points: 100,
      type: "test",
      difficulty: 5,
    }),
    now
  ),
  94.49
);
assert.equal(
  DuebriefScore.score(
    item({
      due: "2026-10-10T12:00:00",
      points: 10,
      type: "homework",
      difficulty: 1,
    }),
    now
  ),
  10.5
);
assert.equal(
  DuebriefScore.score(
    item({
      due: "2026-09-20T12:00:00",
      points: 50,
      type: "quiz",
      difficulty: 3,
    }),
    now
  ),
  57.69
);
assert.equal(
  DuebriefScore.score(
    item({
      due: "2026-09-18T12:00:00",
      points: 100,
      type: "test",
      difficulty: 5,
      status: "submitted",
    }),
    now
  ),
  0
);
assert.equal(
  DuebriefScore.score(
    item({
      due: "2026-09-24T12:00:00",
      points: null,
      type: "project",
      difficulty: null,
    }),
    now
  ),
  39.5
);

const testBeatsHomework = DuebriefScore.score(
  item({ due: "2026-09-20T12:00:00", points: 20, type: "test", difficulty: 3 }),
  now
);
const homework = DuebriefScore.score(
  item({ due: "2026-09-20T12:00:00", points: 20, type: "homework", difficulty: 3 }),
  now
);
assert.ok(testBeatsHomework > homework, "a test outranks homework of the same weight");

console.log("score tests ok");
