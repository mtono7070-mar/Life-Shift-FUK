// API共通の小さな道具（Vercel / ローカル開発サーバーの両方で動くように素のNode APIだけを使う）

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

async function readJson(req, limitBytes = 4 * 1024 * 1024) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) throw Object.assign(new Error("too large"), { status: 413 });
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

// 管理画面からの書き込みであることの確認（他サイトからの送信を防ぐ）
function isAdminRequest(req) {
  return req.headers["x-lsf-admin"] === "1";
}

module.exports = { send, readJson, isAdminRequest };
