/**
 * Parse a Schoology-shaped Upcoming dump.
 * CSV header: title,course,due,points,type,difficulty
 * Also accepts pipe-separated lines and date-only due values.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.DuebriefUpcoming = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var TYPES = { test: 1, project: 1, quiz: 1, homework: 1, other: 1 };

  function splitLine(line) {
    if (line.indexOf("|") !== -1 && line.indexOf(",") === -1) {
      return line.split("|").map(function (cell) {
        return cell.trim();
      });
    }
    var out = [];
    var cur = "";
    var q = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      if (ch === '"') {
        q = !q;
      } else if (ch === "," && !q) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  }

  function parseDue(raw) {
    if (!raw) return null;
    var text = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) text += "T15:00";
    var d = new Date(text);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  function parseType(raw) {
    var t = String(raw || "other")
      .trim()
      .toLowerCase();
    if (TYPES[t]) return t;
    if (t === "exam" || t === "midterm" || t === "final") return "test";
    if (t === "essay" || t === "dbq" || t === "paper") return "project";
    if (t === "hw") return "homework";
    return "other";
  }

  function parseRow(cells, header) {
    var map = {};
    if (header && header.length) {
      for (var i = 0; i < header.length && i < cells.length; i++) {
        map[header[i]] = cells[i];
      }
    } else {
      map.title = cells[0];
      map.course = cells[1];
      map.due = cells[2];
      map.points = cells[3];
      map.type = cells[4];
      map.difficulty = cells[5];
    }
    var title = (map.title || map.name || map.assignment || "").trim();
    var due = parseDue(map.due || map.due_date || map.deadline);
    if (!title || !due) return null;
    var points = map.points || map.max_points || map.pts;
    var difficulty = map.difficulty || map.diff;
    return {
      title: title,
      course: (map.course || map.class || "").trim() || null,
      due: due,
      points: points === "" || points == null ? null : Number(points),
      type: parseType(map.type || map.category),
      difficulty: difficulty === "" || difficulty == null ? null : Number(difficulty),
      status: "upcoming",
    };
  }

  function parse(text) {
    var lines = String(text || "")
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim();
      })
      .filter(function (line) {
        return line && line.charAt(0) !== "#";
      });
    if (!lines.length) return [];
    var first = splitLine(lines[0]).map(function (cell) {
      return cell.toLowerCase();
    });
    var hasHeader = first.indexOf("title") !== -1 || first.indexOf("assignment") !== -1;
    var header = hasHeader ? first : null;
    var start = hasHeader ? 1 : 0;
    var items = [];
    for (var i = start; i < lines.length; i++) {
      var row = parseRow(splitLine(lines[i]), header);
      if (row) items.push(row);
    }
    return items;
  }

  return { parse: parse, parseDue: parseDue, parseType: parseType };
});
