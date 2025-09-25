「Firebae Hosting」はおそらく **Firebase Hosting** のことですね。以下は、**静的サイト**（HTML/CSS/JS を配布するサイト）を Firebase Hosting に公開する最短手順です。公式ドキュメントの要点に沿ってまとめています。([Firebase][1])

---

## 0) 前提条件

* **Google アカウント**
* **Node.js v18 以上**（Firebase CLI の必須条件）([Firebase][2])
* （まだなら）**Firebase プロジェクト**を作成しておく。([Firebase][1])

---

## 1) Firebase CLI をインストール

下記いずれかで OK（どちらも同じ機能です）。

```bash
# npm でグローバルインストール
npm install -g firebase-tools

# あるいはワンライナー（macOS/Linux）
curl -sL https://firebase.tools | bash
```

> Node.js v18+ が必要です。([Firebase][2])

次にログイン＆動作確認：

```bash
firebase login
firebase projects:list
```

（ブラウザが開き、Google アカウントで認証します。）([Firebase][2])

---

## 2) プロジェクトを初期化（Hosting の設定）

公開したいプロジェクトの**ルート**ディレクトリで：

```bash
firebase init hosting
```

対話プロンプトで以下を選びます：

1. 既存の **Firebase プロジェクト** を選択
2. **公開ディレクトリ**（静的ファイルのある場所）を指定

   * 例：そのまま `public`、Vite などは `dist`、CRA は `build` など
3. SPA の場合は「**Single‑Page App として構成**」を選択（/index.html への rewrite を自動追加してくれます）

この操作で、`firebase.json` と `.firebaserc` が作成されます。([Firebase][1])

---

## 3) ローカルで確認（任意）

本番に出す前にローカルのエミュレータで表示確認できます。

```bash
firebase emulators:start --only hosting
```

ブラウザで `http://localhost:5000`（デフォルト）にアクセス。 ([Firebase][3])

---

## 4) デプロイ（公開）

準備できたら一発デプロイ：

```bash
firebase deploy --only hosting
```

完了すると、`PROJECT_ID.web.app` と `PROJECT_ID.firebaseapp.com` の 2 つのサブドメインで即時公開されます。([Firebase][1])

---

## 5) 任意の追加設定

### A. カスタムドメインをつなぐ（任意）

Firebase コンソールの Hosting 画面 → **Add custom domain** を実行し、ガイドに沿って DNS（A レコード等）を設定します。SSL 証明書は自動プロビジョニングされます（数時間～最大 24 時間）。([Firebase][4])

### B. プレビュー URL（レビュー用チャンネル）

本番とは別に「プレビュー用 URL」を作成できます。PR ごとの確認に便利です。

```bash
# 任意の名前でプレビュー・チャンネルを作成＆デプロイ
firebase hosting:channel:deploy my-feature
```

プレビューは自動期限付きの一時 URL になります。([Firebase][5])

### C. GitHub Actions で自動デプロイ（任意）

GitHub と連携して、push／PR 時に自動でプレビューや本番デプロイを走らせられます：

```bash
# まだ Hosting を未設定なら
firebase init hosting
# すでに Hosting 済みなら GitHub 連携だけ
firebase init hosting:github
```

CLI が GitHub Secrets の設定や workflow YAML を自動作成します。([Firebase][6])

---

## 6) よく使う `firebase.json` の最小例

### (1) ただの静的サイト

```json
{
  "hosting": {
    "public": "public",
    "ignore": ["**/.*", "**/node_modules/**"]
  }
}
```

> `public` に `index.html` があれば、そのまま配信されます。([Firebase][1])

### (2) SPA（すべてのパスを /index.html に）

`firebase init hosting` で SPA を選んだ場合は自動で入ります。未設定なら手動で：

```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

([Firebase][1])

### (3) キャッシュ制御（例）

ビルドでハッシュ付きファイルを出す場合、静的アセットだけ長期キャッシュ、HTML は都度取得にするのが定番です：

```json
{
  "hosting": {
    "public": "dist",
    "headers": [
      {
        "source": "**/*.@(js|css|png|jpg|svg|woff2?)",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      },
      {
        "source": "**/*.html",
        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
      }
    ]
  }
}
```

> `headers` の書式や `rewrites`/`redirects` は公式の「Hosting 設定リファレンス」を参照してください。([Firebase][7])

---

## 7) つまずきがちなポイント

* **公開ディレクトリが空／`index.html` がない** → 初期化時に指定したフォルダにファイルがあるか確認。([Firebase][1])
* **SPA でリロード時に 404** → `rewrites` で `/** → /index.html` を設定。([Firebase][1])
* **キャッシュが更新されない** → ハッシュ付きファイル名＋HTML は `no-cache` に。設定は `headers` で管理。([Firebase][7])

---

## 参考（公式）

* クイックスタート（最短手順：CLI インストール → init → deploy）([Firebase][1])
* Firebase CLI（インストール方法、Node v18+ 必須）([Firebase][2])
* エミュレータでのローカル検証（Hosting）([Firebase][3])
* プレビュー・チャンネルの管理（レビュー用 URL）([Firebase][5])
* カスタムドメインの接続手順（SSL 自動）([Firebase][4])
* GitHub Actions 連携（自動デプロイ）([Firebase][6])

---

必要なら、あなたの環境（フレームワークや公開ディレクトリ名）に合わせた **`firebase.json` の具体例** まで作ります。どのツール（素の HTML、Vite、React、Astro など）でビルドしているかだけ教えてください。

[1]: https://firebase.google.com/docs/hosting/quickstart?utm_source=chatgpt.com "Get started with Firebase Hosting"
[2]: https://firebase.google.com/docs/cli "Firebase CLI reference  |  Firebase Documentation"
[3]: https://firebase.google.com/docs/emulator-suite/use_hosting?utm_source=chatgpt.com "Prototype and test web apps with the Firebase Hosting Emulator"
[4]: https://firebase.google.com/docs/hosting/custom-domain?utm_source=chatgpt.com "Connect a custom domain | Firebase Hosting - Google"
[5]: https://firebase.google.com/docs/hosting/manage-hosting-resources?utm_source=chatgpt.com "Manage live & preview channels, releases, and versions for ..."
[6]: https://firebase.google.com/docs/hosting/github-integration?utm_source=chatgpt.com "Deploy to live & preview channels via GitHub pull requests"
[7]: https://firebase.google.com/docs/hosting/full-config?utm_source=chatgpt.com "Configure Hosting behavior - Firebase - Google"
