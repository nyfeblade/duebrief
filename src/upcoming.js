/**
 * Parse a Schoology-shaped Upcoming dump.
 * CSV, pipes, tabs, em-dashes, and messy "100 pts due Sep 18" lines.
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
  var MONTHS = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
  };

  function splitLine(line) {
    if (line.indexOf("\t") !== -1) {
      return line.split("\t").map(function (cell) {
        return cell.trim();
      });
    }
    if (/[–—]/.test(line) && line.indexOf(",") === -1) {
      return line.split(/[–—]/).map(function (cell) {
        return cell.trim();
      });
    }
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

  function parseNamedMonth(text, now) {
    var m = text.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*((?:20)?\d{2}))?/);
    if (!m) return null;
    var month = MONTHS[m[1].toLowerCase()];
    if (month == null) return null;
    var day = Number(m[2]);
    var year = m[3] ? Number(m[3]) : now.getFullYear();
    if (year < 100) year += 2000;
    var d = new Date(year, month, day, 15, 0, 0);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  function parseSlashDate(text, now) {
    var m = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/((?:20)?\d{2}))?\b/);
    if (!m) return null;
    var month = Number(m[1]) - 1;
    var day = Number(m[2]);
    var year = m[3] ? Number(m[3]) : now.getFullYear();
    if (year < 100) year += 2000;
    var d = new Date(year, month, day, 15, 0, 0);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  function parseDue(raw, now) {
    if (!raw) return null;
    now = now || new Date();
    var text = String(raw).trim();
    var lower = text.toLowerCase();
    if (lower === "today") {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0).toISOString();
    }
    if (lower === "tomorrow") {
      var t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 15, 0, 0);
      return t.toISOString();
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) text += "T15:00";
    var iso = new Date(text);
    if (!Number.isNaN(iso.getTime()) && /\d{4}-\d{2}-\d{2}|T/.test(text)) {
      return iso.toISOString();
    }
    return parseNamedMonth(text, now) || parseSlashDate(text, now);
  }

  function parseType(raw) {
    var t = String(raw || "other")
      .trim()
      .toLowerCase();
    if (TYPES[t]) return t;
    if (t === "exam" || t === "midterm" || t === "final" || t === "unit test") return "test";
    if (t === "essay" || t === "dbq" || t === "paper" || t === "lab") return "project";
    if (t === "hw" || t === "workbook" || t === "worksheet") return "homework";
    if (t === "recitation" || t === "reading") return "other";
    return "other";
  }

  function inferType(title) {
    var t = String(title || "").toLowerCase();
    if (/\b(unit test|exam|midterm|final|test)\b/.test(t)) return "test";
    if (/\b(dbq|essay|paper|lab report|project)\b/.test(t)) return "project";
    if (/\bquiz\b/.test(t)) return "quiz";
    if (/\b(hw|homework|workbook|worksheet)\b/.test(t)) return "homework";
    if (/\b(recitation|reading)\b/.test(t)) return "other";
    return "other";
  }

  function parseRow(cells, header, now) {
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
    var due = parseDue(map.due || map.due_date || map.deadline, now);
    if (!title || !due) return null;
    var points = map.points || map.max_points || map.pts;
    var difficulty = map.difficulty || map.diff;
    var type = map.type || map.category;
    return {
      title: title,
      course: (map.course || map.class || "").trim() || null,
      due: due,
      points: points === "" || points == null ? null : Number(points),
      type: type ? parseType(type) : inferType(title),
      difficulty: difficulty === "" || difficulty == null ? null : Number(difficulty),
      status: "upcoming",
    };
  }

  function parseProse(line, now) {
    var pointsMatch = line.match(/(\d+)\s*(?:pts|points|pt)\b/i);
    var dueMatch = line.match(/\b(?:due|by)\s+(.+)$/i);
    if (!dueMatch) return null;
    var due = parseDue(dueMatch[1], now);
    if (!due) return null;
    var head = line.slice(0, dueMatch.index).replace(/[-–—|]+$/g, "").trim();
    var course = null;
    var title = head;
    var courseSplit = head.match(/^([^:,]+)\s*[:\-–—]\s*(.+)$/);
    if (courseSplit) {
      course = courseSplit[1].trim();
      title = courseSplit[2].trim();
    }
    title = title.replace(/\s+\d+\s*(?:pts|points|pt)\b/i, "").trim();
    if (!title) return null;
    return {
      title: title,
      course: course,
      due: due,
      points: pointsMatch ? Number(pointsMatch[1]) : null,
      type: inferType(head),
      difficulty: null,
      status: "upcoming",
    };
  }

  function looksStructured(cells) {
    if (cells.length < 3) return false;
    return Boolean(parseDue(cells[2]) || parseDue(cells[1]));
  }

  function parse(text, now) {
    now = now || new Date();
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
      var cells = splitLine(lines[i]);
      var row = null;
      if (header || looksStructured(cells)) {
        if (!header && cells.length >= 3 && !parseDue(cells[2], now) && parseDue(cells[1], now)) {
          cells = [cells[0], "", cells[1], cells[2], cells[3], cells[4]];
        }
        row = parseRow(cells, header, now);
      }
      if (!row) row = parseProse(lines[i], now);
      if (row) items.push(row);
    }
    return items;
  }

  return {
    parse: parse,
    parseDue: parseDue,
    parseType: parseType,
    inferType: inferType,
    parseProse: parseProse,
  };
});
