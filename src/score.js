/**
 * Duebrief scoring — same model Luke uses in schedule-mcp.
 * Weights sum to 100 so a raw score reads as "out of 100".
 * Overdue work can exceed 100. Submitted work is always 0.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.DuebriefScore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var DEFAULT_WEIGHT_URGENCY = 40;
  var DEFAULT_WEIGHT_POINTS = 25;
  var DEFAULT_WEIGHT_TYPE = 20;
  var DEFAULT_WEIGHT_DIFFICULTY = 15;
  var WEIGHT_URGENCY = DEFAULT_WEIGHT_URGENCY;
  var WEIGHT_POINTS = DEFAULT_WEIGHT_POINTS;
  var WEIGHT_TYPE = DEFAULT_WEIGHT_TYPE;
  var WEIGHT_DIFFICULTY = DEFAULT_WEIGHT_DIFFICULTY;
  var URGENCY_HORIZON_DAYS = 14;
  var URGENCY_CURVE_EXPONENT = 2;
  var URGENCY_OVERDUE_VALUE = 1.25;
  var POINTS_REFERENCE = 100;
  var DEFAULT_POINTS = 20;
  var DEFAULT_DIFFICULTY = 3;
  var SUBMITTED_SCORE = 0;
  var TYPE_WEIGHTS = {
    test: 1.0,
    project: 0.85,
    quiz: 0.65,
    homework: 0.4,
    other: 0.3,
  };

  function clamp(value, low, high) {
    if (low === undefined) low = 0;
    if (high === undefined) high = 1;
    return Math.max(low, Math.min(high, value));
  }

  function asDate(value) {
    if (value instanceof Date) return value;
    return new Date(value);
  }

  function typeWeight(type) {
    if (Object.prototype.hasOwnProperty.call(TYPE_WEIGHTS, type)) {
      return TYPE_WEIGHTS[type];
    }
    return TYPE_WEIGHTS.other;
  }

  function components(item, now) {
    now = now ? asDate(now) : new Date();
    var due = asDate(item.due);
    var daysUntilDue = (due.getTime() - now.getTime()) / 86400000;
    var status = item.status || "upcoming";

    if (status === "submitted") {
      return {
        total: SUBMITTED_SCORE,
        daysUntilDue: Math.round(daysUntilDue * 100) / 100,
        urgency: 0,
        points: 0,
        type: 0,
        difficulty: 0,
        note: "submitted — excluded",
      };
    }

    var urgency;
    if (daysUntilDue <= 0) {
      urgency = URGENCY_OVERDUE_VALUE;
    } else {
      urgency = Math.pow(
        clamp(1 - daysUntilDue / URGENCY_HORIZON_DAYS),
        URGENCY_CURVE_EXPONENT
      );
    }

    var rawPoints = item.points == null ? DEFAULT_POINTS : Number(item.points);
    var pointsComponent = clamp(rawPoints / POINTS_REFERENCE);
    var typeComponent = typeWeight(item.type);
    var difficulty =
      item.difficulty == null ? DEFAULT_DIFFICULTY : Number(item.difficulty);
    var difficultyComponent = clamp((difficulty - 1) / 4);

    var urgencyPts = WEIGHT_URGENCY * urgency;
    var pointsPts = WEIGHT_POINTS * pointsComponent;
    var typePts = WEIGHT_TYPE * typeComponent;
    var difficultyPts = WEIGHT_DIFFICULTY * difficultyComponent;
    var total = Math.round((urgencyPts + pointsPts + typePts + difficultyPts) * 100) / 100;

    return {
      total: total,
      daysUntilDue: Math.round(daysUntilDue * 100) / 100,
      urgency: Math.round(urgencyPts * 100) / 100,
      points: Math.round(pointsPts * 100) / 100,
      type: Math.round(typePts * 100) / 100,
      difficulty: Math.round(difficultyPts * 100) / 100,
      note: daysUntilDue <= 0 ? "overdue" : "",
    };
  }

  function score(item, now) {
    return components(item, now).total;
  }

  function weights() {
    return {
      urgency: WEIGHT_URGENCY,
      points: WEIGHT_POINTS,
      type: WEIGHT_TYPE,
      difficulty: WEIGHT_DIFFICULTY,
    };
  }

  function configure(next) {
    if (!next) {
      WEIGHT_URGENCY = DEFAULT_WEIGHT_URGENCY;
      WEIGHT_POINTS = DEFAULT_WEIGHT_POINTS;
      WEIGHT_TYPE = DEFAULT_WEIGHT_TYPE;
      WEIGHT_DIFFICULTY = DEFAULT_WEIGHT_DIFFICULTY;
    } else {
      if (next.urgency != null) WEIGHT_URGENCY = Number(next.urgency);
      if (next.points != null) WEIGHT_POINTS = Number(next.points);
      if (next.type != null) WEIGHT_TYPE = Number(next.type);
      if (next.difficulty != null) WEIGHT_DIFFICULTY = Number(next.difficulty);
    }
    return weights();
  }

  return {
    score: score,
    components: components,
    typeWeight: typeWeight,
    configure: configure,
    weights: weights,
    CONSTANTS: {
      WEIGHT_URGENCY: DEFAULT_WEIGHT_URGENCY,
      WEIGHT_POINTS: DEFAULT_WEIGHT_POINTS,
      WEIGHT_TYPE: DEFAULT_WEIGHT_TYPE,
      WEIGHT_DIFFICULTY: DEFAULT_WEIGHT_DIFFICULTY,
      URGENCY_HORIZON_DAYS: URGENCY_HORIZON_DAYS,
      URGENCY_CURVE_EXPONENT: URGENCY_CURVE_EXPONENT,
      URGENCY_OVERDUE_VALUE: URGENCY_OVERDUE_VALUE,
      POINTS_REFERENCE: POINTS_REFERENCE,
      DEFAULT_POINTS: DEFAULT_POINTS,
      DEFAULT_DIFFICULTY: DEFAULT_DIFFICULTY,
      SUBMITTED_SCORE: SUBMITTED_SCORE,
      TYPE_WEIGHTS: TYPE_WEIGHTS,
    },
  };
});
