/**
 * How long an Upcoming item actually takes.
 * Opinionated, same spirit as the ranker: tests and DBQs eat the night.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.DuebriefEstimate = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function minutes(item) {
    var difficulty = item.difficulty == null ? 3 : Number(item.difficulty);
    var points = item.points == null ? 20 : Number(item.points);
    difficulty = clamp(difficulty, 1, 5);
    points = clamp(points, 0, 200);
    var type = item.type || "other";
    var raw;
    switch (type) {
      case "test":
        raw = 40 + 22 * difficulty + points * 0.35;
        break;
      case "project":
        raw = 50 + 28 * difficulty + points * 0.7;
        break;
      case "quiz":
        raw = 18 + 10 * difficulty + points * 0.2;
        break;
      case "homework":
        raw = 12 + 7 * difficulty + points * 0.12;
        break;
      case "other":
        raw = 18 + 9 * difficulty + points * 0.1;
        break;
      default: {
        var _unused = type;
        raw = 18 + 9 * difficulty + points * 0.1;
        break;
      }
    }
    return Math.round(clamp(raw, 10, 360));
  }

  function label(mins) {
    if (mins < 60) return mins + "m";
    var hours = Math.floor(mins / 60);
    var rest = mins % 60;
    if (!rest) return hours + "h";
    return hours + "h " + rest + "m";
  }

  return { minutes: minutes, label: label };
});
