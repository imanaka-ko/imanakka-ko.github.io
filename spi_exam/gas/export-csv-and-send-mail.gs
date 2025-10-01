const DEFAULT_EXPORT_SETTINGS = Object.freeze({
  searchText: '売上',                                  // ファイル名に含める検索文字列
  recipient: 'daniel.valencia.student@gmail.com',      // 送信先（未指定時）
  subject: '[自動送信] CSVエクスポート',
  message: '対象のスプレッドシートをCSV化して添付しました。',
  restrictFolderId: '1IfiStSoRiw4jFkG6wUfSk1MsU6hMjdlx', // 特定フォルダに限定する場合はIDをセット（空なら全ドライブ）
  exportAllSheets: false,                              // true: 各ファイルの全シートをCSV化 / false: 1枚だけ
  sheetName: 'user',                                   // ここに名前を入れるとそのシートのみ。空なら先頭シート
  zipAttachments: false,                               // true: すべてのCSVをZIP 1 つにまとめて添付
  useBom: true                                         // true: Excelでの文字化け防止にBOM付与
});

function exportCsvAndMail(overrides) {
  const config = Object.assign({}, DEFAULT_EXPORT_SETTINGS, overrides || {});
  const attachments = [];

  // Driveの検索クエリ（Googleスプレッドシート & タイトルに文字列を含む）
  const query =
    'title contains "' + escapeForQuery_(config.searchText) +
    '" and mimeType = "application/vnd.google-apps.spreadsheet"';

  const iterator = config.restrictFolderId
    ? DriveApp.getFolderById(config.restrictFolderId).searchFiles(query)
    : DriveApp.searchFiles(query);

  let found = 0;
  while (iterator.hasNext()) {
    const file = iterator.next();
    found++;
    const ss = SpreadsheetApp.openById(file.getId());

    // 対象シートの決定
    const targetSheets = (() => {
      if (config.exportAllSheets) return ss.getSheets();
      if (config.sheetName) {
        const s = ss.getSheetByName(config.sheetName);
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
      const content = (config.useBom ? '\uFEFF' : '') + csv; // 必要ならBOM付与
      const blob = Utilities.newBlob(content, 'text/csv', name);
      attachments.push(blob);
    });
  }

  if (found === 0) {
    Logger.log('一致するスプレッドシートがありません: "' + config.searchText + '"');
    return null;
  }
  if (attachments.length === 0) {
    Logger.log('出力対象のシートがありませんでした。');
    return null;
  }

  // 必要に応じてZIP化
  const finalAttachments = config.zipAttachments
    ? [Utilities.zip(
        attachments,
        'csv_export_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '.zip'
      )]
    : attachments;

  // メール送信
  MailApp.sendEmail({
    to: config.recipient,
    subject: config.subject,
    body: config.message,
    attachments: finalAttachments
  });

  Logger.log('送信完了: ' + config.recipient + ' / 添付ファイル数: ' + finalAttachments.length);

  return {
    recipient: config.recipient,
    attachmentCount: finalAttachments.length
  };
}

function doGet(e) {
  return runExportCsvAndMail_(e);
}

function doPost(e) {
  return runExportCsvAndMail_(e);
}

function runExportCsvAndMail_(e) {
  const params = (e && e.parameter) || {};
  const overrides = {};

  if (params.recipient) {
    overrides.recipient = params.recipient;
  }

  try {
    const result = exportCsvAndMail(overrides) || {};
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      recipient: result.recipient || overrides.recipient || DEFAULT_EXPORT_SETTINGS.recipient,
      attachments: result.attachmentCount || 0
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('エラー: ' + (error && error.stack ? error.stack : error));
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error && error.message ? error.message : String(error)
    })).setMimeType(ContentService.MimeType.JSON);
  }
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
