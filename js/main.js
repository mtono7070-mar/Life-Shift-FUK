/* =========================================
   Life Shift FUK サイト共通スクリプト
   - content/site.json（管理画面で編集する内容）を読み込んで表示します
   - HTMLに書かれている文章は、読み込みに失敗したときの予備です
   ========================================= */
(function () {
  "use strict";

  // このスクリプトの場所からサイトの基準パスを求める（themes/ などの下層ページ対応）
  const script = document.currentScript;
  const BASE = script ? script.getAttribute("src").replace(/js\/main\.js.*$/, "") : "";

  const TAG_COLORS = {
    "健康": "#2a9d74", "交流": "#df5470", "グルメ": "#e0688a", "学び": "#2a95c9",
    "お金": "#c98a2b", "美容": "#df5470", "社会貢献": "#2a9d74", "人脈": "#c98a2b"
  };

  /* ---------- 小さな道具 ---------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // 改行 → <br>、［ ］で囲んだ文字 → 小さい文字
  const text = (s) => esc(s).replace(/［(.*?)］/g, "<small>$1</small>").replace(/\n/g, "<br>");

  // 空行で段落に分ける
  const paras = (s) => String(s || "").split(/\n\s*\n/).map((p) => `<p>${text(p.trim())}</p>`).join("");

  const get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

  // 画像パス（http から始まるものはそのまま）
  const src = (p) => (!p ? "" : /^(https?:|data:|\/)/.test(p) ? p : BASE + p);

  const formatDate = (iso) => {
    const [y, m, d] = String(iso).split("-").map(Number);
    if (!y || !m || !d) return { md: "", dow: "", full: "" };
    const dow = "日月火水木金土"[new Date(y, m - 1, d).getDay()];
    return { md: m + "." + d, dow, full: `${y}年${m}月${d}日（${dow}）` };
  };

  const tagHtml = (tags) => (tags || []).filter(Boolean)
    .map((t) => `<span style="--tag:${TAG_COLORS[t] || "#c98a2b"}">${esc(t)}</span>`).join("");

  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const isUpcoming = (iso) => {
    const [y, m, d] = String(iso).split("-").map(Number);
    if (!y) return true;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(y, m - 1, d) >= today;
  };

  /* ---------- リスト表示 ---------- */
  const LISTS = {
    events(items, el) {
      const limit = Number(el.dataset.cmsLimit) || items.length;
      // 開催日が近い順。終了したイベントは表示しない
      const upcoming = items.filter((ev) => isUpcoming(ev.date))
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))
        .slice(0, limit);
      if (!upcoming.length) return '<li class="event-empty">現在募集中のイベントはありません。最新情報は公式LINEでお知らせします。</li>';
      return upcoming.map((ev) => {
        const d = formatDate(ev.date);
        return `
        <li class="event-item">
          <a href="${BASE}events/reserve.html#${encodeURIComponent(ev.id)}">
            <div class="event-thumb"><img src="${esc(src(ev.image))}" alt="" loading="lazy"></div>
            <div class="event-body">
              <p class="event-date">${d.md}<small>（${d.dow}）</small></p>
              <p class="event-title">${esc(ev.title)}</p>
              <div class="event-foot">
                <div class="event-tags">${tagHtml(ev.tags)}</div>
                <span class="event-arrow" aria-hidden="true">→</span>
              </div>
            </div>
            <span class="visually-hidden">予約ページへ</span>
          </a>
        </li>`;
      }).join("");
    },

    faq(items, el) {
      const limit = Number(el.dataset.cmsLimit) || items.length;
      return items.slice(0, limit).map((item) => `
        <li class="faq-item">
          <details>
            <summary><span class="faq-q" aria-hidden="true">Q.</span><span class="faq-text">${esc(item.q)}</span><span class="faq-icon" aria-hidden="true"></span></summary>
            <div class="faq-answer"><span class="faq-a" aria-hidden="true">A.</span><p>${esc(item.a)}</p></div>
          </details>
        </li>`).join("");
    },

    gallery(items) {
      return items.slice(0, 8).map((g, i) =>
        `<li><img src="${esc(src(g.image))}" alt="${esc(g.alt || "ギャラリー写真" + (i + 1))}" loading="lazy"></li>`).join("");
    },

    voices(items) {
      return items.map((v) => `
        <li class="voice-card">
          <img class="voice-avatar" src="${esc(src(v.image))}" alt="" loading="lazy">
          <div>
            <p class="voice-catch">${text(v.catch)}</p>
            <p class="voice-text">${text(v.text)}</p>
            <p class="voice-meta">${esc(v.meta)}</p>
          </div>
        </li>`).join("");
    },

    points(items) {
      return items.map((p, i) => `
        <li>
          <span class="point-num">${String(i + 1).padStart(2, "0")}</span>
          <h3>${esc(p.title)}</h3>
          <p>${text(p.text)}</p>
        </li>`).join("");
    },

    "theme-events"(items) {
      return items.map((e) => `
        <li class="event-card">
          ${e.freq ? `<span class="event-tag">${esc(e.freq)}</span>` : ""}
          <h3>${esc(e.title)}</h3>
          <p>${text(e.text)}</p>
        </li>`).join("");
    },

    recommend(items) {
      return items.filter(Boolean).map((r) => `<li>${CHECK}${esc(r)}</li>`).join("");
    },

    values(items) {
      return items.map((v) => `<li><h3>${esc(v.title)}</h3><p>${text(v.text)}</p></li>`).join("");
    },

    flow(items) {
      return items.map((f, i) => `
        <li>
          <span class="flow-num">STEP ${i + 1}</span>
          <h3>${esc(f.title)}</h3>
          <p>${text(f.text)}</p>
        </li>`).join("");
    }
  };

  /* ---------- 内容を画面に反映 ---------- */
  function apply(content) {
    document.querySelectorAll("[data-cms]").forEach((el) => {
      const v = get(content, el.dataset.cms);
      if (typeof v === "string") el.innerHTML = text(v);
    });
    document.querySelectorAll("[data-cms-paras]").forEach((el) => {
      const v = get(content, el.dataset.cmsParas);
      if (typeof v === "string") el.innerHTML = paras(v);
    });
    document.querySelectorAll("[data-cms-src]").forEach((el) => {
      const v = get(content, el.dataset.cmsSrc);
      if (v) el.src = src(v);
    });
    document.querySelectorAll("[data-cms-href]").forEach((el) => {
      const v = get(content, el.dataset.cmsHref);
      if (v) el.href = v;
    });
    document.querySelectorAll("[data-cms-list]").forEach((el) => {
      const [type, path] = el.dataset.cmsList.split(":");
      const items = get(content, path || type);
      if (Array.isArray(items) && LISTS[type]) el.innerHTML = LISTS[type](items, el);
    });
  }

  /* ---------- フォントと文字の大きさ ---------- */
  function applyDesign(design) {
    const fonts = window.LSF_FONTS || [];
    const d = Object.assign({}, window.LSF_DEFAULT_DESIGN, design);
    const root = document.documentElement.style;
    const queries = [];
    [["--font-heading", d.headingFont], ["--font-body", d.bodyFont]].forEach(([prop, name]) => {
      const f = fonts.find((x) => x.name === name);
      if (!f) return; // 一覧にないフォントは使わない
      root.setProperty(prop, `"${f.name}", ${f.generic}`);
      queries.push(f.query);
    });
    const size = (v) => { const n = Number(v); return n >= 0.8 && n <= 1.4 ? n : 1; };
    root.setProperty("--fs-heading", size(d.headingSize));
    root.setProperty("--fs-body", size(d.bodySize));

    // 標準以外のフォントを選んだときだけ追加で読み込む
    const extra = queries.filter((q) => !/^Noto\+(Serif|Sans)\+JP/.test(q));
    if (extra.length && !document.getElementById("lsf-fonts")) {
      const link = document.createElement("link");
      link.id = "lsf-fonts";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?" + extra.map((q) => "family=" + q).join("&") + "&display=swap";
      document.head.append(link);
    }
  }

  /* ---------- ページを開いたときは一番上から表示 ---------- */
  // （#faq などページ内の見出しを指定して開いた場合はその位置へ）
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  function toTop() {
    const id = location.hash && decodeURIComponent(location.hash.slice(1));
    const target = id && document.getElementById(id);
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }

  /* ---------- ハンバーガーメニュー ---------- */
  const toggle = document.querySelector(".menu-toggle");
  const header = document.querySelector(".site-header");
  if (toggle && header) {
    toggle.addEventListener("click", () => {
      const open = header.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open);
      toggle.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    });
  }

  /* ---------- 読み込み ---------- */
  function done(content) {
    if (content) {
      try { applyDesign(content.design); } catch (e) { console.error(e); }
      try { apply(content); } catch (e) { console.error(e); }
    }
    document.documentElement.classList.remove("cms-loading");
    window.LSF = { content, formatDate, src, text, esc, tagHtml, BASE };
    document.dispatchEvent(new CustomEvent("lsf:content", { detail: content }));
    toTop();
  }

  fetch(BASE + "content/site.json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then(done);

  window.addEventListener("load", () => setTimeout(toTop, 100));
})();
