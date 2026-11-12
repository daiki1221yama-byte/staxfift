// HTML templates for StackSift. Plain functions that return strings.

export const esc = (s = "") => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(String(d) + "T00:00:00Z");
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
};
const isoDate = (d) => (d ? new Date(String(d) + "T00:00:00Z").toISOString() : "");
const year = () => new Date().getUTCFullYear();

// ---------- shell ----------
function layout({ site, categories }, { title, description, url, body, type = "website", image, jsonLd = [], noindex = false, bodyClass = "" }) {
  const fullTitle = url === "/" ? `${site.name} — ${site.tagline}` : `${title} | ${site.name}`;
  const canonical = site.url + url;
  const ogImage = image ? (image.startsWith("http") ? image : site.url + image) : `${site.url}/og-default.png`;
  const analytics = site.analytics?.cloudflareToken
    ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${esc(site.analytics.cloudflareToken)}"}'></script>`
    : "";
  return `<!doctype html>
<html lang="${site.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
${noindex ? '<meta name="robots" content="noindex">' : ""}
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${esc(site.name)}" href="/feed.xml">
<link rel="stylesheet" href="/styles.css">
${jsonLd.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n")}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="logo" href="/" aria-label="${esc(site.name)} home">
      <span class="logo-mark" aria-hidden="true"></span>${esc(site.name)}
    </a>
    <button class="nav-toggle" aria-expanded="false" aria-controls="nav" onclick="this.setAttribute('aria-expanded', this.getAttribute('aria-expanded')!=='true');document.getElementById('nav').classList.toggle('open')">Menu</button>
    <nav id="nav" class="nav" aria-label="Main">
      ${categories.map((c) => `<a href="/category/${c.slug}/"${url === `/category/${c.slug}/` ? ' aria-current="page"' : ""}>${esc(c.name)}</a>`).join("")}
      <a href="/blog/"${url.startsWith("/blog/") ? ' aria-current="page"' : ""}>All articles</a>
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <a class="logo logo-footer" href="/"><span class="logo-mark" aria-hidden="true"></span>${esc(site.name)}</a>
      <p class="muted">${esc(site.tagline)}</p>
    </div>
    <div>
      <h2 class="footer-h">Topics</h2>
      <ul>${categories.map((c) => `<li><a href="/category/${c.slug}/">${esc(c.name)}</a></li>`).join("")}</ul>
    </div>
    <div>
      <h2 class="footer-h">About</h2>
      <ul>
        <li><a href="/about/">About us</a></li>
        <li><a href="/how-we-review/">How we review</a></li>
        <li><a href="/contact/">Contact</a></li>
      </ul>
    </div>
    <div>
      <h2 class="footer-h">Legal</h2>
      <ul>
        <li><a href="/affiliate-disclosure/">Affiliate disclosure</a></li>
        <li><a href="/privacy-policy/">Privacy policy</a></li>
        <li><a href="/terms/">Terms of use</a></li>
      </ul>
    </div>
  </div>
  <div class="wrap footer-base">
    <p>${esc(site.name)} is reader-supported. When you buy through links on our site, we may earn an affiliate commission at no extra cost to you. <a href="/affiliate-disclosure/">Learn more</a>.</p>
    <p>© ${year()} ${esc(site.name)}. All rights reserved.</p>
  </div>
</footer>
${analytics}
</body>
</html>`;
}

// ---------- pieces ----------
function card(p) {
  return `<article class="card">
  <a class="card-link" href="${p.url}">
    <span class="eyebrow">${esc(p.categoryInfo.name)}</span>
    <h3>${esc(p.title)}</h3>
    <p>${esc(p.description)}</p>
    <span class="meta">${fmtDate(p.updated || p.date)} · ${p.readingTime} min read</span>
  </a>
</article>`;
}

const grid = (posts) => posts.length
  ? `<div class="grid">${posts.map(card).join("")}</div>`
  : `<p class="empty">New articles are on the way. <a href="/blog/">Browse everything we've published so far</a>.</p>`;

function pager({ current, total, base }) {
  if (total <= 1) return "";
  const href = (n) => (n === 1 ? base : `${base}page/${n}/`);
  return `<nav class="pager" aria-label="Pagination">
  ${current > 1 ? `<a href="${href(current - 1)}">← Newer</a>` : "<span></span>"}
  <span>Page ${current} of ${total}</span>
  ${current < total ? `<a href="${href(current + 1)}">Older →</a>` : "<span></span>"}
</nav>`;
}

// ---------- pages ----------
export function home(ctx) {
  const { site, categories, posts } = ctx;
  const featured = posts.filter((p) => p.featured).slice(0, 1)[0] || posts[0];
  const latest = posts.filter((p) => p !== featured).slice(0, 6);
  const body = `
<section class="hero">
  <div class="wrap hero-inner">
    <p class="eyebrow">Independent · Reader-supported</p>
    <h1>Pick the right tool<br>the first time.</h1>
    <p class="lede">${esc(site.tagline)} We explain how each category works, what actually matters, and where the trade-offs are — before you spend a cent.</p>
    <div class="topic-row">
      ${categories.map((c) => `<a class="chip" href="/category/${c.slug}/">${esc(c.name)}</a>`).join("")}
    </div>
  </div>
</section>
${featured ? `
<section class="wrap featured">
  <a class="featured-card" href="${featured.url}">
    <span class="eyebrow">Start here · ${esc(featured.categoryInfo.name)}</span>
    <h2>${esc(featured.title)}</h2>
    <p>${esc(featured.description)}</p>
    <span class="btn">Read the guide →</span>
  </a>
</section>` : ""}
<section class="wrap section">
  <div class="section-head"><h2>Latest articles</h2><a href="/blog/">View all →</a></div>
  ${grid(latest)}
</section>
<section class="wrap section trust">
  <div>
    <h2>How we make money — and why it doesn't change our verdicts</h2>
    <p>Some links on ${esc(site.name)} are affiliate links. If you sign up through one, the company may pay us a commission. That never affects the price you pay, and it never decides what we recommend: we include drawbacks, we name cheaper alternatives, and we say when you don't need to buy anything at all.</p>
  </div>
  <div class="trust-links">
    <a class="btn btn-ghost" href="/how-we-review/">How we review</a>
    <a class="btn btn-ghost" href="/affiliate-disclosure/">Affiliate disclosure</a>
  </div>
</section>`;
  return layout(ctx, {
    title: site.name, description: site.tagline, url: "/", body,
    jsonLd: [{ "@context": "https://schema.org", "@type": "WebSite", name: site.name, url: site.url + "/", description: site.tagline }],
  });
}

