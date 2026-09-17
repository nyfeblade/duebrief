(function () {
  "use strict";

  var STORAGE_KEY = "duebrief.v2.items";
  var WEIGHTS_KEY = "duebrief.v2.weights";
  var HOURS_KEY = "duebrief.v2.hours";
  var URGENT_HOURS = 48;

  var state = {
    items: [],
    now: new Date(),
    hours: 3,
    focus: { running: false, endsAt: 0, itemId: null, timer: null },
  };

  function uid() {
    return "w_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function loadWeights() {
    try {
      var raw = localStorage.getItem(WEIGHTS_KEY);
      if (!raw) return;
      DuebriefScore.configure(JSON.parse(raw));
    } catch (err) {
      DuebriefScore.configure(null);
    }
  }

  function load() {
    try {
      var hours = Number(localStorage.getItem(HOURS_KEY));
      if (hours > 0) state.hours = hours;
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) state.items = parsed;
    } catch (err) {
      state.items = [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    localStorage.setItem(HOURS_KEY, String(state.hours));
  }

  function activeItems() {
    return state.items.filter(function (item) {
      return item.status !== "submitted";
    });
  }

  function ranked(items) {
    return DuebriefPlan.withMath(items, state.now);
  }

  function fmtWhen(iso) {
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "no due date";
    var days = (d.getTime() - state.now.getTime()) / 86400000;
    var dateBit = d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    if (days <= 0) return "overdue · " + dateBit;
    if (days < 1) return "due in " + Math.max(1, Math.round(days * 24)) + "h · " + dateBit;
    if (days < 2) return "due tomorrow · " + dateBit;
    return "due in " + Math.round(days) + "d · " + dateBit;
  }

  function typeLabel(type) {
    return type || "other";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function attachIds(rows) {
    return rows.map(function (row) {
      var copy = {};
      Object.keys(row).forEach(function (key) {
        copy[key] = row[key];
      });
      copy.id = uid();
      copy.status = copy.status || "upcoming";
      return copy;
    });
  }

  function applyIncoming(rows, replace) {
    var next = attachIds(rows);
    state.items = replace ? next : state.items.concat(next);
    save();
    render();
  }

  function rowHtml(row, badge) {
    var item = row.item;
    var math = row.math;
    var cls = item.status === "submitted" ? "done" : math.daysUntilDue <= 0 ? "overdue" : "";
    var course = item.course ? escapeHtml(item.course) + " · " : "";
    var scoreBit =
      badge != null
        ? '<div class="score">' + badge + '<div class="pack-tag">do</div></div>'
        : '<div class="score">' + math.total.toFixed(0) + "</div>";
    return (
      '<li class="' +
      cls +
      '">' +
      scoreBit +
      '<div><div class="title">' +
      escapeHtml(item.title) +
      '</div><div class="meta">' +
      course +
      escapeHtml(typeLabel(item.type)) +
      " · " +
      (item.points == null ? "unscored" : item.points + " pts") +
      " · ~" +
      DuebriefEstimate.label(row.minutes) +
      " · " +
      escapeHtml(fmtWhen(item.due)) +
      '</div><div class="breakdown">urgency ' +
      math.urgency +
      " · points " +
      math.points +
      " · type " +
      math.type +
      " · difficulty " +
      math.difficulty +
      "</div></div><div class=\"row-actions\">" +
      (item.status === "submitted"
        ? '<button type="button" data-act="reopen" data-id="' + item.id + '">Reopen</button>'
        : '<button type="button" data-act="done" data-id="' + item.id + '">Done</button>') +
      '<button type="button" class="danger" data-act="delete" data-id="' +
      item.id +
      '">Delete</button></div></li>'
    );
  }

  function renderList(id, rows, emptyText) {
    var el = document.getElementById(id);
    if (!rows.length) {
      el.innerHTML = '<p class="empty">' + emptyText + "</p>";
      return;
    }
    el.innerHTML = '<ul class="list">' + rows.map(rowHtml).join("") + "</ul>";
  }

  function whyNext(next) {
    var courseBit = next.item.course ? next.item.course + " · " : "";
    var packed = DuebriefPlan.tonight(state.items, state.now, state.hours);
    var firstFit = packed.packed[0] && packed.packed[0].item.id === next.item.id;
    return (
      courseBit +
      "Score " +
      next.math.total.toFixed(1) +
      " · ~" +
      DuebriefEstimate.label(next.minutes) +
      " · " +
      fmtWhen(next.item.due) +
      ". " +
      (firstFit
        ? "This is also the first block in tonight's pack."
        : "A high-point test still beats an overdue paper — overdue only pins urgency.")
    );
  }

  function renderStakes() {
    var s = DuebriefPlan.stakes(state.items, state.now);
    document.getElementById("stakes").innerHTML =
      '<div><strong>' +
      s.overduePoints +
      '</strong><span>pts overdue</span></div><div><strong>' +
      s.points48h +
      '</strong><span>pts in 48h</span></div><div><strong>' +
      s.points7d +
      '</strong><span>pts this week</span></div><div><strong>' +
      s.openCount +
      '</strong><span>open items</span></div>';
  }

  function renderTonight() {
    var pack = DuebriefPlan.tonight(state.items, state.now, state.hours);
    document.getElementById("hours-label").textContent = state.hours + "h";
    var why = document.getElementById("tonight-why");
    if (!pack.packed.length) {
      why.textContent = "Paste Upcoming and set how many hours you actually have.";
    } else if (pack.leftover.length) {
      why.textContent =
        DuebriefEstimate.label(pack.used) +
        " of work in " +
        pack.hours +
        "h. " +
        pack.leftover.length +
        " items miss the cut" +
        (pack.leftoverPoints48h ? " — " + pack.leftoverPoints48h + " pts still land in 48h." : ".");
    } else {
      why.textContent = "Everything open fits in " + pack.hours + "h (" + DuebriefEstimate.label(pack.used) + ").";
    }
    var html = "";
    if (pack.packed.length) {
      html +=
        '<ul class="list">' +
        pack.packed
          .map(function (row, index) {
            return rowHtml(row, index + 1);
          })
          .join("") +
        "</ul>";
    }
    if (pack.leftover.length) {
      html += '<p class="leftover">Does not fit tonight</p><ul class="list">' + pack.leftover.map(rowHtml).join("") + "</ul>";
    }
    document.getElementById("tonight-list").innerHTML = html || '<p class="empty">Nothing to pack.</p>';
  }

  function renderWeek() {
    var days = DuebriefPlan.weekMap(state.items, state.now);
    document.getElementById("week").innerHTML = days
      .map(function (day) {
        return (
          '<div class="day ' +
          day.heat +
          '"><div class="when">' +
          escapeHtml(day.label) +
          '</div><div class="load">' +
          DuebriefEstimate.label(day.minutes) +
          '</div><div class="meta">' +
          day.points +
          " pts · " +
          day.count +
          "</div></div>"
        );
      })
      .join("");
  }

  function renderCourses() {
    var courses = DuebriefPlan.courseLoad(state.items, state.now);
    var max = courses.reduce(function (n, row) {
      return Math.max(n, row.minutes);
    }, 1);
    document.getElementById("courses").innerHTML = courses.length
      ? courses
          .map(function (row) {
            return (
              '<div class="course"><span>' +
              escapeHtml(row.course) +
              '</span><div class="bar"><i style="width:' +
              Math.round((row.minutes / max) * 100) +
              '%"></i></div><span>' +
              row.points +
              " pts · " +
              DuebriefEstimate.label(row.minutes) +
              "</span></div>"
            );
          })
          .join("")
      : '<p class="empty">No courses yet.</p>';
  }

  function render() {
    var open = ranked(activeItems());
    var next = open[0];
    var nextTitle = document.getElementById("next-title");
    var nextWhy = document.getElementById("next-why");
    if (!next) {
      nextTitle.textContent = "Nothing in Upcoming.";
      nextWhy.textContent =
        "Paste the Schoology dump or add the assignments that are actually due. The ranking is only as honest as the list.";
    } else {
      nextTitle.textContent = next.item.title;
      nextWhy.textContent = whyNext(next);
    }

    renderStakes();
    renderTonight();
    renderWeek();
    renderCourses();

    renderList(
      "overdue-list",
      open.filter(function (row) {
        return row.math.daysUntilDue <= 0;
      }),
      "Nothing overdue."
    );
    renderList(
      "soon-list",
      open.filter(function (row) {
        return row.math.daysUntilDue > 0 && row.math.daysUntilDue * 24 <= URGENT_HOURS;
      }),
      "Nothing due in the next 48 hours."
    );
    renderList("all-list", ranked(state.items), "Paste tonight's Upcoming list.");

    document.getElementById("count").textContent = activeItems().length + " open";
    document.getElementById("hours").value = String(state.hours);
    tickFocus();
  }

  function addItem(from) {
    var title = from.title.value.trim();
    if (!title) return;
    var dueValue = from.due.value;
    if (!dueValue) return;
    var due = new Date(dueValue);
    if (Number.isNaN(due.getTime())) return;
    var pointsRaw = from.points.value;
    state.items.push({
      id: uid(),
      title: title,
      course: from.course.value.trim() || null,
      due: due.toISOString(),
      points: pointsRaw === "" ? null : Number(pointsRaw),
      type: from.type.value,
      difficulty: Number(from.difficulty.value),
      status: "upcoming",
    });
    from.reset();
    from.difficulty.value = "3";
    save();
    render();
  }

  function onListClick(event) {
    var btn = event.target.closest("button[data-act]");
    if (!btn) return;
    var id = btn.getAttribute("data-id");
    var item = state.items.find(function (row) {
      return row.id === id;
    });
    if (!item) return;
    var act = btn.getAttribute("data-act");
    if (act === "done") item.status = "submitted";
    else if (act === "reopen") item.status = "upcoming";
    else if (act === "delete") {
      state.items = state.items.filter(function (row) {
        return row.id !== id;
      });
    }
    save();
    render();
  }

  function tuesdayDump() {
    var now = state.now.getTime();
    return [
      {
        title: "Unit 3 test",
        course: "Physics",
        due: new Date(now + 26 * 3600000).toISOString(),
        points: 100,
        type: "test",
        difficulty: 5,
        status: "upcoming",
      },
      {
        title: "DBQ: Reconstruction",
        course: "History",
        due: new Date(now - 20 * 3600000).toISOString(),
        points: 50,
        type: "project",
        difficulty: 4,
        status: "upcoming",
      },
      {
        title: "4.2 workbook",
        course: "Spanish",
        due: new Date(now + 8 * 3600000).toISOString(),
        points: 10,
        type: "homework",
        difficulty: 2,
        status: "upcoming",
      },
      {
        title: "Mole quiz",
        course: "Chem",
        due: new Date(now + 52 * 3600000).toISOString(),
        points: 25,
        type: "quiz",
        difficulty: 3,
        status: "upcoming",
      },
      {
        title: "Recitation, Book II",
        course: "Omnibus",
        due: new Date(now + 96 * 3600000).toISOString(),
        points: 20,
        type: "other",
        difficulty: 3,
        status: "upcoming",
      },
    ];
  }

  function pasteUpcoming(text, replace) {
    var rows = DuebriefUpcoming.parse(text, state.now);
    if (!rows.length) {
      window.alert("Nothing parsed. Try CSV, pipes, tabs, or \u201cPhysics: Unit 3 test 100 pts due Sep 18\u201d.");
      return;
    }
    applyIncoming(rows, replace);
  }

  function downloadBlob(name, type, text) {
    var blob = new Blob([text], { type: type });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportJson() {
    downloadBlob("duebrief.json", "application/json", JSON.stringify({ version: 2, items: state.items }, null, 2));
  }

  function exportIcs() {
    downloadBlob("duebrief.ics", "text/calendar", DuebriefIcs.calendar(state.items, state.now));
  }

  function importFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result);
      if (file.name && file.name.toLowerCase().indexOf(".json") !== -1) {
        try {
          var parsed = JSON.parse(text);
          var items = Array.isArray(parsed) ? parsed : parsed.items;
          if (!Array.isArray(items)) return;
          applyIncoming(
            items.filter(function (item) {
              return item && item.title && item.due;
            }),
            true
          );
        } catch (err) {
          window.alert("That file is not a Duebrief export.");
        }
        return;
      }
      pasteUpcoming(text, true);
    };
    reader.readAsText(file);
  }

  function printView() {
    window.print();
  }

  function status(msg) {
    var el = document.getElementById("share-status");
    el.hidden = !msg;
    el.textContent = msg || "";
  }

  function copyShare() {
    var hash = DuebriefShare.encode(state.items);
    var url = location.href.split("#")[0] + "#" + hash;
    location.hash = hash;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        function () {
          status("Share link copied. Anyone with it sees this dump — nothing is uploaded.");
        },
        function () {
          status(url);
        }
      );
    } else {
      status(url);
    }
  }

  function startFocus() {
    var next = ranked(activeItems())[0];
    if (!next) return;
    state.focus.running = true;
    state.focus.itemId = next.item.id;
    state.focus.endsAt = Date.now() + next.minutes * 60000;
    document.getElementById("focus-start").hidden = true;
    document.getElementById("focus-stop").hidden = false;
    document.getElementById("focus-clock").hidden = false;
    if (state.focus.timer) clearInterval(state.focus.timer);
    state.focus.timer = setInterval(tickFocus, 500);
    tickFocus();
  }

  function stopFocus() {
    state.focus.running = false;
    state.focus.itemId = null;
    if (state.focus.timer) clearInterval(state.focus.timer);
    document.getElementById("focus-start").hidden = false;
    document.getElementById("focus-stop").hidden = true;
    document.getElementById("focus-clock").hidden = true;
  }

  function tickFocus() {
    if (!state.focus.running) return;
    var left = Math.max(0, state.focus.endsAt - Date.now());
    var mins = Math.floor(left / 60000);
    var secs = Math.floor((left % 60000) / 1000);
    document.getElementById("focus-clock").textContent = mins + ":" + String(secs).padStart(2, "0");
    if (left <= 0) stopFocus();
  }

  function applyWeights(from) {
    var next = {
      urgency: Number(from.urgency.value),
      points: Number(from.points.value),
      type: Number(from.type.value),
      difficulty: Number(from.difficulty.value),
    };
    DuebriefScore.configure(next);
    localStorage.setItem(WEIGHTS_KEY, JSON.stringify(next));
    render();
  }

  function fillWeightForm() {
    var form = document.getElementById("weights-form");
    if (!form) return;
    var w = DuebriefScore.weights();
    form.urgency.value = w.urgency;
    form.points.value = w.points;
    form.type.value = w.type;
    form.difficulty.value = w.difficulty;
  }

  function init() {
    loadWeights();
    var shared = DuebriefShare.decode(location.hash);
    if (shared) {
      state.items = attachIds(shared);
      save();
    } else {
      load();
      if (!state.items.length) {
        state.items = attachIds(tuesdayDump());
        save();
      }
    }
    fillWeightForm();
    document.getElementById("clock").dateTime = state.now.toISOString();
    document.getElementById("clock").textContent = state.now.toLocaleString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    document.getElementById("add-form").addEventListener("submit", function (event) {
      event.preventDefault();
      addItem(event.target);
    });
    document.getElementById("lists").addEventListener("click", onListClick);
    document.getElementById("tonight-list").addEventListener("click", onListClick);
    document.getElementById("paste-form").addEventListener("submit", function (event) {
      event.preventDefault();
      pasteUpcoming(event.target.paste.value, true);
    });
    document.getElementById("hours").addEventListener("input", function (event) {
      state.hours = Number(event.target.value);
      save();
      renderTonight();
      document.getElementById("hours-label").textContent = state.hours + "h";
    });
    document.getElementById("export").addEventListener("click", exportJson);
    document.getElementById("export-ics").addEventListener("click", exportIcs);
    document.getElementById("share").addEventListener("click", copyShare);
    document.getElementById("print-today").addEventListener("click", printView);
    document.getElementById("print-week").addEventListener("click", printView);
    document.getElementById("load-tuesday").addEventListener("click", function () {
      applyIncoming(tuesdayDump(), true);
    });
    document.getElementById("import").addEventListener("change", function (event) {
      importFile(event.target.files[0]);
      event.target.value = "";
    });
    document.getElementById("focus-start").addEventListener("click", startFocus);
    document.getElementById("focus-stop").addEventListener("click", stopFocus);
    document.getElementById("weights-form").addEventListener("submit", function (event) {
      event.preventDefault();
      applyWeights(event.target);
    });
    document.addEventListener("keydown", function (event) {
      if (event.target.matches("input, textarea, select")) return;
      if (event.key === "n") {
        var next = ranked(activeItems())[0];
        if (!next) return;
        next.item.status = "submitted";
        save();
        render();
      }
      if (event.key === "/") {
        event.preventDefault();
        document.querySelector("textarea[name=paste]").focus();
      }
    });
    if (location.protocol === "file:") {
      var offline = document.getElementById("offline-link");
      if (offline) offline.hidden = true;
    }
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
