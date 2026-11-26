// Tiny static generator: _src/pages/*.html (body fragments) + shared layout -> plain HTML in website/.
// Run: node website/scripts/build.mjs (static output is committed; catalog runs separately).
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, pageJsonLd, faqJsonLd, SITE } from "../_src/layout.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// The mobile and website recovery flows use the same security controller.
writeFileSync(join(root, "assets/js/recovery-flow.js"), readFileSync(join(root, "../mobile-app/src/features/auth/recoveryFlow.js")));
// Share the strict content-link codec with the mobile app; the landing page makes no backend requests.
writeFileSync(join(root, "assets/js/question-paper-links.js"), readFileSync(join(root, "../mobile-app/src/features/question-papers/questionPaperLinks.js")));

const pages = [];
for (const f of readdirSync(join(root, "_src/pages")).filter((x) => x.endsWith(".html"))) {
  const src = readFileSync(join(root, "_src/pages", f), "utf8");
  const mm = src.match(/^<!--META\s*([\s\S]*?)-->\s*/);
  if (!mm) throw new Error(`${f}: missing <!--META {...}--> header`);
  const m = JSON.parse(mm[1]);
  m.file = f.replace(/\.html$/, "");
  const body = src.slice(mm[0].length);
  if (!m.noindex) {
    m.jsonld = [pageJsonLd(m)];
    if (m.file === "faq") m.jsonld.push(faqJsonLd());
  }
  writeFileSync(join(root, m.file + ".html"), render(m, body));
  pages.push(m);
}

const urls = pages.filter((p) => !p.noindex && p.file !== "404");
// Omit optional lastmod: a build date does not establish a significant content change.
writeFileSync(join(root, "_src/static-sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((p) => `  <url><loc>${SITE}${p.path === "/" ? "/" : p.path}</loc></url>`).join("\n")}\n</urlset>\n`);
console.log(`built ${pages.length} pages, ${urls.length} in sitemap`);

writeFileSync(join(root, "_src/static-sitemap.json"), JSON.stringify(urls.map(p => p.path), null, 2) + "\n");
