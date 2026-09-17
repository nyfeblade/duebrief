import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = (...parts) => join(root, "src", ...parts);

function shell(mode) {
  const css = readFileSync(src("app.css"), "utf8");
  const score = readFileSync(src("score.js"), "utf8");
  const app = readFileSync(src("app.js"), "utf8");
  let html = readFileSync(src("app-shell.html"), "utf8");
  const banner =
    mode === "demo"
      ? `<p class="banner">5-item try-out. Nothing is saved. <a href="../index.html">Buy the $14 file</a> for unlimited items, local save, export, and print.</p>`
      : "";
  html = html.replace("<!--APP_CSS-->", `<style>\n${css}\n</style>`);
  html = html.replace("<!--DEMO_BANNER-->", banner);
  html = html.replace(
    "<!--APP_JS-->",
    `<script>window.DUEBRIEF_MODE = ${JSON.stringify(mode)};</script>\n<script>\n${score}\n</script>\n<script>\n${app}\n</script>`
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
    `<p class="banner">5-item try-out. Nothing is saved. <a href="../index.html">Buy the $14 file</a> for unlimited items, local save, export, and print.</p>`
  )
  .replace(
    "<!--APP_JS-->",
    `<script>window.DUEBRIEF_MODE = "demo";</script>\n    <script src="../src/score.js"></script>\n    <script src="../src/app.js"></script>`
  );
writeFileSync(join(root, "try", "index.html"), tryPage);

const dist = join(root, "dist", "duebrief");
rmSync(join(root, "dist"), { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, "duebrief.html"), shell("paid"));
writeFileSync(
  join(dist, "README.txt"),
  `Duebrief
Tonight's work, ranked.

Open duebrief.html in any browser. Double-click is fine. Nothing leaves this computer.

Add the work you actually have. The big title is the next thing. Overdue floats to the top. Mark something Done when it is done.

Print today / Print week use the browser print dialog — save as PDF if you want a file.

Export JSON is your backup. Import replaces the current list.

Personal-use license: one person. Do not resell or republish the file.

Support: hornsons21@gmail.com
`
);
writeFileSync(
  join(dist, "HOW-IT-SCORES.txt"),
  `How Duebrief ranks work
=======================

Score = urgency (40) + points (25) + type (20) + difficulty (15)

Urgency
  1.0 at the due date, 0.0 at 14 days out, squared so far-off work stays quiet
  and the last few days ramp hard. Already late is pinned at 1.25 so it
  outranks everything still upcoming.

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
