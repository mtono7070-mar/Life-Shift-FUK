# 管理画面の公開手順（Vercel）

ホームページと管理画面（`/admin`）を Vercel で公開するための手順です。最初に一度だけ行います。所要時間は20分ほどです。

## 仕組み

1. 管理画面で文章や写真を変更して「保存する」を押す
2. 変更内容が GitHub のリポジトリ（`content/site.json` と `assets/uploads/`）に保存される
3. Vercel が変更に気づいてサイトを作り直し、1〜2分でホームページに反映される

データベースは使いません。変更の履歴はすべて GitHub に残るので、間違えて保存しても元に戻せます。

---

## 手順1：GitHub のアクセス用トークンを作る

管理画面が GitHub に保存するための「合い鍵」を作ります。

1. GitHub にログインし、右上のアイコン →「Settings」を開く
2. 左メニューの一番下「Developer settings」→「Personal access tokens」→「Fine-grained tokens」
3. 「Generate new token」を押す
4. 次のように入力する
   - **Token name**：`life-shift-fuk-admin`
   - **Expiration**：`No expiration`（または1年。期限が切れたら作り直して手順3の値を差し替えます）
   - **Repository access**：「Only select repositories」→ `mtono7070-mar/Life-Shift-FUK` を選ぶ
   - **Permissions** →「Repository permissions」→「Contents」を **Read and write** にする
5. 「Generate token」を押し、表示された `github_pat_...` で始まる文字列をコピーしておく（この画面を閉じると二度と表示されません）

## 手順2：Vercel にサイトを登録する

1. https://vercel.com/signup を開き、「Continue with GitHub」で登録（無料の Hobby プランで大丈夫です）
2. ダッシュボードの「Add New…」→「Project」
3. 一覧から `Life-Shift-FUK` の「Import」を押す（表示されない場合は「Adjust GitHub App Permissions」からこのリポジトリを許可）
4. 設定画面で次のとおりにする
   - **Framework Preset**：`Other`
   - **Build Command / Output Directory**：空のまま
5. まだ「Deploy」は押さずに、同じ画面の「Environment Variables」を開いて手順3へ

## 手順3：環境変数を設定する

「Environment Variables」に、次の4つを1つずつ追加します。

| Name（名前） | Value（値） |
| --- | --- |
| `ADMIN_PASSWORD` | 管理画面のログインパスワード（12文字以上の推測されにくいもの） |
| `GITHUB_TOKEN` | 手順1でコピーした `github_pat_...` |
| `GITHUB_REPO` | `mtono7070-mar/Life-Shift-FUK` |
| `GITHUB_BRANCH` | Vercel が公開に使うブランチ名（下の注意を参照） |

> **GITHUB_BRANCH について**
> 現在このリポジトリのブランチは `claude/homepage-header-creation-izndmk` の1つだけで、これが公開に使われます。
> そのため値は `claude/homepage-header-creation-izndmk` にしてください。
> あとで `main` ブランチに切り替えた場合は、Vercel の「Settings」→「Git」→「Production Branch」と、この値の両方を `main` に変更します。

追加できたら「Deploy」を押します。1分ほどで `https://life-shift-fuk-xxxx.vercel.app` のようなURLが発行されます。

あとから環境変数を変えたときは、「Deployments」→ 一番上の「…」→「Redeploy」を押すと反映されます。

## 手順4：管理画面を開く

発行されたURLの最後に `/admin/` を付けて開きます。

```
https://（発行されたURL）/admin/
```

`ADMIN_PASSWORD` に設定したパスワードでログインできれば完了です。ブックマークしておくと便利です。

---

## 困ったとき

| 表示されるメッセージ | 原因と対処 |
| --- | --- |
| ADMIN_PASSWORD が設定されていません | 手順3の環境変数を確認し、「Redeploy」する |
| GITHUB_REPO と GITHUB_TOKEN が設定されていません | 同上 |
| GitHub 401 / 403 / 404 | トークンの期限切れ、または権限（Contents: Read and write）や対象リポジトリの設定ミス。手順1で作り直す |
| ほかの人が先に保存しました | 別の人や別のタブで先に保存されています。画面を再読み込みしてから、もう一度変更してください |
| 保存したのにサイトが変わらない | 反映まで1〜2分かかります。少し待ってから、ページを再読み込みしてください |

## 独自ドメインを使う場合

Vercel の「Settings」→「Domains」でドメインを追加し、画面の案内に従ってドメイン会社側の DNS を設定します。

## 手元で動作を確認する（開発者向け）

```
ADMIN_PASSWORD=test node scripts/dev-server.js
```

http://localhost:3000/admin/ をパスワード `test` で開けます。保存した内容は `.local-store/` に書き込まれ、GitHub には送られません。
