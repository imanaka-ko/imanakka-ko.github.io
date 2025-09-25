### 重要ポイント

* **SECRET をフロントに置かない**（本関数がサーバ側で付与）
* **CORS** は Lambda でヘッダーを返し、**API Gateway でも CORS を有効化**しておくとプリフライトがゲートウェイで処理され、安定します（後述）。
* 依存ライブラリは標準ライブラリのみ（`requests` 不要）なので**ZIP なしのインライン編集でもOK**。

---

## API Gateway（HTTP API 推奨）の設定

1. **HTTP API を作成**

   * ルート：`POST /api/submit`（統合先：上の Lambda）
   * **CORS を有効化**

     * Allowed origins：`http://127.0.0.1:3000`, `http://localhost:3000`, `https://yourdomain.com`
     * Allowed methods：`POST`
     * Allowed headers：`Content-Type`
   * ステージをデプロイ（例：`prod`）

2. **Lambda 環境変数を設定**

   * `SERVER_SECRET`：GAS 側 `WEBHOOK_SECRET` と同じ強力なランダム値（**`changeme` 禁止**）
   * `GAS_URL`：`https://script.google.com/macros/s/…/exec`
   * `ALLOWED_ORIGINS`：`http://127.0.0.1:3000,https://yourdomain.com`
   * （任意）`DEFAULT_ORIGIN`：上記に該当しない場合に返す既定オリジン

> Secrets Manager / SSM パラメータストアを使ってもOKです。まずは環境変数で可。

3. **GAS 側（再掲）**

   * `WEBHOOK_SECRET` をスクリプトプロパティに設定（強力なランダム値）
   * `doPost` で `SECRET` を検証（未設定/`changeme` はエラーにする実装）
   * Web アプリとしてデプロイ：
     実行ユーザー＝自分、アクセスできるユーザー＝（公開用途なら）**全員（匿名含む）**

---

## フロント（例：静的サイト/S3 + CloudFront）

```js
// API Gateway の URL に向けて JSON POST（secretは送らない）
await fetch('https://<apigw-id>.execute-api.<region>.amazonaws.com/prod/api/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, message })
}).then(r => r.json()).then(({ ok, error }) => {
  alert(ok ? '送信しました' : ('失敗: ' + (error || 'unknown')));
});
```

---

## よくあるハマりどころ

* **CORS プリフライトが 403/404**：API Gateway 側の CORS を有効化（HTTP API だと GUI で一発）。
  もしくは `OPTIONS /api/submit` を Lambda に通す構成でも、上記ハンドラーが 204 を返せます。
* **SERVER_SECRET が未設定/`changeme`**：本 Lambda は **500** を返して書き込みしません（意図どおり）。
* **GAS 側 403**：Webアプリの「アクセスできるユーザー」が適切か、`doPost` の secret 検証に失敗していないかを確認。

---

## まとめ

* **ソースは Firebase 専用なのでそのまま使えません。**
* 上の **Python Lambda** に置き換えれば、**AWS 版（Lambda + API Gateway）**で
  **CORS 安定 / SECRET 非公開 / GAS への安全中継**が実現できます。
* `changeme` 対策は **未設定・既定値なら即エラー**で防止済みです。

必要なら、**API Gateway（HTTP API）作成～Lambda 連携**までのコンソール操作をスクショ順で書き起こします。
