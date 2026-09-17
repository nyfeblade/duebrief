import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = (...parts) => join(root, "src", ...parts);

const scripts = ["score.js", "estimate.js", "plan.js", "share.js", "ics.js", "upcoming.js", "app.js"];

function page(opts) {
  const css = readFileSync(src("app.css"), "utf8");
  let html = readFileSync(src("app-shell.html"), "utf8");
  html = html.replace("<!--APP_CSS-->", `<style>\n${css}\n</style>`);
  html = html.replace("<!--DEMO_BANNER-->", opts.banner || "");
  if (opts.inline) {
    const bodies = scripts
      .map((name) => `<script>\n${readFileSync(src(name), "utf8")}\n</script>`)
      .join("\n");
    html = html.replace("<!--APP_JS-->", bodies);
    html = html.replace('href="../"', 'href="#"');
    html = html
      .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com" \/>\n/, "\n")
      .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic.com" crossorigin \/>\n/, "\n")
      .replace(
        /\s*<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=IBM\+Plex\+Sans:wght@400;500&display=swap" rel="stylesheet" \/>\n/,
        "\n"
      );
  } else {
    const tags = scripts.map((name) => `    <script src="${opts.scriptPrefix}${name}"></script>`).join("\n");
    html = html.replace("<!--APP_JS-->", tags);
    html = html.replace("<!--APP_CSS-->", `<link rel="stylesheet" href="${opts.cssHref}" />`);
  }
  return html;
}

function writeLinked(dir, scriptPrefix, cssHref, banner) {
  mkdirSync(join(root, dir), { recursive: true });
  let html = readFileSync(src("app-shell.html"), "utf8");
  html = html.replace("<title>Duebrief — exam-week board</title>", "<title>Duebrief — exam-week board</title>");
  html = html.replace("<!--APP_CSS-->", `<link rel="stylesheet" href="${cssHref}" />`);
  html = html.replace("<!--DEMO_BANNER-->", banner || "");
  html = html.replace(
    "<!--APP_JS-->",
    scripts.map((name) => `    <script src="${scriptPrefix}${name}"></script>`).join("\n")
  );
  writeFileSync(join(root, dir, "index.html"), html);
}

const banner = "";

writeLinked("app", "../src/", "../src/app.css", banner);
writeLinked("try", "../src/", "../src/app.css", banner);

mkdirSync(join(root, "offline"), { recursive: true });
writeFileSync(join(root, "offline", "duebrief.html"), page({ inline: true }));

rmSync(join(root, "dist"), { recursive: true, force: true });
mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "duebrief.html"), page({ inline: true }));

console.log("wrote app/, try/, offline/duebrief.html");
