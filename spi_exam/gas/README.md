# 旧

# GAS 側

* WEBHOOK_SECRET をスクリプトプロパティに設定（強力なランダム値）

* doPost で SECRET を検証（未設定/changeme はエラーにする実装）

* Web アプリとしてデプロイ：
  実行ユーザー＝自分、アクセスできるユーザー＝（公開用途なら）全員（匿名含む）

  以下は **Google Apps Script（GAS）** の新規作成から、`スクリプト プロパティ` に **WEBHOOK_SECRET=changeme** を登録し、**ウェブアプリとしてデプロイ**→**変更後の再デプロイ**までの実務的な手順です。
（※本番運用では `changeme` を**十分に長い乱数文字列**へ必ず変更してください。）

---

# 新

## 0) プロジェクトを作成する

1. Google ドライブ → **新規** → **その他** → **Google Apps Script** をクリック（スタンドアロンの GAS プロジェクトが作成されます）。([Google for Developers][1])
   *（シート等に紐づけたい場合は、そのファイルから **拡張機能 → Apps Script** でも作成可能です。）([Google for Developers][1])

---

## 1) 最小コード（例：Webhook 受け口）

プロパティに置くシークレットを読み出して照合する最小例です（URL パラメータ `?secret=...` または JSON ボディ `{ "secret": "..." }` で渡す前提）。

```javascript
function doPost(e) {
  const SECRET = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET'); // 取得
  const bodyText = e.postData ? e.postData.contents : '';
  let payload = {};
  try { payload = bodyText ? JSON.parse(bodyText) : {}; } catch (err) {}
  const provided = (e.parameter && e.parameter.secret) || payload.secret || '';

  if (provided !== SECRET) {
    return ContentService.createTextOutput('NG'); // 認証失敗（GASは任意のHTTPステータスは返せません）
  }

  // ここにメイン処理
  return ContentService.createTextOutput('OK');
}

function doGet() {
  return ContentService.createTextOutput('alive');
}
```

> コードからスクリプト プロパティを読むには `PropertiesService.getScriptProperties().getProperty(...)` を使います。([Google for Developers][2])
> `doGet(e) / doPost(e)` の挙動や `e` オブジェクトの構造はウェブアプリの公式ドキュメントを参照してください。([Google for Developers][3])

---

## 2) `スクリプト プロパティ` を追加（WEBHOOK_SECRET）

1. エディタの左側 **歯車アイコン（プロジェクト設定）** を開く。
2. **スクリプト プロパティ → スクリプト プロパティを編集** をクリック。
3. **キー** に `WEBHOOK_SECRET`、**値** に `changeme` を入力し **保存**。
   *（後述のとおり **本番では必ず強い値へ変更**してください。）* ([Google for Developers][4])

> 以後、コードからは 1) のとおり `PropertiesService` で参照できます。([Google for Developers][2])

---

## 3) ウェブアプリとして **初回デプロイ**

1. 右上の **デプロイ** → **新しいデプロイ**。
2. **種類の選択（歯車アイコン）→「ウェブアプリ」** を選ぶ。
3. **説明**（例：`v1`）を入れ、

   * **実行するユーザー**：通常は *自分*（オーナー権限で実行）。
   * **アクセスできるユーザー**：外部サービスからの Webhook 受信なら *全員（匿名を含む）* を選びます（Google ログイン不要）。社内のみ等なら要件に合わせて選択。([Google for Developers][3])
4. **デプロイ** を押すと **公開 URL（/exec）** が発行されます。([Google for Developers][3])

### 開発用 URL（/dev）について

* **デプロイ → デプロイをテスト** から得られる URL は **/dev** で終わり、**編集権限のあるユーザーのみ**アクセス可能。**常に最新保存コード（HEAD）** を実行します。**本番公開には使いません。** ([Google for Developers][3])

---

## 4) コードを変更したら ― **新バージョンで再デプロイが必要**

> **重要**：共有している **/exec** の公開 URL は、**特定の「バージョン付きデプロイ」** に結び付いています。**エディタでコードを直しても、そのままでは公開 URL の実行コードは古いまま**です。**新しいバージョンをデプロイ**してはじめて、公開 URL から新コードが実行されます。([Google for Developers][5])

### 再デプロイ手順（URLを変えずに更新）

1. 右上の **デプロイ → デプロイを管理** を開く。
2. 既存の **ウェブアプリ** デプロイ行の **鉛筆（編集）** をクリック。
3. **バージョン**に新しい説明を書き、**デプロイ**。これで**同じ URL のまま**新しいコードに切り替わります（ユーザーは自動的に新バージョンを使用）。([Google for Developers][5])

> 逆に **毎回「新しいデプロイ」** を作ると**別の URL** が増えてしまうので、公開中の URL を保ちたいときは **「デプロイを管理 → 編集」で更新**してください。([make it easy][6])

---

## 5) 本番運用の小さなチェックリスト

* [ ] **WEBHOOK_SECRET を強い値**に変更（`changeme` のまま運用しない）。**プロジェクト設定 → スクリプト プロパティ**で更新可能。([Google for Developers][4])
* [ ] Webhook 連携なら **アクセスできるユーザー＝全員（匿名含む）** を検討。ログインを要求する場合は *Google アカウントを持つ全員*。([auto-worker.com][7])
* [ ] コード変更後は **デプロイを管理→編集→新バージョンでデプロイ**（URLを変えない）。([Google for Developers][5])
* [ ] 認可が必要なスコープを使う場合、初回アクセス時に承認が発生します（スコープ追加時も再承認）。([Google for Developers][8])

---

## 参考（公式ドキュメント）

* ウェブアプリとしてのデプロイ・権限・/dev URL の性質（公式）([Google for Developers][3])
* デプロイの仕組み（ヘッド vs バージョン付き、管理・編集・更新）([Google for Developers][5])
* スクリプト プロパティの編集手順（UI の場所・保存）([Google for Developers][4])
* `PropertiesService` リファレンス（取得 API）([Google for Developers][2])

必要なら、あなたのユースケース（受け取るペイロード形式や求める応答形式）に合わせた **認証・検証ロジック** や **デプロイ設定の具体案**まで落とし込みます。

[1]: https://developers.google.com/apps-script/guides/projects?hl=ja&utm_source=chatgpt.com "スクリプト プロジェクト | Apps Script"
[2]: https://developers.google.com/apps-script/reference/properties?hl=ja&utm_source=chatgpt.com "Properties Service | Apps Script"
[3]: https://developers.google.com/apps-script/guides/web?hl=ja "ウェブアプリ  |  Apps Script  |  Google for Developers"
[4]: https://developers.google.com/apps-script/guides/properties?hl=ja&utm_source=chatgpt.com "プロパティ サービス | Apps Script"
[5]: https://developers.google.com/apps-script/concepts/deployments?hl=ja "デプロイの作成と管理  |  Apps Script  |  Google for Developers"
[6]: https://ryjkmr.com/gas-web-app-deploy-new-same-url/?utm_source=chatgpt.com "GASのWebアプリでURLを変えずに新バージョンを公開する ..."
[7]: https://auto-worker.com/blog/?p=3565&utm_source=chatgpt.com "GASでウェブアプリケーション公開方法と実行・アクセス ..."
[8]: https://developers.google.com/apps-script/guides/services/authorization?hl=ja&utm_source=chatgpt.com "Google サービスの承認 | Apps Script"
