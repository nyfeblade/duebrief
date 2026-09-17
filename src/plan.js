/**
 * Tonight packer, week collision map, grade-stakes, course load.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./estimate.js"), require("./score.js"));
  } else {
    root.DuebriefPlan = factory(root.DuebriefEstimate, root.DuebriefScore);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (Estimate, Score) {
  "use strict";

  function asDate(value) {
    return value instanceof Date ? value : new Date(value);
  }

  function startOfDay(now) {
    var d = asDate(now);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function active(items) {
    return (items || []).filter(function (item) {
      return item && item.status !== "submitted";
    });
  }

  function withMath(items, now) {
    return active(items)
      .map(function (item) {
        return {
          item: item,
          math: Score.components(item, now),
          minutes: Estimate.minutes(item),
        };
      })
      .sort(function (a, b) {
        return b.math.total - a.math.total;
      });
  }

  function tonight(items, now, hours) {
    hours = Number(hours);
    if (!(hours > 0)) hours = 3;
    var budget = Math.round(hours * 60);
    var rows = withMath(items, now);
    var packed = [];
    var leftover = [];
    var used = 0;
    rows.forEach(function (row) {
      if (used === 0 || used + row.minutes <= budget) {
        packed.push(row);
        used += row.minutes;
      } else {
        leftover.push(row);
      }
    });
    var leftoverPoints48h = leftover.reduce(function (sum, row) {
      if (row.math.daysUntilDue * 24 <= 48) return sum + (row.item.points || 0);
      return sum;
    }, 0);
    return {
      hours: hours,
      budget: budget,
      used: used,
      packed: packed,
      leftover: leftover,
      leftoverPoints48h: leftoverPoints48h,
      overflow: used > budget,
    };
  }

  function heatFor(minutes) {
    if (minutes <= 90) return "ok";
    if (minutes <= 180) return "tight";
    return "blown";
  }

  function weekMap(items, now) {
    var origin = startOfDay(now);
    var rows = withMath(items, now);
    var days = [];
    for (var i = 0; i < 7; i++) {
      var dayStart = new Date(origin.getTime() + i * 86400000);
      var dayEnd = new Date(dayStart.getTime() + 86400000);
      var onDay = rows.filter(function (row) {
        var due = asDate(row.item.due).getTime();
        if (i === 0) return due < dayEnd.getTime();
        return due >= dayStart.getTime() && due < dayEnd.getTime();
      });
      var minutes = onDay.reduce(function (sum, row) {
        return sum + row.minutes;
      }, 0);
      var points = onDay.reduce(function (sum, row) {
        return sum + (row.item.points || 0);
      }, 0);
      days.push({
        date: dayStart.toISOString(),
        label: dayStart.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
        minutes: minutes,
        points: points,
        count: onDay.length,
        items: onDay,
        heat: heatFor(minutes),
      });
    }
    return days;
  }

  function stakes(items, now) {
    var rows = withMath(items, now);
    var overduePoints = 0;
    var points48h = 0;
    var points7d = 0;
    var minutesOverdue = 0;
    rows.forEach(function (row) {
      var pts = row.item.points || 0;
      var hours = row.math.daysUntilDue * 24;
      if (row.math.daysUntilDue <= 0) {
        overduePoints += pts;
        minutesOverdue += row.minutes;
      }
      if (hours <= 48) points48h += pts;
      if (hours <= 168) points7d += pts;
    });
    return {
      openCount: rows.length,
      overduePoints: overduePoints,
      points48h: points48h,
      points7d: points7d,
      minutesOverdue: minutesOverdue,
    };
  }

  function courseLoad(items, now) {
    var rows = withMath(items, now);
    var map = {};
    rows.forEach(function (row) {
      var name = row.item.course || "No course";
      if (!map[name]) map[name] = { course: name, points: 0, minutes: 0, count: 0, score: 0 };
      map[name].points += row.item.points || 0;
      map[name].minutes += row.minutes;
      map[name].count += 1;
      map[name].score += row.math.total;
    });
    return Object.keys(map)
      .map(function (key) {
        return map[key];
      })
      .sort(function (a, b) {
        return b.points - a.points || b.minutes - a.minutes;
      });
  }

  return {
    tonight: tonight,
    weekMap: weekMap,
    stakes: stakes,
    courseLoad: courseLoad,
    withMath: withMath,
    heatFor: heatFor,
  };
});
