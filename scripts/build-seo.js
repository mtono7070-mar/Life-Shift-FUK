// SEO（検索・SNSでの見え方）を各ページに書き込むスクリプト
//   node scripts/build-seo.js              … このフォルダのHTMLにそのまま書き込む
//   node scripts/build-seo.js --out public … サイトを public/ にコピーしてから書き込む（Vercelの公開用）
// Vercel が公開するたびに自動で実行されます（vercel.json の buildCommand / outputDirectory）。
// 管理画面の「検索・SNSの表示（SEO）」で入力した内容から、次のものを作ります。
//   1. 各ページの <title>・説明文・SNSでシェアしたときの表示（OGP）・正式なURL（canonical）
//   2. sitemap.xml と robots.txt
//   3. Google 向けの構造化データ（団体情報・イベント・よくある質問）
// どこかで失敗しても公開は止めない（その部分だけ飛ばす）ようにしています。
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
// 書き込み先（--out を付けたときはそのフォルダ）
const outArg = process.argv.indexOf("--out");
const OUT = outArg > 0 && process.argv[outArg + 1] ? path.resolve(ROOT, process.argv[outArg + 1]) : ROOT;
// 公開用フォルダにコピーしないもの（サーバーの処理 api/ は Vercel が別に扱います）
const SKIP = new Set([".git", ".github", ".vercel", ".local-store", "node_modules", "public", "scripts", "api", "docs", "vercel.json", ".gitignore"]);
const START = "<!-- SEO:START 自動生成（scripts/build-seo.js）。ここは直接編集せず、管理画面「検索・SNSの表示（SEO）」で変更してください -->";
const END = "<!-- SEO:END -->";

// ページの一覧（key は管理画面・site.json の seo.pages.〇〇 と対応）
const PAGES = [
  { key: "top", file: "index.html", url: "/" },
  { key: "about", file: "about.html", url: "/about.html" },
  { key: "events", file: "events/index.html", url: "/events/" },
  { key: "reserve", file: "events/reserve.html", url: "/events/reserve.html", noindex: true },
  { key: "faq", file: "faq.html", url: "/faq.html" },
  { key: "members", file: "members.html", url: "/members.html" },
  { key: "sponsors", file: "sponsors.html", url: "/sponsors.html" },
  { key: "connection", file: "themes/connection.html", url: "/themes/connection.html" },
  { key: "health", file: "themes/health.html", url: "/themes/health.html" },
  { key: "beauty", file: "themes/beauty.html", url: "/themes/beauty.html" },
  { key: "money", file: "themes/money.html", url: "/themes/money.html" },
  { key: "social-good", file: "themes/social-good.html", url: "/themes/social-good.html" }
];

const warn = (msg, e) => console.warn("[build-seo] " + msg + (e ? "：" + e.message : ""));

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const oneLine = (s) => String(s || "").replace(/\s+/g, " ").trim();

