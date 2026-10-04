// 保存先：GitHubリポジトリ（本番） / ローカルフォルダ（開発用）
// GitHubに保存すると、Vercelが自動でサイトを作り直して1〜2分で反映されます。
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

function config() {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!repo || !token) {
    throw Object.assign(new Error("GITHUB_REPO と GITHUB_TOKEN が設定されていません"), { status: 500 });
  }
  return { repo, token, branch };
}

async function github(method, filePath, body) {
  const { repo, token, branch } = config();
  const url = `https://api.github.com/repos/${repo}/contents/${filePath}` + (method === "GET" ? `?ref=${encodeURIComponent(branch)}` : "");
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "life-shift-fuk-admin",
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify({ ...body, branch }) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const status = res.status === 409 || res.status === 422 ? 409 : 502;
    throw Object.assign(new Error(`GitHub ${res.status}: ${data.message || "error"}`), { status });
  }
  return data;
}

const localDir = () => process.env.LOCAL_STORE_DIR;
const hash = (buf) => crypto.createHash("sha1").update(buf).digest("hex");

// ファイルを読む → { text, sha }
async function readFile(filePath) {
  if (localDir()) {
    const buf = await fs.readFile(path.join(localDir(), filePath));
    return { text: buf.toString("utf8"), sha: hash(buf) };
  }
  const data = await github("GET", filePath);
  return { text: Buffer.from(data.content, "base64").toString("utf8"), sha: data.sha };
}

// ファイルを書く（sha が違えば「他の人が先に保存した」として 409）
async function writeFile(filePath, buffer, { sha, message } = {}) {
  if (localDir()) {
    const full = path.join(localDir(), filePath);
    if (sha) {
      const current = await fs.readFile(full).catch(() => null);
      if (current && hash(current) !== sha) throw Object.assign(new Error("conflict"), { status: 409 });
    }
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, buffer);
    return { sha: hash(buffer) };
  }
  const data = await github("PUT", filePath, {
    message: message || `Update ${filePath} from admin`,
    content: Buffer.from(buffer).toString("base64"),
    ...(sha ? { sha } : {})
  });
  return { sha: data.content && data.content.sha };
}

module.exports = { readFile, writeFile };
