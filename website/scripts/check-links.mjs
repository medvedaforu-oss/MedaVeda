// Crawls the built HTML in website/ and checks: internal links/assets/anchors resolve (using Vercel cleanUrls
// semantics), tags are balanced, every page has title/description/canonical/h1, images have alt.
// Run: node scripts/check-links.mjs
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = readdirSync(root).filter((f) => f.endsWith(".html"));
const VOID = new Set(["meta", "link", "img", "br", "hr", "input", "source", "path", "circle", "rect", "area", "base", "col", "embed", "track", "wbr"]);
let errors = 0;
const err = (f, m) => { errors++; console.error(`✗ ${f}: ${m}`); };

const resolve = (p) => {
  if (p === "/question-papers") return "dynamic-catalog";
  if (p === "/" ) return "index.html";
  const clean = p.replace(/^\//, "");
  for (const c of [clean, clean + ".html"]) {
    if (existsSync(join(root, c)) && statSync(join(root, c)).isFile()) return c;
  }
  return null;
};
const idsOf = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const cache = Object.fromEntries(files.map((f) => [f, readFileSync(join(root, f), "utf8")]));
const styleVersion = createHash('sha256').update(readFileSync(join(root, 'assets/css/site.css'))).digest('hex').slice(0, 12);

for (const f of files) {
  const html = cache[f];
  if (!html.includes(`href="/assets/css/site.css?v=${styleVersion}"`)) err(f, "stylesheet revision does not match the current CSS; rebuild static pages");
  for (const [svg] of html.matchAll(/<svg\b[^>]*>/g)) if (!/\bwidth="\d+"/.test(svg) || !/\bheight="\d+"/.test(svg)) err(f, "SVG lacks intrinsic dimensions");
  if (!/<title>[^<]{3,}<\/title>/.test(html)) err(f, "missing title");
  if (!/<meta name="description" content="[^"]{20,}"/.test(html)) err(f, "missing meta description");
  if (!/<link rel="canonical"/.test(html)) err(f, "missing canonical");
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  // auth pages hold one h1 per UI state (only one is visible at a time)
  if (/name="robots" content="noindex/.test(html) ? h1s < 1 : h1s !== 1) err(f, `unexpected h1 count (${h1s})`);
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt=/.test(m[0])) err(f, `img without alt: ${m[0].slice(0, 60)}`);
  if (/\{\{[A-Za-z_:]+\}\}/.test(html.replace(/<mark class="ph">[^<]*<\/mark>/g, ""))) err(f, "unresolved template token");

  // tag balance (ignores script/style bodies, comments)
  const stripped = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style)\b[\s\S]*?<\/\1>/g, "<$1></$1>");
  const stack = [];
  for (const m of stripped.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g)) {
    const [, close, tag0, self] = m; const tag = tag0.toLowerCase();
    if (VOID.has(tag) || self) continue;
    if (!close) stack.push(tag);
    else { const top = stack.pop(); if (top !== tag) { err(f, `mismatched </${tag}> (open: ${top})`); break; } }
  }
  if (stack.length) err(f, `unclosed tags: ${stack.join(",")}`);

  const ids = idsOf(html);
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|tel:|medveda:|data:|#$)/.test(u)) continue;
    if (u === "#") continue;
    if (u.startsWith("#")) { if (!ids.has(u.slice(1))) err(f, `missing anchor ${u}`); continue; }
    const [path, hash] = u.split("#");
    const target = resolve(path.split("?")[0]);
    if (!target) { err(f, `broken link ${u}`); continue; }
    if (hash && target.endsWith(".html") && !idsOf(cache[target] ?? readFileSync(join(root, target), "utf8")).has(hash)) err(f, `missing anchor ${u}`);
  }
}
for (const p of ["robots.txt", "_src/static-sitemap.xml", "site.webmanifest"]) if (!existsSync(join(root, p))) err(p, "missing");
// SEO contracts for the generated production artifact, without runtime dependencies.
const SITE = "https://www.medveda.in";
const PLAY = "https://play.google.com/store/apps/details?id=in.medveda.app";
const titles = new Set(), descriptions = new Set(), indexable = new Set();
let installationLinks = 0;
const attribute = (html, tag, key, value, attr = "content") => {
  const element = [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "g"))]
    .map((m) => m[0]).find((s) => s.includes(`${key}="${value}"`));
  return element?.match(new RegExp(`${attr}="([^"<>]*)"`))?.[1];
};
for (const f of files) {
  const html = cache[f];
  const path = f === "index.html" ? "/" : "/" + f.replace(/\.html$/, "");
  const canonical = SITE + path;
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = attribute(html, "meta", "name", "description");
  for (const [value, seen, label] of [[title, titles, "title"], [description, descriptions, "description"]]) {
    if (!value || seen.has(value)) err(f, `missing or duplicate ${label}`);
    seen.add(value);
  }
  if (attribute(html, "link", "rel", "canonical", "href") !== canonical) err(f, "incorrect canonical URL");
  if (attribute(html, "meta", "property", "og:url") !== canonical) err(f, "incorrect Open Graph URL");
  for (const [key, expected] of [["og:title", title], ["og:description", description], ["og:site_name", "MedVeda"]]) {
    if (attribute(html, "meta", "property", key) !== expected) err(f, `incorrect ${key}`);
  }
  for (const [key, expected] of [["twitter:title", title], ["twitter:description", description]]) {
    if (attribute(html, "meta", "name", key) !== expected) err(f, `incorrect ${key}`);
  }
  for (const [key, attr] of [["og:image", "property"], ["twitter:image", "name"]]) {
    const url = attribute(html, "meta", attr, key);
    if (!url?.startsWith(SITE + "/assets/") || !resolve(url.slice(SITE.length))) err(f, `invalid ${key} asset`);
  }
  if (!attribute(html, "meta", "property", "og:image:alt") || !attribute(html, "meta", "name", "twitter:image:alt")) err(f, "missing social image description");
  const noindex = /name="robots" content="noindex/.test(html);
  if (noindex !== ["404.html", "account-verified.html", "reset-password.html", "question-paper.html", "note.html", "quiz.html"].includes(f)) err(f, "unexpected indexing directive");
  if (!noindex) indexable.add(canonical);
  const main = html.match(/<main id="main">([\s\S]*?)<\/main>/)?.[1] ?? "";
  if (!noindex) {
    let previous = 0;
    for (const [, level] of main.matchAll(/<h([1-6])\b/g)) {
      if (Number(level) > previous + 1) err(f, `skipped heading level H${previous} to H${level}`);
      previous = Number(level);
    }
  }
  const header = html.match(/<nav class="nav"[\s\S]*?<\/nav>/)?.[0] ?? "";
  if (!header.includes(`class="btn accent" href="${PLAY}"`)) err(f, "header installation destination is not official Google Play");
  if (!html.includes('href="/download">Download information</a>')) err(f, "missing internal download information link");
  for (const [, anchor] of html.matchAll(/(<a\b[^>]*>[\s\S]*?<\/a>)/g)) {
    if (/class="(?:play-badge|btn accent)/.test(anchor)) {
      installationLinks++;
      if (!anchor.includes(`href="${PLAY}"`)) err(f, "incorrect installation URL");
      if (!anchor.includes('aria-label="')) err(f, "installation link has no descriptive accessible name");
    }
    if (/\.apk(?:["?#])|play\.google\.com\/store\/apps\/details/.test(anchor) && !anchor.includes(`href="${PLAY}"`)) err(f, "obsolete or incorrect Android download destination");
  }
  let nodes = [];
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const ld = JSON.parse(json);
      if (ld["@context"] !== "https://schema.org") err(f, "incorrect JSON-LD context");
      nodes.push(...(ld["@graph"] ?? [ld]));
    } catch (e) { err(f, `invalid JSON-LD: ${e.message}`); }
  }
  if (!noindex) {
    const types = new Set(nodes.map((n) => n["@type"]));
    for (const type of ["Organization", "WebSite", f === "about.html" ? "AboutPage" : f === "contact.html" ? "ContactPage" : "WebPage"]) {
      if (!types.has(type)) err(f, `missing ${type} schema`);
    }
    if (path !== "/") {
      const list = nodes.find((n) => n["@type"] === "BreadcrumbList")?.itemListElement;
      if (list?.length !== 2 || list[0].item !== SITE + "/" || list[1].item !== canonical || list.some((n, i) => n.position !== i + 1)) err(f, "incorrect breadcrumb hierarchy");
    }
    const ids = nodes.map((n) => n["@id"]).filter(Boolean);
    if (new Set(ids).size !== ids.length) err(f, "duplicate structured-data entity IDs");
    for (const [, id] of JSON.stringify(nodes).matchAll(/"@id":"([^"]+)"/g)) if (!ids.includes(id)) err(f, `unresolved schema entity ${id}`);
  }
  for (const app of nodes.filter((n) => n["@type"] === "MobileApplication")) {
    if (app.name !== "MedVeda" || app.operatingSystem !== "Android" || app.applicationCategory !== "EducationalApplication" || app.downloadUrl !== PLAY || !app.publisher) err(f, "incorrect Android app schema");
    if (app.offers || app.aggregateRating || app.review) err(f, "unverified app offer or rating");
  }
  if (["index.html", "download.html"].includes(f) && !nodes.some((n) => n["@type"] === "MobileApplication")) err(f, "missing Android app entity");
}
const sitemap = readFileSync(join(root, "_src/static-sitemap.xml"), "utf8");
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (locations.length !== indexable.size || new Set(locations).size !== locations.length || locations.some((u) => !indexable.has(u))) err("sitemap.xml", "must contain exactly all canonical indexable pages");
if (/<lastmod>/.test(sitemap)) err("sitemap.xml", "lastmod needs verified significant-change dates, not build dates");
const robots = readFileSync(join(root, "robots.txt"), "utf8");
if (!robots.includes(`Sitemap: ${SITE}/sitemap.xml`) || /^Disallow:\s*\S/m.test(robots)) err("robots.txt", "public pages, assets and utility noindex directives must remain crawlable");
for (const u of indexable) {
  const path = u.slice(SITE.length);
  if (!cache["index.html"].includes(`href="${path}"`)) err("index.html", `orphan page ${path}`);
}
if (!cache["download.html"].includes("Access to installation depends on Google Play")) err("download.html", "missing installation-access qualification");
console.log(`SEO: ${indexable.size} canonical indexable pages; ${installationLinks} installation links verified against ${PLAY}`);
console.log(errors ? `\n${errors} problem(s)` : `OK: ${files.length} pages checked, no problems`);
process.exit(errors ? 1 : 0);
