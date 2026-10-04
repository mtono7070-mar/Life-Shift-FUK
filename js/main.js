/* ページを開いたときは一番上から表示する
   （#about などページ内の見出しを指定して開いた場合はその位置へ） */
(function () {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  const toTop = () => {
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  };
  toTop();
  window.addEventListener("load", () => {
    toTop();
    // 表示環境がスクロール位置を後から戻す場合に備えて、少し後にもう一度
    setTimeout(toTop, 100);
  });
})();

/* ハンバーガーメニュー */
(function () {
  const toggle = document.querySelector(".menu-toggle");
  const header = document.querySelector(".site-header");
  if (!toggle || !header) return;
  toggle.addEventListener("click", () => {
    const open = header.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open);
    toggle.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
  });
})();

/* イベント一覧（js/events.js のデータから表示） */
(function () {
  const list = document.querySelector("[data-event-list]");
  if (!list || !window.LSF_EVENTS) return;

  const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const colors = window.EVENT_TAG_COLORS || {};
  const base = list.dataset.base || "";

  list.innerHTML = window.LSF_EVENTS.map((ev) => {
    const d = window.formatEventDate(ev.date);
    const tags = ev.tags.map((t) => `<span style="--tag:${colors[t] || "#c98a2b"}">${escape(t)}</span>`).join("");
    return `
      <li class="event-item">
        <a href="${base}events/reserve.html#${encodeURIComponent(ev.id)}">
          <div class="event-thumb"><img src="${base}${escape(ev.image)}" alt="" loading="lazy"></div>
          <div class="event-body">
            <p class="event-date">${d.md}<small>（${d.dow}）</small></p>
            <p class="event-title">${escape(ev.title)}</p>
            <div class="event-foot">
              <div class="event-tags">${tags}</div>
              <span class="event-arrow" aria-hidden="true">→</span>
            </div>
          </div>
          <span class="visually-hidden">予約ページへ</span>
        </a>
      </li>`;
  }).join("");
})();
