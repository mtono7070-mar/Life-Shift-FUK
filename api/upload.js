// POST /api/upload { data: "data:image/jpeg;base64,..." } → { path: "assets/uploads/....jpg" }
// 画像は管理画面側で縮小してから送られてきます。
const crypto = require("crypto");
const { send, readJson, isAdminRequest } = require("./_lib/http");
const { isLoggedIn } = require("./_lib/auth");
const { writeFile } = require("./_lib/store");

const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 3 * 1024 * 1024;

module.exports = async (req, res) => {
  try {
    if (!isLoggedIn(req)) return send(res, 401, { error: "ログインしてください" });
    if (req.method !== "POST") return send(res, 405, { error: "Method Not Allowed" });
    if (!isAdminRequest(req)) return send(res, 403, { error: "不正なリクエストです" });

    const { data } = await readJson(req, 4.4 * 1024 * 1024);
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(data || "");
    if (!m) return send(res, 400, { error: "JPEG・PNG・WebPの画像を選んでください" });

    const buf = Buffer.from(m[2], "base64");
    if (buf.length > MAX_BYTES) return send(res, 413, { error: "画像が大きすぎます（3MBまで）" });

    const d = new Date();
    const stamp = d.toISOString().slice(0, 10).replace(/-/g, "");
    const name = `${stamp}-${crypto.randomBytes(4).toString("hex")}.${TYPES[m[1]]}`;
    const filePath = `assets/uploads/${name}`;
    await writeFile(filePath, buf, { message: `管理画面から画像を追加 (${name})` });
    send(res, 200, { ok: true, path: filePath });
  } catch (e) {
    send(res, e.status || 500, { error: e.message });
  }
};
