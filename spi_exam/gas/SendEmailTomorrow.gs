/** 宛先（A列）ごとに B列以降の行を集約したCSVを作成し、
 *  各宛先へは To、固定宛先は BCC で同報します（CCは未使用）。
 */
const CONFIG = {
  // ★ご指定どおり
  SPREADSHEET_ID: '1rX3JIzTZrMymRaX1LLfXGquHO1K3ye7EMUVuu2INKWU',
  SHEET_NAME: 'registrations',

  // メール内容
  EMAIL_SUBJECT: 'CSVデータ送付のお知らせ',
  EMAIL_BODY: 'スプレッドシートの内容をCSVで送付します。',

  // CSV生成
  USE_BOM: true,                   // Excel対策でBOM付与（UTF-8）
  DELIMITERS_REGEX: /[,\s;、\n]+/, // A列セルの区切り文字: カンマ/セミコロン/空白/改行/全角読点

  // 送信後の後処理
  CLEAR_AFTER_SEND: true,         // 送信後に2行目以降を消すなら true

  // ★固定宛先（常に BCC に入れます）
  FIXED_RECIPIENT: 'asobibase.imanaka.ko@gmail.com'
};

/** 既存トリガー互換（時間主導などから呼ばれる想定） */
function sendEmailTomorrow() { sendCsvPerRecipient(); }

/** エントリーポイント */
function sendCsvPerRecipient() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30 * 1000);
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sh = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sh) throw new Error(`シートが見つかりません: ${CONFIG.SHEET_NAME}`);

    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();
    if (lastRow < 2 || lastCol < 2) {
      Logger.log('送信対象データがありません。');
      return;
    }

    // 表示形式どおりに取得（見た目の文字列をCSV化）
    const values = sh.getRange(1, 1, lastRow, lastCol).getDisplayValues();

    // ヘッダー（B列以降）
    const header = values[0].slice(1);
    const dataRows = values.slice(1); // 2行目以降

    // 宛先ごとに行を集約
    const byRecipient = groupRowsByRecipient_(dataRows, header.length);

    const tz = Session.getScriptTimeZone();
    const stampFile = Utilities.formatDate(new Date(), tz, 'yyyyMMdd_HHmmss');

    let sentCount = 0;

    for (const [recipient, rows] of byRecipient.entries()) {
      if (!rows || rows.length === 0) continue;

      // CSV作成
      const csv = buildCsv_([header, ...rows], CONFIG.USE_BOM);
      const filename = `export_${sanitizeForFilename_(recipient)}_${stampFile}.csv`;
      const blob = Utilities.newBlob(csv, 'text/csv', filename);

      /** @type {GoogleAppsScript.Gmail.GmailSendOptions} */
      const options = { attachments: [blob] };

      // 固定宛先は BCC：To と同一なら BCC に入れない（重複防止）
      const fixed = (CONFIG.FIXED_RECIPIENT || '').trim();
      if (fixed && fixed.toLowerCase() !== recipient.toLowerCase()) {
        options.bcc = fixed;
      }

      GmailApp.sendEmail(recipient, CONFIG.EMAIL_SUBJECT, CONFIG.EMAIL_BODY, options);
      sentCount++;
      Logger.log(`Sent: To=${recipient}, BCC=${options.bcc || '(none)'}, rows=${rows.length}, file=${filename}`);
    }

    if (sentCount === 0) Logger.log('送信対象の受信者が見つかりませんでした。');

    if (CONFIG.CLEAR_AFTER_SEND) {
      // ヘッダーは残して2行目以降をクリア
      sh.getRange(2, 1, Math.max(0, lastRow - 1), lastCol).clearContent();
      Logger.log('データ行をクリアしました。');
    }
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/** 宛先ごとに行（B列以降）をグルーピング */
function groupRowsByRecipient_(rows, dataColCount) {
  const map = new Map(); // email -> rows(B..)

  rows.forEach(row => {
    const raw = String(row[0] || ''); // A列（宛先）
    const emails = splitEmails_(raw);
    if (emails.length === 0) return;

    // B列以降の1レコード（ヘッダー列数に合わせる）
    const record = row.slice(1, 1 + dataColCount);

    emails.forEach(email => {
      if (!map.has(email)) map.set(email, []);
      map.get(email).push(record);
    });
  });

  return map;
}

/** A列セルを分割し、正規化＋重複除去＋簡易バリデーション */
function splitEmails_(text) {
  const out = [];
  const seen = new Set();
  String(text)
    .split(CONFIG.DELIMITERS_REGEX)
    .map(s => s.trim())
    .filter(Boolean)
    .forEach(addr => {
      const key = addr.toLowerCase();
      if (seen.has(key)) return;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return; // 簡易チェック
      seen.add(key);
      out.push(addr);
    });
  return out;
}

/** CSV 文字列生成（BOMの有無は引数で制御） */
function buildCsv_(rows, useBom) {
  const body = rows.map(cols => cols.map(csvEscape_).join(',')).join('\r\n');
  return (useBom ? '\uFEFF' : '') + body;
}

/** CSVセルのエスケープ */
function csvEscape_(v) {
  if (v == null) return '';
  const s = String(v);
  const needsQuote = /[",\r\n]/.test(s);
  const esc = s.replace(/"/g, '""');
  return needsQuote ? `"${esc}"` : esc;
}

/** ファイル名に使えない文字を置換 */
function sanitizeForFilename_(s) {
  return String(s).replace(/[^A-Za-z0-9._-]/g, '_');
}
