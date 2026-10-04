// POST /api/login  { password } → ログイン / GET → ログイン状態 / DELETE → ログアウト
const { send, readJson, isAdminRequest } = require("./_lib/http");
const { checkPassword, setLogin, clearLogin, isLoggedIn } = require("./_lib/auth");

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") return send(res, 200, { loggedIn: isLoggedIn(req) });

    if (!isAdminRequest(req)) return send(res, 403, { error: "不正なリクエストです" });

    if (req.method === "DELETE") {
      clearLogin(res);
      return send(res, 200, { ok: true });
    }

    if (req.method === "POST") {
      const { password } = await readJson(req, 10 * 1024);
      if (!password || !checkPassword(password)) {
        await new Promise((r) => setTimeout(r, 800)); // 総当たり対策で少し待たせる
        return send(res, 401, { error: "パスワードが違います" });
      }
      setLogin(res);
      return send(res, 200, { ok: true });
    }

    send(res, 405, { error: "Method Not Allowed" });
  } catch (e) {
    send(res, e.status || 500, { error: e.message });
  }
};
