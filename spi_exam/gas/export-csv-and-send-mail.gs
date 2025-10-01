function exportCsvAndMail() {
  // ===== 設定 =====
  const SEARCH_TEXT = '売上';                 // ファイル名に含める検索文字列
  const RECIPIENT = 'daniel.valencia.student@gmail.com';        // 送信先
  const SUBJECT = '[自動送信] CSVエクスポート';
  const MESSAGE = '対象のスプレッドシートをCSV化して添付しました。';
  const RESTRICT_FOLDER_ID = '1IfiStSoRiw4jFkG6wUfSk1MsU6hMjdlx';              // 特定フォルダに限定する場合はIDをセット（空なら全ドライブ）
  const EXPORT_ALL_SHEETS = false;            // true: 各ファイルの全シートをCSV化 / false: 1枚だけ
  const SHEET_NAME = 'user';                      // ここに名前を入れるとそのシートのみ。空なら先頭シート
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
