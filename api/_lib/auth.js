// 管理画面のログイン（パスワード → 署名付きCookie）
const crypto = require("crypto");

const COOKIE = "lsf_admin";
const MAX_AGE = 60 * 60 * 24 * 7; // 7日間ログインしたまま

function secret() {
  const s = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!s) throw Object.assign(new Error("ADMIN_PASSWORD が設定されていません"), { status: 500 });
  return s;
}

function sign(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function checkPassword(input) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw Object.assign(new Error("ADMIN_PASSWORD が設定されていません"), { status: 500 });
  // 長さの違いで判定時間が変わらないようにハッシュ同士を比べる
  const h = (v) => crypto.createHash("sha256").update(String(v)).digest("hex");
  return safeEqual(h(input), h(expected));
}

function cookieHeader(value, maxAge) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function setLogin(res) {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  res.setHeader("Set-Cookie", cookieHeader(`${exp}.${sign(exp)}`, MAX_AGE));
}

function clearLogin(res) {
  res.setHeader("Set-Cookie", cookieHeader("", 0));
}

function isLoggedIn(req) {
  const raw = req.headers.cookie || "";
  const m = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [exp, sig] = m[1].split(".");
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Date.now() / 1000;
}

module.exports = { checkPassword, setLogin, clearLogin, isLoggedIn };
