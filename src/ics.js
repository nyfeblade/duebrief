/**
 * Build a .ics so the ranked dump can land on a phone calendar.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./estimate.js"));
  } else {
    root.DuebriefIcs = factory(root.DuebriefEstimate);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (Estimate) {
  "use strict";

  function stamp(date) {
    var d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  }

  function escapeText(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function calendar(items, now) {
    now = now || new Date();
    var lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Duebrief//Exam week//EN",
      "CALSCALE:GREGORIAN",
    ];
    (items || []).forEach(function (item, index) {
      if (!item || item.status === "submitted") return;
      var end = stamp(item.due);
      if (!end) return;
      var mins = Estimate.minutes(item);
      var startDate = new Date(new Date(item.due).getTime() - mins * 60000);
      var start = stamp(startDate);
      var title = (item.course ? item.course + ": " : "") + item.title;
      lines.push("BEGIN:VEVENT");
      lines.push("UID:duebrief-" + index + "-" + end + "@duebrief");
      lines.push("DTSTAMP:" + stamp(now));
      lines.push("DTSTART:" + start);
      lines.push("DTEND:" + end);
      lines.push("SUMMARY:" + escapeText(title));
      lines.push(
        "DESCRIPTION:" +
          escapeText(
            (item.points == null ? "unscored" : item.points + " pts") +
              " · " +
              (item.type || "other") +
              " · ~" +
              mins +
              "m"
          )
      );
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  return { calendar: calendar, stamp: stamp };
});
