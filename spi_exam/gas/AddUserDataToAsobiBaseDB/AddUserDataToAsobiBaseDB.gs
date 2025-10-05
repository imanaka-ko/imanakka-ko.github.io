// Code.gs
const SHEET_ID   = '1VgWo7IYMjLDOooaj4YA7B60Bi7NmnRJX-E---FLG42Q';
const SHEET_NAME = 'user';
const TZ         = 'Asia/Tokyo';

function doPost(e) {
  try {
    const body = e.postData?.type === 'application/json'
      ? JSON.parse(e.postData.contents)
      : e.parameter; // form-encodedにも対応

    // シークレットチェック
    const SECRET = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
    if (body.secret !== SECRET) {
      return ContentService.createTextOutput(JSON.stringify({ ok:false, error:'forbidden' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    const fields = [
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
    const rowValues = fields.map((field) => {
      const value = body ? body[field] : '';
      return value != null ? value : '';
    });
    rowValues.push(Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'));
    sheet.appendRow(rowValues);

    return ContentService.createTextOutput(JSON.stringify({ ok:true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok:false, error:String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}