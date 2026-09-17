(function () {
  "use strict";

  var MODE = window.DUEBRIEF_MODE === "paid" ? "paid" : "demo";
  var MAX_DEMO = 5;
  var STORAGE_KEY = "duebrief.v1.items";
  var URGENT_HOURS = 48;

  var state = {
    items: [],
    now: new Date(),
  };

  function uid() {
    return "w_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function load() {
    if (MODE !== "paid") return;
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) state.items = parsed;
    } catch (err) {
      state.items = [];
    }
  }

  function save() {
    if (MODE !== "paid") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }

  function activeItems() {
    return state.items.filter(function (item) {
      return item.status !== "submitted";
    });
  }

  function ranked(items) {
    return items
      .map(function (item) {
        return { item: item, math: DuebriefScore.components(item, state.now) };
      })
      .sort(function (a, b) {
        return b.math.total - a.math.total;
      });
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
    if (MODE === "demo") {
      var room = replace ? MAX_DEMO : Math.max(0, MAX_DEMO - activeItems().length);
      next = next.slice(0, room);
    }
    state.items = replace ? next : state.items.concat(next);
    save();
    render();
  }

  function renderList(id, rows, emptyText) {
    var el = document.getElementById(id);
    if (!rows.length) {
      el.innerHTML = '<p class="empty">' + emptyText + "</p>";
      return;
    }
    el.innerHTML =
      '<ul class="list">' +
      rows
        .map(function (row) {
          var item = row.item;
          var math = row.math;
          var cls = item.status === "submitted" ? "done" : math.daysUntilDue <= 0 ? "overdue" : "";
          var course = item.course ? escapeHtml(item.course) + " · " : "";
          return (
            '<li class="' +
            cls +
            '"><div class="score">' +
            math.total.toFixed(0) +
            '</div><div><div class="title">' +
            escapeHtml(item.title) +
            '</div><div class="meta">' +
            course +
            escapeHtml(typeLabel(item.type)) +
            " · " +
            (item.points == null ? "unscored" : item.points + " pts") +
            " · d" +
            (item.difficulty == null ? "3" : item.difficulty) +
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
            '</div></div><div class="row-actions">' +
            (item.status === "submitted"
              ? '<button type="button" data-act="reopen" data-id="' +
                item.id +
                '">Reopen</button>'
              : '<button type="button" data-act="done" data-id="' +
                item.id +
                '">Done</button>') +
            '<button type="button" class="danger" data-act="delete" data-id="' +
            item.id +
            '">Delete</button></div></li>'
          );
        })
        .join("") +
      "</ul>";
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
      var courseBit = next.item.course ? next.item.course + " · " : "";
      nextWhy.textContent =
        courseBit +
        "Score " +
        next.math.total.toFixed(1) +
        " — " +
        fmtWhen(next.item.due) +
        ". Schoology listed a pile. Start this one: a high-point test still beats an overdue paper, because overdue only pins urgency.";
    }

    var overdue = open.filter(function (row) {
      return row.math.daysUntilDue <= 0;
    });
    var soon = open.filter(function (row) {
      return row.math.daysUntilDue > 0 && row.math.daysUntilDue * 24 <= URGENT_HOURS;
    });

    renderList("overdue-list", overdue, "Nothing overdue.");
    renderList("soon-list", soon, "Nothing due in the next 48 hours.");
    renderList("all-list", ranked(state.items), "Paste tonight's Upcoming list.");

    var count = document.getElementById("count");
    count.textContent =
      activeItems().length +
      " open" +
      (MODE === "demo" ? " · demo " + activeItems().length + "/" + MAX_DEMO : "");

    var lock = document.getElementById("demo-lock");
    if (lock) {
      lock.hidden = !(MODE === "demo" && activeItems().length >= MAX_DEMO);
    }
  }

  function addItem(from) {
    var openCount = activeItems().length;
    if (MODE === "demo" && openCount >= MAX_DEMO) {
      return;
    }
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

  function seedDemo() {
    if (state.items.length) return;
    applyIncoming(tuesdayDump(), true);
  }

  function pasteUpcoming(text, replace) {
    if (!window.DuebriefUpcoming) return;
    var rows = DuebriefUpcoming.parse(text);
    if (!rows.length) {
      window.alert("Nothing parsed. Use title,course,due,points,type,difficulty — or pipes.");
      return;
    }
    applyIncoming(rows, replace);
  }

  function exportJson() {
    if (MODE !== "paid") return;
    var blob = new Blob([JSON.stringify({ version: 1, items: state.items }, null, 2)], {
      type: "application/json",
    });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "duebrief.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result);
      if (file.name && file.name.toLowerCase().indexOf(".json") !== -1) {
        if (MODE !== "paid") return;
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

  function printView(kind) {
    if (MODE !== "paid") return;
    document.body.setAttribute("data-print", kind);
    window.print();
    document.body.removeAttribute("data-print");
  }

  function init() {
    load();
    if (MODE === "demo") seedDemo();
    document.getElementById("clock").dateTime = state.now.toISOString();
    document.getElementById("clock").textContent = state.now.toLocaleString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    document.getElementById("mode-label").textContent =
      MODE === "paid" ? "local file · Schoology dump" : "Tuesday dump · 5-item try-out";
    document.getElementById("add-form").addEventListener("submit", function (event) {
      event.preventDefault();
      addItem(event.target);
    });
    document.getElementById("lists").addEventListener("click", onListClick);

    var pasteForm = document.getElementById("paste-form");
    if (pasteForm) {
      pasteForm.addEventListener("submit", function (event) {
        event.preventDefault();
        pasteUpcoming(event.target.paste.value, true);
      });
    }

    var exportBtn = document.getElementById("export");
    var importInput = document.getElementById("import");
    var printToday = document.getElementById("print-today");
    var printWeek = document.getElementById("print-week");
    if (MODE === "paid") {
      exportBtn.addEventListener("click", exportJson);
      importInput.addEventListener("change", function (event) {
        importFile(event.target.files[0]);
        event.target.value = "";
      });
      printToday.addEventListener("click", function () {
        printView("today");
      });
      printWeek.addEventListener("click", function () {
        printView("week");
      });
    } else {
      ["export", "print-today", "print-week"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.hidden = true;
      });
      if (importInput) {
        importInput.accept = ".csv,text/csv,text/plain";
        importInput.addEventListener("change", function (event) {
          importFile(event.target.files[0]);
          event.target.value = "";
        });
      }
    }
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
