// GET /api/content → 現在の内容 / PUT /api/content { content, sha } → 保存
const { send, readJson, isAdminRequest } = require("./_lib/http");
const { isLoggedIn } = require("./_lib/auth");
const { readFile, writeFile } = require("./_lib/store");

const FILE = "content/site.json";
const KEYS = ["settings", "home", "about", "themes", "events", "gallery", "voices", "faq"];

// 保存前のチェック（壊れたデータや危険なリンクを保存しない）
function validate(content) {
  if (!content || typeof content !== "object" || Array.isArray(content)) throw new Error("内容の形式が正しくありません");
  for (const k of KEYS) if (!(k in content)) throw new Error(`「${k}」の項目がありません`);
  for (const k of ["events", "gallery", "voices", "faq"]) {
    if (!Array.isArray(content[k])) throw new Error(`「${k}」の形式が正しくありません`);
  }

  for (const key of ["lineUrl", "instagramUrl"]) {
    const url = (content.settings || {})[key];
    if (url && !/^https:\/\//.test(url)) throw new Error("リンクは https:// から始まるURLを入力してください");
  }

  // フォント・文字の大きさ（任意）
  if (content.design != null) {
    const d = content.design;
    if (typeof d !== "object" || Array.isArray(d)) throw new Error("フォントの設定が正しくありません");
    for (const k of ["headingFont", "bodyFont"]) {
      if (d[k] != null && !/^[A-Za-z0-9 ]{1,40}$/.test(d[k])) throw new Error("フォントの指定が正しくありません");
    }
    for (const k of ["headingSize", "bodySize"]) {
      if (d[k] != null && !(Number(d[k]) >= 0.8 && Number(d[k]) <= 1.4)) throw new Error("文字の大きさの指定が正しくありません");
    }
  }

  // 画像はサイト内の assets/ か https:// のみ
  const checkImages = (value) => {
    if (Array.isArray(value)) return value.forEach(checkImages);
    if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) {
        if (k === "image" && v && !/^(assets\/[\w\-./]+|https:\/\/\S+)$/.test(v)) throw new Error("画像の指定が正しくありません");
        checkImages(v);
      }
    }
  };
  checkImages(content);

  const ids = new Set();
  content.events.forEach((ev, i) => {
    if (!ev.title) throw new Error(`イベント${i + 1}件目のタイトルを入力してください`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.date || "")) throw new Error(`「${ev.title}」の開催日を入力してください`);
    if (!/^[a-z0-9-]+$/.test(ev.id || "") || ids.has(ev.id)) throw new Error(`「${ev.title}」の管理用IDが正しくありません`);
    ids.add(ev.id);
  });
}

module.exports = async (req, res) => {
  try {
    if (!isLoggedIn(req)) return send(res, 401, { error: "ログインしてください" });

    if (req.method === "GET") {
      const { text, sha } = await readFile(FILE);
      return send(res, 200, { content: JSON.parse(text), sha });
    }

    if (req.method === "PUT") {
      if (!isAdminRequest(req)) return send(res, 403, { error: "不正なリクエストです" });
      const { content, sha } = await readJson(req, 1024 * 1024);
      try {
        validate(content);
      } catch (e) {
        return send(res, 400, { error: e.message });
      }
      const body = Buffer.from(JSON.stringify(content, null, 2) + "\n", "utf8");
      const result = await writeFile(FILE, body, { sha, message: "管理画面からサイトの内容を更新" });
      return send(res, 200, { ok: true, sha: result.sha });
    }

    send(res, 405, { error: "Method Not Allowed" });
  } catch (e) {
    if (e.status === 409) return send(res, 409, { error: "ほかの人（または別の画面）が先に保存しました。画面を再読み込みしてから、もう一度変更してください。" });
    send(res, e.status || 500, { error: e.message });
  }
};
