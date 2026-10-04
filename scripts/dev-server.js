// ローカル確認用サーバー（Vercelを使わずに管理画面を試せます）
//   ADMIN_PASSWORD=test node scripts/dev-server.js
// 保存した内容は .local-store/ に書き込まれ、サイト表示にも反映されます。
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const STORE = process.env.LOCAL_STORE_DIR || path.join(ROOT, ".local-store");
process.env.LOCAL_STORE_DIR = STORE;
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "test";

// 初回は現在の content/site.json をコピー
const storeContent = path.join(STORE, "content/site.json");
if (!fs.existsSync(storeContent)) {
  fs.mkdirSync(path.dirname(storeContent), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "content/site.json"), storeContent);
}

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const m = url.pathname.match(/^\/api\/(\w+)$/);
  if (m) {
    const file = path.join(ROOT, "api", m[1] + ".js");
    if (!fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
    return require(file)(req, res);
  }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith("/")) p += "index.html";
  // 保存済みの内容・アップロード画像を優先して返す
  const found = [STORE, ROOT]
    .map((dir) => [dir, path.join(dir, p)])
    .filter(([dir, f]) => f.startsWith(dir + path.sep))
    .map(([, f]) => f)
    .find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
  if (!found) { res.statusCode = 404; return res.end("Not found"); }
  res.setHeader("Content-Type", TYPES[path.extname(found)] || "application/octet-stream");
  fs.createReadStream(found).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log(`http://localhost:${process.env.PORT || 3000}/  (admin: /admin/  password: ${process.env.ADMIN_PASSWORD})`));
