import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = (...parts) => join(root, "src", ...parts);

function shell(mode) {
  const css = readFileSync(src("app.css"), "utf8");
  const score = readFileSync(src("score.js"), "utf8");
  const upcoming = readFileSync(src("upcoming.js"), "utf8");
  const app = readFileSync(src("app.js"), "utf8");
  let html = readFileSync(src("app-shell.html"), "utf8");
  const banner =
    mode === "demo"
      ? `<p class="banner">A real Schoology Tuesday: test, overdue DBQ, homework, quiz, recitation. Nothing is saved. <a href="../index.html">Buy the $14 file</a> to import your own Upcoming dump, save, and print tonight.</p>`
      : "";
  html = html.replace("<!--APP_CSS-->", `<style>\n${css}\n</style>`);
  html = html.replace("<!--DEMO_BANNER-->", banner);
  html = html.replace(
    "<!--APP_JS-->",
    `<script>window.DUEBRIEF_MODE = ${JSON.stringify(mode)};</script>\n<script>\n${score}\n</script>\n<script>\n${upcoming}\n</script>\n<script>\n${app}\n</script>`
  );
  if (mode === "demo") {
    html = html.replace("<title>Duebrief</title>", "<title>Duebrief — try-out</title>");
  } else {
    html = html
      .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com" \/>\n/, "\n")
      .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic.com" crossorigin \/>\n/, "\n")
      .replace(
        /\s*<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=IBM\+Plex\+Sans:wght@400;500&display=swap" rel="stylesheet" \/>\n/,
        "\n"
      );
  }
  return html;
}

mkdirSync(join(root, "try"), { recursive: true });
const tryPage = readFileSync(src("app-shell.html"), "utf8")
  .replace("<title>Duebrief</title>", "<title>Duebrief — try-out</title>")
  .replace(
    "<!--APP_CSS-->",
    '<link rel="stylesheet" href="../src/app.css" />'
  )
  .replace(
    "<!--DEMO_BANNER-->",
    `<p class="banner">A real Schoology Tuesday: test, overdue DBQ, homework, quiz, recitation. Nothing is saved. <a href="../index.html">Buy the $14 file</a> to import your own Upcoming dump, save, and print tonight.</p>`
  )
  .replace(
    "<!--APP_JS-->",
    `<script>window.DUEBRIEF_MODE = "demo";</script>\n    <script src="../src/score.js"></script>\n    <script src="../src/upcoming.js"></script>\n    <script src="../src/app.js"></script>`
  );
writeFileSync(join(root, "try", "index.html"), tryPage);

const dist = join(root, "dist", "duebrief");
rmSync(join(root, "dist"), { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, "duebrief.html"), shell("paid"));
writeFileSync(
  join(dist, "README.txt"),
  `Duebrief
Schoology is a list. This is the order.

Open duebrief.html. Double-click is fine. Nothing leaves this computer.

Paste tonight's Upcoming dump (see SCHOOLOGY.txt) or import schoology-tuesday.csv.
The big title is what to start. Mark Done when it is done. Print tonight.

Not a Schoology add-on. You type or paste the assignments. No login, no API.

Personal-use license: one person. Do not resell the file.

Support: hornsons21@gmail.com
`
);
writeFileSync(
  join(dist, "SCHOOLOGY.txt"),
  `60 seconds from Schoology into Duebrief
=======================================

Schoology will not email you a clean file. You already have the list.

1. Open Schoology → Upcoming (or Grades).
2. For each assignment you might actually do tonight / this week, copy
   title, course, due date, and points.
3. Paste into Duebrief as:

   title,course,due,points,type,difficulty
   Unit 3 test,Physics,2026-09-18,100,test,5
   DBQ: Reconstruction,History,2026-09-16T08:00,50,project,4

   Pipes work too: Unit 3 test | Physics | 2026-09-18 | 100 | test | 5

4. due can be YYYY-MM-DD (treated as 3pm) or a full datetime.
5. type: test, project, quiz, homework, other
   (exam → test, dbq/essay/paper → project, hw → homework)
6. Import CSV does the same thing from a file.
7. Print tonight. Tape it above the desk.

This product is not affiliated with Schoology.
`
);
writeFileSync(
  join(dist, "schoology-tuesday.csv"),
  `title,course,due,points,type,difficulty
Unit 3 test,Physics,2026-09-18,100,test,5
DBQ: Reconstruction,History,2026-09-16T08:00,50,project,4
4.2 workbook,Spanish,2026-09-17T23:59,10,homework,2
Mole quiz,Chem,2026-09-19,25,quiz,3
"Recitation, Book II",Omnibus,2026-09-21,20,other,3
`
);
writeFileSync(
  join(dist, "HOW-IT-SCORES.txt"),
  `How Duebrief ranks work
=======================

Score = urgency (40) + points (25) + type (20) + difficulty (15)

Urgency
  1.0 at the due date, 0.0 at 14 days out, squared so far-off work stays quiet
  and the last few days ramp hard.   Already late is pinned at 1.25 — that is the urgency cap, not
  a free pass. A 100-point test tomorrow can still beat a 50-point
  overdue paper. That is the point of the Tuesday dump.

Points
  points / 100, clamped to 0..1. Blank points count as 20, not 0, so
  unscored work does not sink.

Type
  test 1.00 · project 0.85 · quiz 0.65 · homework 0.40 · other 0.30

Difficulty
  what you said, 1..5, mapped onto 0..1. Blank counts as 3.

Submitted work always scores 0 and drops out of Next / Overdue / 48h.

This is the same model as Luke Horn's personal scheduler. It is an opinion,
not a law. If a ranking feels wrong, the list is usually missing points,
type, or an honest difficulty.
`
);
writeFileSync(
  join(dist, "LICENSE.txt"),
  `Duebrief personal-use license

You may use this copy for your own school or personal work.

You may not sell it, republish it, or bundle it in a competing product.

The ranking model is provided as-is. It will not do your homework.
`
);

const zipPath = join(root, "dist", "duebrief-v1.zip");
execFileSync("zip", ["-q", "-r", zipPath, "duebrief"], { cwd: join(root, "dist") });
console.log("wrote", zipPath);
