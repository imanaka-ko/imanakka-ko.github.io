// --- 固有設定（ここをあなたの環境に合わせて書き換え） ---
const SPREADSHEET_ID = '1rX3JIzTZrMymRaX1LLfXGquHO1K3ye7EMUVuu2INKWU';   // /d/ と /edit の間
const SHEET_NAME = 'registrations';               // タブ名
const RECIPIENT_FIELD_NAME = 'Service Recipients';
const DEFAULT_FIELD_ORDER = [
  'lastName',
  'firstName',
  'lastKana',
  'firstKana',
  'region',
  'gender',
  'school',
  'schoolName',
  'faculty',
  'department',
  'gradYear',
  'email',
  'phone',
];

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
  const recipients = normalizeRecipients_(payload && payload.recipients);
  const values = [recipients];
  DEFAULT_FIELD_ORDER.forEach(field => {
    const value = registration[field];
    values.push(value == null ? '' : String(value));
  });
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
  const header = sheet.getRange(1, 1, 1, sheet.getMaxColumns()).getValues()[0];
  if (header && header[0]) return; // A1に何か入っていれば何もしない
  const values = [RECIPIENT_FIELD_NAME].concat(DEFAULT_FIELD_ORDER);
  sheet.getRange(1, 1, 1, values.length).setValues([values]);
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
