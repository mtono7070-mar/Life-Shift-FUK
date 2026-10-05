/* =========================================
   Life Shift FUK 管理画面
   - content/site.json を読み込み、フォームで編集して保存します
   - 保存すると GitHub に記録され、Vercel が1〜2分でサイトに反映します
   ========================================= */
(function () {
  "use strict";

  const API = "/api";
  const TAG_OPTIONS = ["交流", "健康", "グルメ", "学び", "お金", "美容", "社会貢献", "人脈"];
  const THEMES = [
    ["connection", "人脈"], ["health", "健康"], ["beauty", "美容"], ["money", "お金"], ["social-good", "社会貢献"]
  ];

  const state = {
    saved: null,     // 最後に保存した内容
    draft: null,     // 編集中の内容
    sha: null,       // 保存時の衝突チェック用
    previews: {},    // アップロード直後の画像（サイトに反映される前のプレビュー用）
    open: new Set(), // 開いているリスト項目
    screen: null
  };

  /* ---------- 道具 ---------- */
  const $ = (sel) => document.querySelector(sel);
  const clone = (v) => JSON.parse(JSON.stringify(v));

  // 要素を作る小さな関数（文字は textContent で入れるので安全）
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k in el && typeof v !== "string") el[k] = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  const getAt = (path) => path.reduce((o, k) => (o == null ? undefined : o[k]), state.draft);
  function setAt(path, value) {
    let o = state.draft;
    for (let i = 0; i < path.length - 1; i++) {
      if (o[path[i]] == null) o[path[i]] = typeof path[i + 1] === "number" ? [] : {};
      o = o[path[i]];
    }
    o[path[path.length - 1]] = value;
    changed();
  }

  const imageUrl = (p) => (!p ? "" : state.previews[p] || (/^(https?:|data:)/.test(p) ? p : "../" + p));

  const formatDate = (iso) => {
    const [y, m, d] = String(iso || "").split("-").map(Number);
    if (!y || !m || !d) return "日付未設定";
    return `${y}年${m}月${d}日（${"日月火水木金土"[new Date(y, m - 1, d).getDay()]}）`;
  };

  const isPast = (iso) => {
    const [y, m, d] = String(iso || "").split("-").map(Number);
    if (!y) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(y, m - 1, d) < today;
  };

  let toastTimer;
  function toast(message, isError) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.toggle("is-error", !!isError);
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), isError ? 8000 : 5000);
  }

  async function api(path, options = {}) {
    const res = await fetch(API + path, {
      credentials: "same-origin",
      ...options,
      headers: { "Content-Type": "application/json", "X-LSF-Admin": "1", ...(options.headers || {}) }
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== "/login") {
      showLogin();
      throw new Error("ログインの有効期限が切れました。もう一度ログインしてください。");
    }
    if (!res.ok) throw new Error(data.error || "通信に失敗しました。時間をおいてもう一度お試しください。");
    return data;
  }

  /* ---------- 画面の定義 ---------- */
  const S = {
    text: (key, label, help, extra) => ({ type: "text", key, label, help, ...extra }),
    area: (key, label, help, extra) => ({ type: "textarea", key, label, help, ...extra }),
    image: (key, label, help, extra) => ({ type: "image", key, label, help, ...extra })
  };

  const BR_HELP = "改行した位置で、サイトでも改行されます。";

  const SCREENS = {
    home: { group: "はじめに", title: "使い方", render: renderHome },

    events: {
      group: "よく更新するもの", title: "イベント", view: "../events/index.html",
      lead: "トップページとイベント一覧に表示されるイベントです。開催日が過ぎたイベントは、サイトに自動で表示されなくなります。",
      sections: [{
        title: "イベント一覧",
        fields: [{
          type: "list", key: "events", addLabel: "＋ 新しいイベントを追加",
          sortByDate: true, copyable: true,
          newItem: () => {
            const d = new Date(); d.setDate(d.getDate() + 14);
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            return { id: "ev-" + Date.now().toString(36), date: iso, title: "新しいイベント", tags: [], image: "assets/images/events/bbq.jpg", time: "", place: "", fee: "", capacity: "", description: "" };
          },
          itemTitle: (it) => it.title || "（タイトル未入力）",
          itemSub: (it) => formatDate(it.date),
          itemBadge: (it) => (isPast(it.date) ? ["終了", "badge--closed"] : ["受付中", "badge--open"]),
          thumb: (it) => it.image,
          fields: [
            S.text("title", "イベント名", "例：BBQ交流会"),
            { type: "date", key: "date", label: "開催日", help: "曜日はサイトで自動表示されます。" },
            S.text("time", "時間", "例：11:00〜15:00"),
            S.text("place", "場所", "例：福岡市内のビーチ（詳細は予約後にご案内します）"),
            S.text("fee", "参加費", "例：4,000円（食材・飲み物込み）"),
            S.text("capacity", "定員", "例：20名"),
            { type: "tags", key: "tags", label: "タグ", help: "当てはまるものを押して選びます（いくつでも）。" },
            S.image("image", "写真", "イベントのカードと予約ページに表示されます。"),
            S.area("description", "イベントの説明", "予約ページに表示される説明文です。")
          ]
        }]
      }]
    },

    gallery: {
      group: "よく更新するもの", title: "ギャラリー写真", view: "../index.html#activities",
      lead: "トップページの「Life Shiftの日常」に並ぶ8枚の写真です。",
      render: renderGallery
    },

    voices: {
      group: "よく更新するもの", title: "参加者の声", view: "../index.html#voices",
      lead: "トップページの「参加者の声」に表示されます。3件がおすすめです。",
      sections: [{
        title: "参加者の声",
        fields: [{
          type: "list", key: "voices", addLabel: "＋ 参加者の声を追加", movable: true,
          newItem: () => ({ catch: "", text: "", meta: "", image: "assets/images/voice/voice-01.jpg" }),
          itemTitle: (it) => (it.catch || "（ひとこと未入力）").replace(/\n/g, " "),
          itemSub: (it) => it.meta,
          thumb: (it) => it.image,
          fields: [
            S.area("catch", "ひとこと（太字で表示）", BR_HELP + " 例：「一人参加でしたが、すぐに馴染めました！」", { rows: 2 }),
            S.area("text", "感想", "", { rows: 3 }),
            S.text("meta", "年代・性別", "例：30代・女性"),
            S.image("image", "顔写真", "丸く切り抜いて表示されます。", { round: true, maxSize: 500 })
          ]
        }]
      }]
    },

    faq: {
      group: "よく更新するもの", title: "よくある質問", view: "../faq.html",
      lead: "トップページには上から5件、「よくある質問」ページにはすべてが表示されます。",
      sections: [{
        title: "質問と回答",
        fields: [{
          type: "list", key: "faq", addLabel: "＋ 質問を追加", movable: true,
          newItem: () => ({ q: "", a: "" }),
          itemTitle: (it) => it.q || "（質問未入力）",
          fields: [S.text("q", "質問"), S.area("a", "回答", BR_HELP)]
        }]
      }]
    },

    "pages/top": {
      group: "ページの文章・写真", title: "トップページ", view: "../index.html",
      sections: [
        {
          title: "一番上（大きな写真と見出し）",
          fields: [
            S.text("home.hero.title1", "見出し 1行目", "［ ］で囲んだ文字は小さく表示されます。例：出会［い］で、"),
            S.text("home.hero.title2", "見出し 2行目", "例：これからの未来［を］つくる。"),
            S.area("home.hero.lead", "見出しの下の文章", BR_HELP, { rows: 2 }),
            S.area("home.hero.sub", "小さい文章", BR_HELP, { rows: 2 }),
            S.image("home.hero.image", "背景の写真", "横長の写真がおすすめです。人物は右側に表示されます。", { maxSize: 2000 })
          ]
        },
        {
          title: "Life Shift FUKとは？",
          fields: [
            S.area("home.about.text1", "最初の文章", BR_HELP, { rows: 2 }),
            S.text("home.about.highlight", "強調する一文", "色付きの帯で目立たせて表示されます。"),
            S.area("home.about.text2", "続きの文章", BR_HELP, { rows: 3 }),
            S.image("home.about.image", "写真")
          ]
        },
        { title: "5つのテーマ", note: "各テーマの文章は、左のメニューの「5つのテーマ」から変更できます。", fields: [S.area("home.themesLead", "見出しの下の文章", "", { rows: 2 })] },
        {
          title: "各コーナーの説明文",
          fields: [
            S.area("home.eventsTitle", "イベントの見出し", BR_HELP, { rows: 2 }),
            S.area("home.eventsText", "イベントの説明", BR_HELP, { rows: 3 }),
            S.area("home.galleryText", "ギャラリーの説明", BR_HELP, { rows: 2 }),
            S.area("home.voicesText", "参加者の声の説明", BR_HELP, { rows: 2 })
          ]
        }
      ]
    },

    "pages/about": {
      group: "ページの文章・写真", title: "Life Shift FUKとは", view: "../about.html",
      sections: [
        {
          title: "想い",
          fields: [
            S.area("about.catch", "キャッチコピー", BR_HELP, { rows: 2 }),
            S.area("about.body", "本文", "段落を分けたいときは、1行あけてください。", { rows: 10 }),
            S.image("about.image", "写真")
          ]
        },
        { title: "名前に込めた想い", fields: [S.area("about.nameText", "文章", "", { rows: 4 })] },
        {
          title: "大切にしていること",
          fields: [{
            type: "list", key: "about.values", addLabel: "＋ 項目を追加", movable: true,
            newItem: () => ({ title: "", text: "" }), itemTitle: (it) => it.title || "（見出し未入力）",
            fields: [S.text("title", "見出し"), S.area("text", "説明", "", { rows: 3 })]
          }]
        },
        {
          title: "参加までの流れ",
          note: "「STEP 1」などの番号は、並び順に合わせて自動で付きます。",
          fields: [{
            type: "list", key: "about.flow", addLabel: "＋ ステップを追加", movable: true,
            newItem: () => ({ title: "", text: "" }), itemTitle: (it, i) => `STEP ${i + 1}：${it.title || "（未入力）"}`,
            fields: [S.text("title", "見出し"), S.area("text", "説明", "", { rows: 2 })]
          }]
        },
        {
          title: "運営メッセージ",
          fields: [
            S.area("about.message", "メッセージ", "段落を分けたいときは、1行あけてください。", { rows: 7 }),
            S.text("about.messageSign", "署名", "例：Life Shift FUK 運営チーム")
          ]
        }
      ]
    },

    design: {
      group: "設定", title: "フォント・文字の大きさ", view: "../index.html",
      lead: "サイト全体の文字の書体（フォント）と大きさを変えられます。選ぶと下の「見本」がすぐに変わります。",
      render: renderDesign
    },

    settings: {
      group: "設定", title: "LINE・Instagramのリンク",
      lead: "サイト内の「公式LINE」「Instagram」ボタンのリンク先です。",
      sections: [{
        title: "リンク先",
        fields: [
          { type: "url", key: "settings.lineUrl", label: "公式LINEのURL", help: "例：https://lin.ee/xxxxxxx" },
          { type: "url", key: "settings.instagramUrl", label: "InstagramのURL", help: "例：https://www.instagram.com/アカウント名/" }
        ]
      }]
    }
  };

  // 5つのテーマ
  for (const [slug, name] of THEMES) {
    const base = `themes.${slug}`;
    SCREENS[`pages/themes/${slug}`] = {
      group: "5つのテーマ", title: name, view: `../themes/${slug}.html`, sub: true,
      lead: `「${name}」のテーマページと、トップページのカードの文章です。`,
      sections: [
        { title: "トップページのカード", fields: [S.area(`${base}.short`, "カードの短い説明", BR_HELP + " 3行くらいがおすすめです。", { rows: 3 })] },
        {
          title: "テーマページ",
          fields: [
            S.text(`${base}.catch`, "キャッチコピー"),
            S.area(`${base}.lead`, "紹介文", "", { rows: 5 })
          ]
        },
        {
          title: "このテーマで大切にしていること",
          fields: [{
            type: "list", key: `${base}.points`, addLabel: "＋ 項目を追加", movable: true,
            newItem: () => ({ title: "", text: "" }), itemTitle: (it) => it.title || "（見出し未入力）",
            fields: [S.text("title", "見出し"), S.area("text", "説明", "", { rows: 3 })]
          }]
        },
        {
          title: "主な活動・イベント例",
          fields: [{
            type: "list", key: `${base}.events`, addLabel: "＋ 活動を追加", movable: true,
            newItem: () => ({ title: "", freq: "", text: "" }), itemTitle: (it) => it.title || "（活動名未入力）", itemSub: (it) => it.freq,
            fields: [S.text("title", "活動名"), S.text("freq", "開催頻度", "例：月1回、不定期"), S.area("text", "説明", "", { rows: 3 })]
          }]
        },
        { title: "こんな方におすすめ", fields: [{ type: "strings", key: `${base}.recommend`, addLabel: "＋ 追加" }] }
      ]
    };
  }

  // 「設定」はメニューの一番下に
  for (const id of ["design", "settings"]) {
    const sc = SCREENS[id];
    delete SCREENS[id];
    SCREENS[id] = sc;
  }

  /* ---------- サイドメニュー ---------- */
  function renderNav() {
    const nav = $("#sidebar");
    nav.replaceChildren();
    const groups = {};
    for (const [id, sc] of Object.entries(SCREENS)) (groups[sc.group] = groups[sc.group] || []).push([id, sc]);
    for (const [group, items] of Object.entries(groups)) {
      nav.append(h("div", { class: "nav-group" },
        h("p", { class: "nav-group-title", text: group }),
        h("ul", { class: "nav-list" + (items[0][1].sub ? " nav-sub" : "") },
          items.map(([id, sc]) => h("li", null, h("a", { href: "#" + id, "aria-current": state.screen === id ? "page" : null, text: sc.title })))
        )
      ));
    }
    nav.append(h("div", { class: "nav-group" },
      h("button", { type: "button", class: "button button--ghost", style: "width:100%", onclick: logout, text: "ログアウト" })));
  }

  /* ---------- 入力欄 ---------- */
  const pathOf = (key, base) => (base || []).concat(key.split(".").map((k) => (/^\d+$/.test(k) ? Number(k) : k)));
  let uid = 0;

  function renderField(def, base) {
    const path = pathOf(def.key, base);
    const id = "f" + (++uid);
    const help = def.help ? h("p", { class: "field-help", id: id + "-help", text: def.help }) : null;
    const value = getAt(path);

    if (def.type === "list") return renderList(def, path);
    if (def.type === "strings") return renderStrings(def, path);

    if (def.type === "image") return renderImage(def, path, id, help);

    if (def.type === "tags") {
      const current = new Set(value || []);
      return h("fieldset", { class: "field", style: "border:0;padding:0;margin-inline:0" },
        h("legend", { class: "field-label", text: def.label }), help,
        h("div", { class: "chips" }, TAG_OPTIONS.map((t) => h("label", { class: "chip" },
          h("input", {
            type: "checkbox", checked: current.has(t),
            onchange: (e) => {
              const set = new Set(getAt(path) || []);
              e.target.checked ? set.add(t) : set.delete(t);
              setAt(path, TAG_OPTIONS.filter((o) => set.has(o)));
            }
          }), t)))
      );
    }

    const common = {
      id, "aria-describedby": help ? id + "-help" : null,
      oninput: (e) => { setAt(path, e.target.value); if (def.onChange) def.onChange(); }
    };
    let input;
    if (def.type === "textarea") {
      input = h("textarea", { ...common, rows: def.rows || 4 });
      input.value = value || "";
    } else {
      input = h("input", { ...common, type: def.type === "url" ? "url" : def.type === "date" ? "date" : "text", value: value || "", inputmode: def.type === "url" ? "url" : null });
    }
    return h("div", { class: "field" }, h("label", { for: id, text: def.label }), help, input);
  }

  function renderImage(def, path, id, help) {
    const img = h("img", { class: "image-preview" + (def.round ? " image-preview--round" : ""), src: imageUrl(getAt(path)), alt: "" });
    const status = h("p", { class: "image-status", "aria-live": "polite" });
    const file = h("input", {
      id, type: "file", accept: "image/*", hidden: true,
      onchange: async (e) => {
        const f = e.target.files[0];
        e.target.value = "";
        if (!f) return;
        status.textContent = "写真を準備しています…";
        try {
          const dataUrl = await resizeImage(f, def.maxSize || 1600);
          status.textContent = "アップロードしています…";
          const { path: uploaded } = await api("/upload", { method: "POST", body: JSON.stringify({ data: dataUrl }) });
          state.previews[uploaded] = dataUrl;
          setAt(path, uploaded);
          img.src = dataUrl;
          status.textContent = "写真を変更しました。最後に「保存する」を押してください。";
        } catch (err) {
          status.textContent = "";
          toast(err.message, true);
        }
      }
    });
    return h("div", { class: "field" },
      h("span", { class: "field-label", text: def.label }), help,
      h("div", { class: "image-field" }, img,
        h("div", { class: "image-actions" },
          h("button", { type: "button", class: "button button--ghost", onclick: () => file.click(), text: "写真を変える" }),
          file, status)));
  }

  // 写真を縮小してJPEGにする（スマホの大きな写真もそのまま選べるように）
  function resizeImage(file, maxSize) {
    return new Promise((resolve, reject) => {
      if (!/^image\//.test(file.type)) return reject(new Error("写真（画像ファイル）を選んでください"));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("この写真は読み込めませんでした。JPEGかPNGの写真を選んでください。")); };
      img.src = url;
    });
  }

  function renderList(def, path) {
    const items = getAt(path) || [];
    const listKey = path.join(".");
    let order = items.map((it, i) => i);
    if (def.sortByDate) {
      // これからのイベントを日付順に、その後に終了したイベント
      order.sort((a, b) => {
        const pa = isPast(items[a].date), pb = isPast(items[b].date);
        if (pa !== pb) return pa ? 1 : -1;
        return pa ? String(items[b].date).localeCompare(items[a].date) : String(items[a].date).localeCompare(items[b].date);
      });
    }

    const rerender = () => renderScreen(true);
    const list = h("div", { class: "list" }, order.map((i, pos) => {
      const it = items[i];
      const key = `${listKey}.${i}`;
      const badge = def.itemBadge ? def.itemBadge(it) : null;
      const details = h("details", {
        class: "item", open: state.open.has(key),
        ontoggle: (e) => (e.target.open ? state.open.add(key) : state.open.delete(key))
      },
        h("summary", null,
          def.thumb ? h("img", { class: "item-thumb", src: imageUrl(def.thumb(it)), alt: "" }) : null,
          h("span", { class: "item-title" }, def.itemTitle(it, i),
            def.itemSub && def.itemSub(it) ? h("span", { class: "item-sub", text: def.itemSub(it) }) : null),
          badge ? h("span", { class: "badge " + badge[1], text: badge[0] }) : null
        ),
        h("div", { class: "item-body" },
          def.fields.map((f) => renderField(f, path.concat(i))),
          h("div", { class: "item-tools" },
            def.movable && i > 0 ? h("button", { type: "button", class: "button button--ghost button--small", onclick: () => { move(path, i, -1); rerender(); }, text: "↑ 上へ" }) : null,
            def.movable && i < items.length - 1 ? h("button", { type: "button", class: "button button--ghost button--small", onclick: () => { move(path, i, 1); rerender(); }, text: "↓ 下へ" }) : null,
            def.copyable ? h("button", {
              type: "button", class: "button button--ghost button--small", text: "コピーして新しく作る",
              onclick: () => {
                const copy = clone(it);
                copy.id = "ev-" + Date.now().toString(36);
                copy.title = it.title + "（コピー）";
                const arr = getAt(path).slice(); arr.push(copy); setAt(path, arr);
                state.open.add(`${listKey}.${arr.length - 1}`);
                rerender();
                toast("コピーを作りました。日付などを変更して「保存する」を押してください。");
              }
            }) : null,
            h("button", {
              type: "button", class: "button button--danger button--small", text: "削除する",
              onclick: () => {
                if (!confirm(`「${def.itemTitle(it, i)}」を削除しますか？\n（「保存する」を押すまでサイトには反映されません）`)) return;
                const arr = getAt(path).slice(); arr.splice(i, 1); setAt(path, arr);
                state.open.clear();
                rerender();
              }
            })
          )
        )
      );
      return details;
    }));

    const add = h("button", {
      type: "button", class: "button button--add", text: def.addLabel || "＋ 追加",
      onclick: () => {
        const arr = (getAt(path) || []).slice();
        arr.push(def.newItem());
        setAt(path, arr);
        state.open.add(`${listKey}.${arr.length - 1}`);
        rerender();
        const opened = document.querySelectorAll(".item[open]");
        const last = opened[opened.length - 1];
        if (last) { last.scrollIntoView({ behavior: "smooth", block: "center" }); const f = last.querySelector("input, textarea"); if (f) f.focus({ preventScroll: true }); }
      }
    });

    return h("div", null, items.length ? list : h("p", { class: "field-help", text: "まだ登録されていません。" }), h("div", { style: "margin-top:14px" }, add));
  }

  function move(path, i, dir) {
    const arr = getAt(path).slice();
    [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
    setAt(path, arr);
    state.open.clear();
  }

  function renderStrings(def, path) {
    const items = getAt(path) || [];
    const rows = items.map((v, i) => {
      const input = h("input", { type: "text", value: v, "aria-label": `${i + 1}つ目`, oninput: (e) => setAt(path.concat(i), e.target.value) });
      return h("div", { class: "string-row" }, input,
        h("button", {
          type: "button", class: "button button--danger button--small", text: "削除",
          onclick: () => { const arr = getAt(path).slice(); arr.splice(i, 1); setAt(path, arr); renderScreen(true); }
        }));
    });
    return h("div", { class: "list" }, rows,
      h("button", {
        type: "button", class: "button button--add", text: def.addLabel || "＋ 追加",
        onclick: () => { const arr = (getAt(path) || []).slice(); arr.push(""); setAt(path, arr); renderScreen(true); const ins = document.querySelectorAll(".string-row input"); ins[ins.length - 1].focus(); }
      }));
  }

  /* ---------- 画面 ---------- */
  function screenHead(sc) {
    return h("div", { class: "screen-head" },
      h("h1", { text: sc.sub ? `5つのテーマ：${sc.title}` : sc.title }),
      sc.view ? h("a", { class: "button button--ghost", href: sc.view, target: "_blank", rel: "noopener", text: "このページを見る ↗" }) : null,
      sc.lead ? h("p", { text: sc.lead }) : null);
  }

  function renderSections(sc) {
    return sc.sections.map((sec) => h("section", { class: "card" },
      h("h2", { text: sec.title }),
      sec.note ? h("p", { class: "card-note", text: sec.note }) : null,
      sec.fields.map((f) => renderField(f))));
  }

  function renderHome(sc) {
    const shortcuts = [
      ["events", "イベント", "追加・変更・削除"],
      ["gallery", "ギャラリー写真", "8枚の写真を差し替え"],
      ["voices", "参加者の声", "感想と写真"],
      ["faq", "よくある質問", "質問と回答"],
      ["pages/top", "トップページ", "見出し・文章・写真"],
      ["design", "フォント・文字の大きさ", "書体と大きさの変更"],
      ["settings", "LINE・Instagram", "リンク先の変更"]
    ];
    return [
      h("div", { class: "screen-head" }, h("h1", { text: "管理画面へようこそ" }),
        h("p", { text: "ホームページの文章や写真を、ここから変更できます。" })),
      h("section", { class: "card" },
        h("h2", { text: "変更のしかた" }),
        h("ol", { class: "steps" },
          h("li", null, h("span", { class: "step-num", text: "1" }), h("strong", { text: "場所を選ぶ" }), "左のメニュー（スマホは左上の「メニュー」）から、変更したい場所を選びます。"),
          h("li", null, h("span", { class: "step-num", text: "2" }), h("strong", { text: "文章や写真を変える" }), "文章は入力欄を直接書き換えます。写真は「写真を変える」を押して選びます。"),
          h("li", null, h("span", { class: "step-num", text: "3" }), h("strong", { text: "「保存する」を押す" }), "画面の一番下にあるボタンです。1〜2分ほどでサイトに反映されます。")
        )),
      h("section", { class: "card" },
        h("h2", { text: "よく使う場所" }),
        h("div", { class: "shortcut-grid" }, shortcuts.map(([id, t, s]) => h("a", { class: "shortcut", href: "#" + id }, t, h("small", { text: s }))))),
      h("div", { class: "notice" },
        h("p", { text: "保存する前なら、「変更を取り消す」でいつでも元に戻せます。複数の場所を変更して、最後にまとめて保存することもできます。" }))
    ];
  }

  /* ---------- フォント・文字の大きさ ---------- */
  const FONTS = window.LSF_FONTS || [];
  const SIZES = window.LSF_FONT_SIZES || [];
  const DEFAULT_DESIGN = window.LSF_DEFAULT_DESIGN || {};
  const SAMPLE_HEADING = "出会いで、これからの未来をつくる。";
  const SAMPLE_BODY = "新しい人・新しい経験・新しい自分に出会える福岡のコミュニティです。";
  const fontCss = (name) => {
    const f = FONTS.find((x) => x.name === name);
    return f ? `"${f.name}", ${f.generic}` : "inherit";
  };

  // 見本表示用に、候補のフォントを見本の文字だけ読み込む（軽くするため）
  let fontsLoaded = false;
  function loadPreviewFonts() {
    if (fontsLoaded || !FONTS.length) return;
    fontsLoaded = true;
    const chars = Array.from(new Set((SAMPLE_HEADING + SAMPLE_BODY + "見出し本文ボタン開催中のイベントを見るLife Shift FUK→").split(""))).join("");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?" + FONTS.map((f) => "family=" + f.query).join("&") + "&text=" + encodeURIComponent(chars) + "&display=swap";
    document.head.append(link);
  }

  function renderDesign(sc) {
    loadPreviewFonts();
    if (!state.draft.design) state.draft.design = clone(DEFAULT_DESIGN);
    const d = state.draft.design;
    const refresh = () => renderScreen(true);

    const fontPicker = (key, sample, groupName) => h("div", { class: "font-options", role: "radiogroup", "aria-label": groupName },
      FONTS.map((f) => h("label", { class: "font-option" },
        h("input", {
          type: "radio", name: key, value: f.name, checked: d[key] === f.name,
          onchange: () => { setAt(["design", key], f.name); refresh(); }
        }),
        h("span", { class: "font-option-sample", style: `font-family: ${fontCss(f.name)}`, text: sample }),
        h("span", { class: "font-option-label", text: f.label + (f.name === DEFAULT_DESIGN[key] ? "（今のデザイン）" : "") })
      )));

    const sizePicker = (key, groupName) => h("div", { class: "chips", role: "radiogroup", "aria-label": groupName },
      SIZES.map((sz) => h("label", { class: "chip" },
        h("input", {
          type: "radio", name: key, value: sz.value, checked: Number(d[key]) === sz.value,
          onchange: () => { setAt(["design", key], sz.value); refresh(); }
        }),
        sz.label)));

    const hs = Number(d.headingSize) || 1, bs = Number(d.bodySize) || 1;
    return [
      screenHead(sc),
      h("section", { class: "card" },
        h("h2", { text: "見本" }),
        h("p", { class: "card-note", text: "選んだフォントと大きさで、トップページの一番上がこのように表示されます。" }),
        h("div", { class: "design-preview" },
          h("p", { class: "design-preview-heading", style: `font-family:${fontCss(d.headingFont)}; font-size:${(30 * hs).toFixed(1)}px`, text: SAMPLE_HEADING }),
          h("p", { class: "design-preview-lead", style: `font-family:${fontCss(d.headingFont)}; font-size:${(17 * hs).toFixed(1)}px`, text: SAMPLE_BODY }),
          h("p", { class: "design-preview-body", style: `font-family:${fontCss(d.bodyFont)}; font-size:${(15 * bs).toFixed(1)}px`, text: "BBQ、ランチ会、ウォーキング、勉強会など、初めての方でも参加しやすいイベントを定期的に開催しています。" }),
          h("span", { class: "design-preview-button", style: `font-family:${fontCss(d.bodyFont)}; font-size:${(15 * bs).toFixed(1)}px`, text: "開催中のイベントを見る →" })
        )),
      h("section", { class: "card" },
        h("h2", { text: "見出し・紹介文のフォント" }),
        h("p", { class: "card-note", text: "大きな見出しや、各コーナーの紹介文に使われます。" }),
        fontPicker("headingFont", SAMPLE_HEADING, "見出し・紹介文のフォント")),
      h("section", { class: "card" },
        h("h2", { text: "メニュー・ボタン・本文のフォント" }),
        h("p", { class: "card-note", text: "メニュー、ボタン、イベントやよくある質問などの文章に使われます。" }),
        fontPicker("bodyFont", SAMPLE_BODY, "メニュー・ボタン・本文のフォント")),
      h("section", { class: "card" },
        h("h2", { text: "文字の大きさ" }),
        h("p", { class: "card-note", text: "スマホでも見やすいように、画面の幅に合わせて自動で調整されます。" }),
        h("div", { class: "field" }, h("span", { class: "field-label", text: "見出し・紹介文" }), sizePicker("headingSize", "見出し・紹介文の大きさ")),
        h("div", { class: "field" }, h("span", { class: "field-label", text: "メニュー・ボタン・本文" }), sizePicker("bodySize", "メニュー・ボタン・本文の大きさ"))),
      h("div", { class: "notice" },
        h("p", null, "元のデザインに戻したいときは ",
          h("button", {
            type: "button", class: "button button--ghost button--small", text: "標準に戻す",
            onclick: () => { setAt(["design"], clone(DEFAULT_DESIGN)); refresh(); }
          }),
          " を押してから「保存する」を押してください。"))
    ];
  }

  function renderGallery(sc) {
    const items = state.draft.gallery;
    while (items.length < 8) items.push({ image: "", alt: "" });
    return [
      screenHead(sc),
      h("section", { class: "card" },
        h("h2", { text: "写真（8枚）" }),
        h("p", { class: "card-note", text: "「写真を変える」を押して差し替えます。番号はサイトでの並び順（左上→下→右へ）です。" }),
        h("div", { class: "gallery-grid" }, items.slice(0, 8).map((g, i) =>
          h("div", { class: "gallery-slot" },
            h("h3", { text: `${i + 1}枚目` }),
            renderField(S.image("image", "写真", null, { maxSize: 1400 }), ["gallery", i]),
            renderField(S.text("alt", "写真の説明（任意）", "例：BBQで乾杯する様子"), ["gallery", i])
          ))))
    ];
  }

  function renderScreen(keepScroll) {
    const sc = SCREENS[state.screen];
    const main = $("#main");
    const y = window.scrollY;
    uid = 0;
    const content = sc.render ? sc.render(sc) : [screenHead(sc), ...renderSections(sc)];
    main.replaceChildren(h("div", { class: "screen" }, content));
    if (keepScroll) window.scrollTo(0, y);
  }

  function route() {
    const id = decodeURIComponent(location.hash.slice(1)) || "home";
    if (!SCREENS[id]) { location.hash = "#home"; return; }
    if (state.screen !== id) state.open.clear();
    state.screen = id;
    document.title = `${SCREENS[id].title}｜管理画面`;
    renderNav();
    renderScreen();
    window.scrollTo(0, 0);
    $("#app").classList.remove("is-menu-open");
    $("#menu-button").setAttribute("aria-expanded", "false");
    $("#main").focus({ preventScroll: true });
  }

  /* ---------- 保存 ---------- */
  const isDirty = () => JSON.stringify(state.draft) !== JSON.stringify(state.saved);

  function changed() {
    const dirty = isDirty();
    $("#savebar").classList.toggle("is-dirty", dirty);
    $("#save-status").textContent = dirty ? "まだ保存されていない変更があります" : "変更はありません";
    $("#save").disabled = !dirty;
    $("#discard").disabled = !dirty;
  }

  async function save() {
    const btn = $("#save");
    btn.disabled = true;
    btn.textContent = "保存しています…";
    try {
      const { sha } = await api("/content", { method: "PUT", body: JSON.stringify({ content: state.draft, sha: state.sha }) });
      state.sha = sha;
      state.saved = clone(state.draft);
      toast("保存しました。1〜2分ほどでサイトに反映されます。");
    } catch (e) {
      toast(e.message, true);
    } finally {
      btn.textContent = "保存する";
      changed();
    }
  }

  function discard() {
    if (!confirm("保存していない変更をすべて取り消して、元に戻しますか？")) return;
    state.draft = clone(state.saved);
    changed();
    renderScreen(true);
    toast("変更を取り消しました。");
  }

  /* ---------- ログイン ---------- */
  function showLogin() {
    $("#app").hidden = true;
    $("#login").hidden = false;
    $("#login-password").focus();
  }

  async function start() {
    const { content, sha } = await api("/content");
    if (!content.design) content.design = clone(window.LSF_DEFAULT_DESIGN || {});
    state.saved = content;
    state.draft = clone(content);
    state.sha = sha;
    $("#login").hidden = true;
    $("#app").hidden = false;
    changed();
    route();
  }

  async function logout() {
    if (isDirty() && !confirm("保存していない変更があります。ログアウトしますか？")) return;
    await api("/login", { method: "DELETE" }).catch(() => {});
    state.saved = state.draft = null;
    showLogin();
  }

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#login-error");
    err.hidden = true;
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "確認しています…";
    try {
      await api("/login", { method: "POST", body: JSON.stringify({ password: $("#login-password").value }) });
      $("#login-password").value = "";
      await start();
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = "ログイン";
    }
  });

  $("#toggle-password").addEventListener("click", (e) => {
    const input = $("#login-password");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    e.target.textContent = show ? "隠す" : "表示する";
  });

  $("#save").addEventListener("click", save);
  $("#discard").addEventListener("click", discard);
  $("#logout").addEventListener("click", logout);
  $("#menu-button").addEventListener("click", () => {
    const open = $("#app").classList.toggle("is-menu-open");
    $("#menu-button").setAttribute("aria-expanded", open);
  });
  // メニューの外を押したら閉じる（スマホ）
  $("#main").addEventListener("click", () => {
    $("#app").classList.remove("is-menu-open");
    $("#menu-button").setAttribute("aria-expanded", "false");
  });
  window.addEventListener("hashchange", () => { if (state.draft) route(); });
  window.addEventListener("beforeunload", (e) => {
    if (state.draft && isDirty()) { e.preventDefault(); e.returnValue = ""; }
  });

  // 起動
  api("/login").then(({ loggedIn }) => (loggedIn ? start() : showLogin())).catch((e) => {
    showLogin();
    const err = $("#login-error");
    err.textContent = e.message;
    err.hidden = false;
  });
})();
