// StackSift static site builder
// Usage:
//   node build.mjs           -> builds the site into ./dist
//   node build.mjs --serve   -> builds, then serves ./dist on http://localhost:8080
//
// Only one dependency: "marked" (Markdown -> HTML).

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import * as T from "./templates.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, "dist");
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
site.url = site.url.replace(/\/$/, "");
const links = readJSON(path.join(ROOT, "content", "links.json"), {});

// ---------- helpers ----------
function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

function parseValue(raw) {
  const v = raw.trim();
  if (v === "") return "";
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v.startsWith("[") && v.endsWith("]")) {
    return v.slice(1, -1).split(",").map((s) => parseValue(s)).filter((s) => s !== "");
  }
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
}

// Minimal front matter parser (key: value, [lists], booleans, numbers)
function parseFrontMatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const i = line.indexOf(":");
    if (i === -1) continue;
    data[line.slice(0, i).trim()] = parseValue(line.slice(i + 1));
  }
  return { data, body: m[2] };
}

function slugify(s) {
  return String(s).toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Markdown -> HTML, plus: heading ids, table of contents, safe affiliate links
function renderMarkdown(md) {
  let html = marked.parse(md);
  const toc = [];
  const used = new Set();
  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, level, inner) => {
    let id = slugify(inner) || "section";
    while (used.has(id)) id += "-2";
    used.add(id);
    if (level === "2") toc.push({ id, text: inner.replace(/<[^>]+>/g, "") });
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
  html = html.replace(/<a href="([^"]+)"([^>]*)>/g, (all, href, rest) => {
    if (href.startsWith("/go/")) {
      const key = href.replace(/^\/go\//, "").replace(/\/$/, "");
      if (!links[key]) console.warn(`  ! Affiliate link "/go/${key}/" is not defined in content/links.json`);
      return `<a href="${href}"${rest} rel="sponsored nofollow noopener" target="_blank" class="aff">`;
    }
    if (/^https?:\/\//.test(href) && !href.startsWith(site.url)) {
      return `<a href="${href}"${rest} rel="noopener" target="_blank">`;
    }
    return all;
  });
  html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>");
  return { html, toc };
}

function write(rel, content) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name), d = path.join(dest, entry.name);
    if (entry.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copyDir(s, d); }
    else fs.copyFileSync(s, d);
  }
}

function loadDir(dir) {
  const full = path.join(ROOT, "content", dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(full, f), "utf8")
        .replaceAll("{{site.name}}", site.name).replaceAll("{{site.email}}", site.contactEmail).replaceAll("{{site.url}}", site.url);
      const { data, body } = parseFrontMatter(raw);
      const slug = data.slug || f.replace(/\.md$/, "");
      const { html, toc } = renderMarkdown(body);
      const words = body.replace(/[#*_>`\[\]()|-]/g, " ").split(/\s+/).filter(Boolean).length;
      return { ...data, slug, html, toc, url: `/${slug}/`, readingTime: Math.max(1, Math.round(words / 230)), file: f };
    });
}

// ---------- build ----------
export function build() {
  const started = Date.now();
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  copyDir(path.join(ROOT, "public"), OUT);

  const catMap = Object.fromEntries(site.categories.map((c) => [c.slug, c]));
  const posts = loadDir("posts")
    .filter((p) => p.draft !== true)
    .map((p) => {
      if (!p.date) throw new Error(`${p.file}: "date" is required in front matter`);
      if (!catMap[p.category]) throw new Error(`${p.file}: unknown category "${p.category}". Use one of: ${Object.keys(catMap).join(", ")}`);
      return { ...p, categoryInfo: catMap[p.category] };
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const pages = loadDir("pages");

  const ctx = { site, categories: site.categories, posts };

  // Home
  write("index.html", T.home(ctx));

  // Posts
  for (const post of posts) {
    const related = posts.filter((p) => p !== post && p.category === post.category).slice(0, 3);
    const more = related.length < 3 ? posts.filter((p) => p !== post && !related.includes(p)).slice(0, 3 - related.length) : [];
    write(path.join(post.slug, "index.html"), T.post(ctx, post, [...related, ...more]));
  }

  // Pages
  for (const page of pages) write(path.join(page.slug, "index.html"), T.page(ctx, page));

  // Blog index with pagination
  const per = site.postsPerPage || 9;
  const totalPages = Math.max(1, Math.ceil(posts.length / per));
  for (let i = 0; i < totalPages; i++) {
    const slice = posts.slice(i * per, (i + 1) * per);
    const rel = i === 0 ? "blog/index.html" : `blog/page/${i + 1}/index.html`;
    write(rel, T.listing(ctx, {
      title: "All articles", description: `Every guide, review and comparison on ${site.name}.`,
      url: i === 0 ? "/blog/" : `/blog/page/${i + 1}/`, posts: slice,
      pager: { current: i + 1, total: totalPages, base: "/blog/" },
    }));
  }

  // Category pages
  for (const cat of site.categories) {
    write(`category/${cat.slug}/index.html`, T.listing(ctx, {
      title: cat.name, description: cat.description, url: `/category/${cat.slug}/`,
      posts: posts.filter((p) => p.category === cat.slug), eyebrow: "Category",
    }));
  }

  write("404.html", T.notFound(ctx));

  // SEO files
  const urls = [
    { loc: "/", lastmod: posts[0]?.updated || posts[0]?.date },
    { loc: "/blog/" },
    ...site.categories.map((c) => ({ loc: `/category/${c.slug}/` })),
    ...posts.map((p) => ({ loc: p.url, lastmod: p.updated || p.date })),
    ...pages.filter((p) => p.noindex !== true).map((p) => ({ loc: p.url })),
  ];
  write("sitemap.xml", T.sitemap(site, urls));
  write("robots.txt", `User-agent: *\nDisallow: /go/\n\nSitemap: ${site.url}/sitemap.xml\n`);
  write("feed.xml", T.feed(site, posts.slice(0, 20)));

  // Affiliate redirects (Cloudflare Pages / Netlify "_redirects" format)
  const redirects = Object.entries(links).filter(([k]) => !k.startsWith("_")).map(([key, val]) => {
    const target = typeof val === "string" ? val : val.url;
    return `/go/${key} ${target} 302\n/go/${key}/ ${target} 302`;
  });
  write("_redirects", redirects.join("\n") + "\n");

  console.log(`Built ${posts.length} posts, ${pages.length} pages, ${site.categories.length} categories in ${Date.now() - started}ms -> dist/`);
  return { posts, pages };
}

// ---------- local preview server ----------
function serve(port = 8080) {
  const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml",
    ".xml": "application/xml", ".txt": "text/plain", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".ico": "image/x-icon", ".json": "application/json" };
  http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const go = urlPath.match(/^\/go\/([^/]+)\/?$/);
    if (go && links[go[1]]) {
      const target = typeof links[go[1]] === "string" ? links[go[1]] : links[go[1]].url;
      res.writeHead(302, { Location: target }); return res.end();
    }
    let file = path.join(OUT, urlPath);
    if (!file.startsWith(OUT)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) { res.writeHead(404, { "Content-Type": types[".html"] }); return res.end(fs.readFileSync(path.join(OUT, "404.html"))); }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    res.end(fs.readFileSync(file));
  }).listen(port, () => console.log(`Preview: http://localhost:${port}  (Ctrl+C to stop)`));
}

build();
if (process.argv.includes("--serve")) serve(Number(process.env.PORT) || 8080);
