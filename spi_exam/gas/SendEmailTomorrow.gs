const SPREADSHEET_ID = '1rX3JIzTZrMymRaX1LLfXGquHO1K3ye7EMUVuu2INKWU';
const SHEET_NAME = 'registrations';
const MAIL_SUBJECT = 'CSVデータ送付のお知らせ';
const MAIL_BODY = 'スプレッドシートの内容をCSVで送付します。';
const FIXED_RECIPIENT = 'macy.yamakawayuzu@gmail.com';
const USE_BOM = true; // true: Excelでの文字化け防止にBOM付与

function sendEmailWithCsvPerRow() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error('Could not obtain script lock.');
  }

  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = SHEET_NAME ? spreadsheet.getSheetByName(SHEET_NAME) : spreadsheet.getActiveSheet();
    if (!sheet) {
      throw new Error('指定されたシートが見つかりません。');
    }

    // 見た目の表示どおりで出したい場合は getDisplayValues() に変更してください。
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    if (values.length <= 1) {
      return;
    }

    const headers = values[0];
    const rows = values.slice(1).filter(row => row.some(cell => cell !== '' && cell !== null));

    rows.forEach((row, index) => {
      const rawRecipients = row[0]; // A列に送信先アドレス
      if (!rawRecipients) return;

      const recipients = normalizeRecipients(rawRecipients);
      if (!recipients.length) return;

      const allRecipients = [...recipients, FIXED_RECIPIENT];

      // ==== ここから：Blobで直接添付 ====
      // 必要に応じてBOMを付与（Excel対策）
      const csvBody = buildCsv([headers, row]);
      const csvContent = (USE_BOM ? '\uFEFF' : '') + csvBody;

      const fileName = createCsvFileName(index + 1);
      const blob = Utilities.newBlob(csvContent, 'text/csv', fileName);

      GmailApp.sendEmail(allRecipients.join(','), MAIL_SUBJECT, MAIL_BODY, {
        attachments: [blob],
      });
      // ==== ここまで：一時ファイルを作らない ====
    });

    clearSheetData(sheet);
  } finally {
    lock.releaseLock();
  }
}

function normalizeRecipients(rawRecipients) {
  return rawRecipients
    .toString()
    .split(/[\n,;\s]+/)
    .map(address => address.trim())
    .filter(address => address);
}

function buildCsv(rows) {
  return rows
    .map(columns => columns.map(escapeCsvValue).join(','))
    .join('\r\n');
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const stringValue = value.toString();
  // 改行は \n だけでなく \r も考慮
  if (/[",\r\n]/.test(stringValue)) {
    return '"' + stringValue.replace(/"/g, '""') + '"';
  }
  return stringValue;
}

function createCsvFileName(index) {
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  return `row-${index}_${timestamp}.csv`;
}

function clearSheetData(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, lastColumn).clearContent();
  }
}
