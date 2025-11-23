// --- 固有設定（ここをあなたの環境に合わせて書き換え） ---
const SPREADSHEET_ID = '1k7THmSbStr7yo-Eg8DACk-X5kAJXoIJhXy8ImVNZcYg';   // /d/ と /edit の間
const SHEET_NAME = 'registrations';               // タブ名
const RECIPIENT_FIELD_NAME = 'Service Recipients';
const FIXED_RECIPIENTS = 'r.matsui@kokoshiro.co.jp,g.fukuda@kokoshiro.co.jp,kokoshiro.import1@gmail.com';
const DEFAULT_FIELD_ORDER = [
  'lastName',
  'firstName',
  'lastKana',
  'firstKana',
  'region',
  'gender',
  'schoolName',
  'faculty',
  'department',
  'gradYear',
  'email',
  'phone',
];
const TZ = 'Asia/Tokyo';
const TIMESTAMP_HEADER = 'timestamp';

// --- 以下は通常変更不要 ---
function getConfig_() {
  return { spreadsheetId: SPREADSHEET_ID, sheetName: SHEET_NAME };
}

function normalizeRecipients_(rawRecipients) {
  if (!rawRecipients) return '';
  if (Array.isArray(rawRecipients)) {
    return rawRecipients
      .map(v => String(v || '').trim())
      .filter(v => v.length > 0)
      .join(',');
  }
  if (typeof rawRecipients === 'string') return rawRecipients.trim();
  return '';
}

function buildRow_(payload) {
  const registration = (payload && payload.registration) ? payload.registration : {};
  const values = [FIXED_RECIPIENTS];
  DEFAULT_FIELD_ORDER.forEach(field => {
    const value = registration[field];
    values.push(value == null ? '' : String(value));
  });
  values.push(Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'));
  return values;
}

function appendRow_(sheet, rowValues) {
  const lastColumn = sheet.getMaxColumns();
  if (rowValues.length > lastColumn) {
    sheet.insertColumnsAfter(lastColumn, rowValues.length - lastColumn);
  }
  sheet.appendRow(rowValues);
}

function ensureHeaderRow_(sheet) {
  const values = [RECIPIENT_FIELD_NAME]
    .concat(DEFAULT_FIELD_ORDER)
    .concat([TIMESTAMP_HEADER]);
  const requiredColumns = values.length;
  const maxColumns = sheet.getMaxColumns();
  if (requiredColumns > maxColumns) {
    sheet.insertColumnsAfter(maxColumns, requiredColumns - maxColumns);
  }
  const headerRange = sheet.getRange(1, 1, 1, requiredColumns);
  const header = headerRange.getValues()[0];
  const shouldUpdate = values.some((value, index) => header[index] !== value);
  if (shouldUpdate) {
    headerRange.setValues([values]);
  }
}

function parseRequestBody_(e) {
  if (!e) return {};
  if (e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (err) {}
  }
  const params = e.parameter || {};
  if (typeof params === 'string') {
    try { return JSON.parse(params); } catch (err) {}
  }
  return params;
}

function doPost(e) {
  try {
    const { spreadsheetId, sheetName } = getConfig_();
    const payload = parseRequestBody_(e);
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);

    ensureHeaderRow_(sheet);
    const row = buildRow_(payload);
    appendRow_(sheet, row);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Failed to append registration row: ' + error);
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput('alive');
}
