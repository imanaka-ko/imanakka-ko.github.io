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

function getConfig_() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('REGISTER_SPREADSHEET_ID') || props.getProperty('SHEET_ID');
  const sheetName = props.getProperty('REGISTER_SHEET_NAME') || props.getProperty('SHEET_NAME') || 'registrations';

  if (!spreadsheetId) {
    throw new Error('Missing spreadsheet id. Set REGISTER_SPREADSHEET_ID in the script properties.');
  }

  return { spreadsheetId, sheetName };
}

function normalizeRecipients_(rawRecipients) {
  if (!rawRecipients) {
    return '';
  }
  if (Array.isArray(rawRecipients)) {
    return rawRecipients
      .map(function (value) {
        return String(value || '').trim();
      })
      .filter(function (value) {
        return value.length > 0;
      })
      .join(',');
  }
  if (typeof rawRecipients === 'string') {
    return rawRecipients.trim();
  }
  return '';
}

function buildRow_(payload) {
  var registration = payload && payload.registration ? payload.registration : {};
  var recipients = normalizeRecipients_(payload && payload.recipients);
  var values = [recipients];

  DEFAULT_FIELD_ORDER.forEach(function (field) {
    var value = registration[field];
    if (value === undefined || value === null) {
      values.push('');
    } else {
      values.push(String(value));
    }
  });

  return values;
}

function appendRow_(sheet, rowValues) {
  var lastColumn = sheet.getMaxColumns();
  if (rowValues.length > lastColumn) {
    sheet.insertColumnsAfter(lastColumn, rowValues.length - lastColumn);
  }
  sheet.appendRow(rowValues);
}

function ensureHeaderRow_(sheet) {
  var header = sheet.getRange(1, 1, 1, sheet.getMaxColumns()).getValues()[0];
  if (header && header[0]) {
    return;
  }

  var values = [RECIPIENT_FIELD_NAME].concat(DEFAULT_FIELD_ORDER);
  sheet.getRange(1, 1, 1, values.length).setValues([values]);
}

function parseRequestBody_(e) {
  if (!e) {
    return {};
  }
  if (e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (error) {
      Logger.log('Failed to parse JSON body: ' + error);
    }
  }
  var params = e.parameter || {};
  if (typeof params === 'string') {
    try {
      return JSON.parse(params);
    } catch (error) {
      Logger.log('Failed to parse string parameter body: ' + error);
    }
  }
  return params;
}

function doPost(e) {
  try {
    var config = getConfig_();
    var payload = parseRequestBody_(e);
    var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
    var sheet = spreadsheet.getSheetByName(config.sheetName) || spreadsheet.insertSheet(config.sheetName);

    ensureHeaderRow_(sheet);
    var row = buildRow_(payload);
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