export function post(ctx, p, related) {
  const { site } = ctx;
  const toc = p.toc.length >= 3 ? `<details class="toc" open><summary>On this page</summary><ol>${p.toc.map((t) => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join("")}</ol></details>` : "";
  const body = `
<article class="wrap article">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/category/${p.category}/">${esc(p.categoryInfo.name)}</a></nav>
  <header class="article-head">
    <span class="eyebrow">${esc(p.categoryInfo.name)}</span>
    <h1>${esc(p.title)}</h1>
    <p class="lede">${esc(p.description)}</p>
    <p class="meta">By ${esc(site.author.name)} · ${p.updated ? `Updated ${fmtDate(p.updated)}` : fmtDate(p.date)} · ${p.readingTime} min read</p>
  </header>
  <aside class="disclosure" role="note">
    <strong>Disclosure:</strong> We may earn a commission when you buy through links on this page, at no extra cost to you. It doesn't influence our recommendations. <a href="/affiliate-disclosure/">How this works</a>.
  </aside>
  ${toc}
  <div class="prose">
    ${p.html}
  </div>
  <footer class="author-box">
    <span class="logo-mark big" aria-hidden="true"></span>
    <div>
      <strong>${esc(site.author.name)}</strong>
      <p>${esc(site.author.bio)} <a href="/how-we-review/">How we review →</a></p>
    </div>
  </footer>
</article>
${related.length ? `<section class="wrap section"><div class="section-head"><h2>Keep reading</h2></div>${grid(related)}</section>` : ""}`;
  return layout(ctx, {
    title: p.title, description: p.description, url: p.url, body, type: "article", image: p.image,
    jsonLd: [
      {
        "@context": "https://schema.org", "@type": "Article", headline: p.title, description: p.description,
        datePublished: isoDate(p.date), dateModified: isoDate(p.updated || p.date),
        author: { "@type": "Organization", name: site.author.name, url: site.url + "/about/" },
        publisher: { "@type": "Organization", name: site.name, url: site.url + "/" },
        mainEntityOfPage: site.url + p.url,
        ...(p.image ? { image: p.image.startsWith("http") ? p.image : site.url + p.image } : {}),
      },
      {
        "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: site.url + "/" },
          { "@type": "ListItem", position: 2, name: p.categoryInfo.name, item: `${site.url}/category/${p.category}/` },
          { "@type": "ListItem", position: 3, name: p.title, item: site.url + p.url },
        ],
      },
    ],
  });
}

export function page(ctx, p) {
  const body = `
<article class="wrap article narrow">
  <header class="article-head">
    <h1>${esc(p.title)}</h1>
    ${p.updated ? `<p class="meta">Last updated ${fmtDate(p.updated)}</p>` : ""}
  </header>
  <div class="prose">${p.html}</div>
</article>`;
  return layout(ctx, { title: p.title, description: p.description || p.title, url: p.url, body, noindex: p.noindex === true });
}

export function listing(ctx, { title, description, url, posts, pager: pg, eyebrow }) {
  const body = `
<section class="wrap list-head">
  ${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ""}
  <h1>${esc(title)}</h1>
  <p class="lede">${esc(description)}</p>
</section>
<section class="wrap section">${grid(posts)}${pg ? pager(pg) : ""}</section>`;
  return layout(ctx, { title, description, url, body });
}

export function notFound(ctx) {
  const body = `<section class="wrap list-head center"><span class="eyebrow">404</span><h1>We couldn't find that page.</h1><p class="lede">It may have moved. Try the <a href="/blog/">full article list</a> or head back <a href="/">home</a>.</p></section>`;
  return layout(ctx, { title: "Page not found", description: "Page not found", url: "/404.html", body, noindex: true });
}

// ---------- feeds ----------
export function sitemap(site, urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${site.url}${u.loc}</loc>${u.lastmod ? `<lastmod>${String(u.lastmod)}</lastmod>` : ""}</url>`).join("\n")}
</urlset>
`;
}

export function feed(site, posts) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(site.name)}</title>
  <link>${site.url}/</link>
  <description>${esc(site.tagline)}</description>
  <language>${site.language}</language>
  <atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml"/>
${posts.map((p) => `  <item>
    <title>${esc(p.title)}</title>
    <link>${site.url}${p.url}</link>
    <guid>${site.url}${p.url}</guid>
    <pubDate>${new Date(String(p.date) + "T00:00:00Z").toUTCString()}</pubDate>
    <description>${esc(p.description)}</description>
  </item>`).join("\n")}
</channel>
</rss>
`;
}