// サイトの正式なURL：管理画面の入力 → 環境変数 SITE_URL → Vercel の本番URL（独自ドメインを設定するとそれになります）
function siteBase(content) {
  const fromAdmin = content.settings && content.settings.siteUrl;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL : "";
  const base = String(fromAdmin || process.env.SITE_URL || vercel || "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[^/\s]+/.test(base) ? base : "";
}

const absUrl = (base, p) => {
  if (!p) return "";
  if (/^https?:\/\//.test(p)) return p;
  return base ? base + "/" + String(p).replace(/^\/+/, "") : "";
};

// ---------- 3. 構造化データ ----------
const todayJst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

// "9:00〜11:00" → ["09:00", "11:00"]
function parseTimes(time) {
  const m = String(time || "").match(/(\d{1,2})[:：](\d{2})(?:\s*[〜~\-－ー]\s*(\d{1,2})[:：](\d{2}))?/);
  if (!m) return [];
  const pad = (n) => String(n).padStart(2, "0");
  return [pad(m[1]) + ":" + m[2], m[3] ? pad(m[3]) + ":" + m[4] : null];
}

// "5,000円（食材込み）" → 5000 / "無料" → 0
function parsePrice(fee) {
  const s = String(fee || "");
  if (/無料/.test(s)) return 0;
  const m = s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).match(/(\d[\d,]*)\s*円/);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

function eventLd(ev, base, content) {
  const [start, end] = parseTimes(ev.time);
  const place = oneLine(ev.place) || "福岡市";
  const city = (place.match(/福岡市[^\s（(）)※]*?区/) || place.match(/福岡市/) || [""])[0];
  const price = parsePrice(ev.fee);
  const ld = {
    "@type": "Event",
    name: ev.title,
    startDate: start ? `${ev.date}T${start}:00+09:00` : ev.date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: place,
      address: { "@type": "PostalAddress", addressRegion: "福岡県", ...(city ? { addressLocality: city } : {}), addressCountry: "JP" }
    },
    organizer: { "@type": "Organization", name: siteName(content), ...(base ? { url: base + "/" } : {}) }
  };
  if (end) ld.endDate = `${ev.date}T${end}:00+09:00`;
  if (ev.description) ld.description = oneLine(ev.description);
  const img = absUrl(base, ev.image);
  if (img) ld.image = [img];
  if (base) ld.url = `${base}/events/reserve.html#${encodeURIComponent(ev.id || "")}`;
  if (price != null) {
    ld.offers = { "@type": "Offer", price, priceCurrency: "JPY", availability: "https://schema.org/InStock", ...(ld.url ? { url: ld.url } : {}) };
  }
  return ld;
}

const siteName = (content) => oneLine((content.seo && content.seo.siteName) || "Life Shift FUK");

function structuredData(page, content, base) {
  const out = [];
  const sameAs = [content.settings && content.settings.instagramUrl, content.settings && content.settings.lineUrl].filter((u) => /^https?:\/\//.test(u || ""));
  if (page.key === "top") {
    out.push({
      "@type": "Organization",
      name: siteName(content),
      ...(base ? { url: base + "/" } : {}),
      ...(absUrl(base, content.settings && content.settings.logo) ? { logo: absUrl(base, content.settings.logo) } : {}),
      ...(sameAs.length ? { sameAs } : {}),
      areaServed: "福岡県福岡市"
    });
    if (base) out.push({ "@type": "WebSite", name: siteName(content), url: base + "/", inLanguage: "ja" });
  }
  if (page.key === "top" || page.key === "events") {
    const today = todayJst();
    (content.events || [])
      .filter((ev) => ev && ev.title && /^\d{4}-\d{2}-\d{2}$/.test(ev.date || "") && ev.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((ev) => {
        try { out.push(eventLd(ev, base, content)); } catch (e) { warn(`イベント「${ev.title}」を飛ばしました`, e); }
      });
  }
  if (page.key === "faq" && Array.isArray(content.faq) && content.faq.length) {
    out.push({
      "@type": "FAQPage",
      mainEntity: content.faq.filter((f) => f && f.q && f.a).map((f) => ({
        "@type": "Question", name: oneLine(f.q), acceptedAnswer: { "@type": "Answer", text: oneLine(f.a) }
      }))
    });
  }
  return out;
}

// ---------- 1. タイトル・説明文・OGP ----------
function headBlock(page, content, base) {
  const seo = content.seo || {};
  const p = (seo.pages && seo.pages[page.key]) || {};
  const title = oneLine(p.title) || siteName(content);
  const desc = oneLine(p.description);
  const url = base ? base + page.url : "";
  const image = absUrl(base, p.image || seo.image || (content.home && content.home.hero && content.home.hero.image));

  const tags = [`<title>${esc(title)}</title>`];
  if (desc) tags.push(`<meta name="description" content="${esc(desc)}">`);
  if (page.noindex) tags.push(`<meta name="robots" content="noindex, follow">`);
  if (url) tags.push(`<link rel="canonical" href="${esc(url)}">`);
  tags.push(
    `<meta property="og:type" content="${page.key === "top" ? "website" : "article"}">`,
    `<meta property="og:site_name" content="${esc(siteName(content))}">`,
    `<meta property="og:locale" content="ja_JP">`,
    `<meta property="og:title" content="${esc(title)}">`
  );
  if (desc) tags.push(`<meta property="og:description" content="${esc(desc)}">`);
  if (url) tags.push(`<meta property="og:url" content="${esc(url)}">`);
  if (image) tags.push(`<meta property="og:image" content="${esc(image)}">`);
  tags.push(`<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`);

  try {
    const ld = structuredData(page, content, base);
    if (ld.length) {
      const json = JSON.stringify({ "@context": "https://schema.org", "@graph": ld }, null, 1).replace(/</g, "\\u003c");
      tags.push(`<script type="application/ld+json">\n${json}\n  </script>`);
    }
  } catch (e) { warn(`${page.file} の構造化データを飛ばしました`, e); }

  return [START, ...tags, END].map((t) => "  " + t).join("\n");
}

function writePage(page, content, base) {
  const file = path.join(OUT, page.file);
  let html = fs.readFileSync(file, "utf8");
  const block = headBlock(page, content, base);
  const s = html.indexOf("  " + START), e = html.indexOf(END);
  if (s >= 0 && e > s) {
    html = html.slice(0, s) + block + html.slice(e + END.length);
  } else {
    // 初回：元の <title> と説明文を取り除いて、viewport の下に入れる
    html = html.replace(/\n\s*<title>[\s\S]*?<\/title>/, "").replace(/\n\s*<meta name="description"[^>]*>/, "");
    html = html.replace(/(<meta name="viewport"[^>]*>)/, `$1\n${block}`);
  }
  fs.writeFileSync(file, html);
}

// ---------- 2. sitemap.xml / robots.txt ----------
function writeSitemapAndRobots(base) {
  const robots = ["User-agent: *", "Disallow: /admin/", "Disallow: /api/"];
  if (base) {
    const today = todayJst();
    const urls = PAGES.filter((p) => !p.noindex).map((p) =>
      `  <url><loc>${esc(base + p.url)}</loc><lastmod>${today}</lastmod><changefreq>${p.key === "top" || p.key === "events" ? "weekly" : "monthly"}</changefreq><priority>${p.key === "top" ? "1.0" : p.key === "events" ? "0.9" : "0.6"}</priority></url>`);
    fs.writeFileSync(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
    robots.push("", `Sitemap: ${base}/sitemap.xml`);
  }
  fs.writeFileSync(path.join(OUT, "robots.txt"), robots.join("\n") + "\n");
}

// ---------- 実行 ----------
// サイトのファイルを公開用フォルダにコピー（失敗したときは公開を止める：壊れたサイトを出さないため）
function copySite() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  for (const name of fs.readdirSync(ROOT)) {
    if (SKIP.has(name)) continue;
    fs.cpSync(path.join(ROOT, name), path.join(OUT, name), { recursive: true });
  }
}

(function main() {
  if (OUT !== ROOT) {
    copySite();
    console.log(`[build-seo] サイトを ${path.relative(ROOT, OUT)}/ にコピーしました`);
  }
  let content = {};
  try {
    content = JSON.parse(fs.readFileSync(path.join(ROOT, "content/site.json"), "utf8"));
  } catch (e) {
    warn("content/site.json を読めませんでした（SEOの書き込みを中止します）", e);
    return;
  }
  const base = siteBase(content);
  if (!base) warn("サイトのURLが分からないため、URLが必要な項目（canonical・OGP画像・サイトマップ）は省きます");
  for (const page of PAGES) {
    try { writePage(page, content, base); } catch (e) { warn(`${page.file} を飛ばしました`, e); }
  }
  try { writeSitemapAndRobots(base); } catch (e) { warn("sitemap.xml / robots.txt を作れませんでした", e); }
  console.log(`[build-seo] 完了（サイトのURL：${base || "未設定"}）`);
})();
