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


はい、可能です。
下のサンプルは **Google Apps Script** だけで、以下を自動化します。

* ドライブ内で、**ファイル名に特定の文字列を含む Google スプレッドシート**を検索
* （必要なら特定フォルダに限定）
* 各ファイルの **先頭シート／指定シート／全シート** を **CSV** に変換
* CSV を 1 通のメールに **添付**して送付（任意で ZIP 1 つにまとめる）

---

## スクリプト（貼り付けてそのまま動きます）

```javascript
function exportCsvAndMail() {
  // ===== 設定 =====
  const SEARCH_TEXT = '売上';                 // ファイル名に含める検索文字列
  const RECIPIENT = 'you@example.com';        // 送信先
  const SUBJECT = '[自動送信] CSVエクスポート';
  const MESSAGE = '対象のスプレッドシートをCSV化して添付しました。';
  const RESTRICT_FOLDER_ID = '';              // 特定フォルダに限定する場合はIDをセット（空なら全ドライブ）
  const EXPORT_ALL_SHEETS = false;            // true: 各ファイルの全シートをCSV化 / false: 1枚だけ
  const SHEET_NAME = '';                      // ここに名前を入れるとそのシートのみ。空なら先頭シート
  const ZIP_ATTACHMENTS = false;              // true: すべてのCSVをZIP 1 つにまとめて添付
  const USE_BOM = true;                       // true: Excelでの文字化け防止にBOM付与
  // =================

  const attachments = [];

  // Driveの検索クエリ（Googleスプレッドシート & タイトルに文字列を含む）
  const query =
    'title contains "' + escapeForQuery_(SEARCH_TEXT) +
    '" and mimeType = "application/vnd.google-apps.spreadsheet"';

  const iterator = RESTRICT_FOLDER_ID
    ? DriveApp.getFolderById(RESTRICT_FOLDER_ID).searchFiles(query)
    : DriveApp.searchFiles(query);

  let found = 0;
  while (iterator.hasNext()) {
    const file = iterator.next();
    found++;
    const ss = SpreadsheetApp.openById(file.getId());

    // 対象シートの決定
    const targetSheets = (() => {
      if (EXPORT_ALL_SHEETS) return ss.getSheets();
      if (SHEET_NAME) {
        const s = ss.getSheetByName(SHEET_NAME);
        return s ? [s] : [];
      }
      return [ss.getSheets()[0]]; // デフォルトは先頭シート
    })();

    if (targetSheets.length === 0) {
      Logger.log('シート未検出のためスキップ: ' + file.getName());
      continue;
    }

    // CSV化して添付用Blobを作成
    targetSheets.forEach(sheet => {
      const values = sheet.getDataRange().getDisplayValues(); // 表示値をCSV化
      const csv = toCsv_(values);
      const prefix = sanitizeFilename_(file.getName());
      const sname  = sanitizeFilename_(sheet.getName());
      const name   = prefix + '_' + sname + '.csv';
      const content = (USE_BOM ? '\uFEFF' : '') + csv; // 必要ならBOM付与
      const blob = Utilities.newBlob(content, 'text/csv', name);
      attachments.push(blob);
    });
  }

  if (found === 0) {
    Logger.log('一致するスプレッドシートがありません: "' + SEARCH_TEXT + '"');
    return;
  }
  if (attachments.length === 0) {
    Logger.log('出力対象のシートがありませんでした。');
    return;
  }

  // 必要に応じてZIP化
  const finalAttachments = ZIP_ATTACHMENTS
    ? [Utilities.zip(
        attachments,
        'csv_export_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '.zip'
      )]
    : attachments;

  // メール送信
  MailApp.sendEmail({
    to: RECIPIENT,
    subject: SUBJECT,
    body: MESSAGE,
    attachments: finalAttachments
  });

  Logger.log('送信完了: ' + RECIPIENT + ' / 添付ファイル数: ' + finalAttachments.length);
}

// 2次元配列 -> CSV文字列
function toCsv_(data) {
  return data.map(row =>
    row.map(cell => {
      const s = cell == null ? '' : String(cell);
      const needQuote = /[",\r\n]/.test(s);
      const escaped   = s.replace(/"/g, '""');
      return needQuote ? `"${escaped}"` : escaped;
    }).join(',')
  ).join('\r\n');
}

// Drive検索クエリ用エスケープ
function escapeForQuery_(s) {
  return String(s).replace(/["\\]/g, '\\$&');
}

// 添付ファイル名に使えない文字を置換
function sanitizeFilename_(s) {
  return String(s).replace(/[\\\/:*?"<>|]/g, '_');
}
```

---

## 使い方

1. Google ドライブで **拡張機能 → Apps Script**（または [script.new](https://script.new)）を開く
2. そのまま上記コードを貼り付け、**設定欄**の各値（`SEARCH_TEXT`, `RECIPIENT` など）を用途に合わせて編集
3. `exportCsvAndMail` を実行（初回のみ権限承認が必要）
4. 定期実行したい場合は **トリガー** で時間主導トリガーを追加

   * 例：毎朝 9:00 に自動送信

   ```javascript
   function createTrigger_() {
     ScriptApp.newTrigger('exportCsvAndMail').timeBased().everyDays(1).atHour(9).create();
   }
   ```

---

## 実装のポイント・注意事項

* **対象ファイル**：Google スプレッドシート（`application/vnd.google-apps.spreadsheet`）のみを検索します。Excel（.xlsx）ファイルは対象外です。必要なら事前に Google スプレッドシートへ変換してください。
* **どのシートをCSV化するか**：

  * 既定は**先頭シート**
  * `SHEET_NAME` を指定すればそのシートのみ
  * `EXPORT_ALL_SHEETS = true` で**全シート**をそれぞれCSVに
* **文字化け対策**：`USE_BOM = true` で UTF-8 BOM を付与しています（日本語 Excel での文字化け回避）。
* **サイズ制限**：Gmail は **25MB/通** まで。添付が多い／大きい場合は `ZIP_ATTACHMENTS = true` を推奨。
* **検索範囲の限定**：`RESTRICT_FOLDER_ID` にフォルダIDを入れれば、そのフォルダ配下だけを対象にできます（フォルダURLの `folders/` 以降がID）。
* **表示値でのエクスポート**：`getDisplayValues()` を使っているため、数式は**計算後の見た目の値**でCSV化されます（書式に依存する日付などもその表示どおり）。

---

必要に応じて、検索条件の追加（例：更新日の条件）や、本文を HTML にする（`GmailApp.sendEmail` を使う）などの拡張も可能です。
要件に合わせてカスタマイズ版を作ることもできますので、もし細かい仕様（対象フォルダ、シート名のルール、送信先の振り分けなど）があれば教えてください。

