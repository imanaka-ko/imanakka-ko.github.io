const SPREADSHEET_ID = 'REPLACE_WITH_SPREADSHEET_ID';
const SHEET_NAME = 'シート1';
const MAIL_SUBJECT = 'CSVデータ送付のお知らせ';
const MAIL_BODY = 'スプレッドシートの内容をCSVで送付します。';

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

    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    if (values.length <= 1) {
      return;
    }

    const headers = values[0];
    const rows = values.slice(1).filter(row => row.some(cell => cell !== '' && cell !== null));

    rows.forEach((row, index) => {
      const rawRecipients = row[0];
      if (!rawRecipients) {
        return;
      }

      const recipients = normalizeRecipients(rawRecipients);
      if (!recipients.length) {
        return;
      }

      const csvContent = buildCsv([headers, row]);
      const fileName = createCsvFileName(index + 1);
      const file = DriveApp.createFile(fileName, csvContent, MimeType.CSV);

      try {
        GmailApp.sendEmail(recipients.join(','), MAIL_SUBJECT, MAIL_BODY, {
          attachments: [file.getAs(MimeType.CSV)],
        });
      } finally {
        file.setTrashed(true);
      }
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
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = value.toString();
  if (/[",\n]/.test(stringValue)) {
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
