import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const Share = require(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "share.js"));

const items = [
  {
    title: "Unit 3 test",
    course: "Physics",
    due: "2026-09-18T15:00:00.000Z",
    points: 100,
    type: "test",
    difficulty: 5,
    status: "upcoming",
  },
];

const hash = Share.encode(items);
assert.ok(hash.startsWith("d="));
const back = Share.decode("#" + hash);
assert.equal(back.length, 1);
assert.equal(back[0].title, "Unit 3 test");
assert.equal(back[0].points, 100);
assert.equal(Share.decode(""), null);

console.log("share tests ok");
