/**
 * Encode a dump into the URL hash so a classmate can open the same board.
 * No server. Payload is the assignments only.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.DuebriefShare = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function toBytes(str) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(str);
    var out = [];
    for (var i = 0; i < str.length; i++) out.push(str.charCodeAt(i) & 255);
    return out;
  }

  function fromBytes(bytes) {
    if (typeof TextDecoder !== "undefined") return new TextDecoder().decode(bytes);
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }

  function b64urlEncode(str) {
    var bytes = toBytes(str);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    var b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(str, "utf8").toString("base64");
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function b64urlDecode(text) {
    var b64 = String(text).replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    if (typeof atob === "function") {
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return fromBytes(bytes);
    }
    return Buffer.from(b64, "base64").toString("utf8");
  }

  function compact(items) {
    return (items || []).map(function (item) {
      return [
        item.title || "",
        item.course || "",
        item.due || "",
        item.points == null ? "" : item.points,
        item.type || "other",
        item.difficulty == null ? "" : item.difficulty,
        item.status || "upcoming",
      ];
    });
  }

  function expand(rows) {
    if (!Array.isArray(rows)) return [];
    return rows
      .map(function (row) {
        if (!row || !row[0] || !row[2]) return null;
        return {
          title: String(row[0]),
          course: row[1] ? String(row[1]) : null,
          due: String(row[2]),
          points: row[3] === "" || row[3] == null ? null : Number(row[3]),
          type: row[4] || "other",
          difficulty: row[5] === "" || row[5] == null ? null : Number(row[5]),
          status: row[6] || "upcoming",
        };
      })
      .filter(Boolean);
  }

  function encode(items) {
    return "d=" + b64urlEncode(JSON.stringify({ v: 1, i: compact(items) }));
  }

  function decode(hash) {
    var raw = String(hash || "").replace(/^#/, "");
    if (!raw) return null;
    var match = raw.match(/(?:^|&)d=([^&]+)/);
    if (!match) return null;
    try {
      var parsed = JSON.parse(b64urlDecode(match[1]));
      if (!parsed || parsed.v !== 1) return null;
      var items = expand(parsed.i);
      return items.length ? items : null;
    } catch (err) {
      return null;
    }
  }

  return { encode: encode, decode: decode, compact: compact, expand: expand };
});
