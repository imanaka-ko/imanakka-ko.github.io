const DEFAULT_MAIL_SETTINGS = Object.freeze({
  recipient: 'daniel.valencia.student@gmail.com',
  subject: '[自動送信] 会員登録データ',
  message: '会員登録フォームから送信されたデータをCSVでお送りします。',
  filename: 'registration.csv',
  useBom: true,
  timeZone: 'Asia/Tokyo',
});

const REGISTRATION_FIELDS = Object.freeze([
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
  'createdAt',
]);

function exportCsvAndMail(registrationData, overrides) {
  const config = Object.assign({}, DEFAULT_MAIL_SETTINGS, overrides || {});
  const recipients = normalizeRecipients_(
    'recipients' in config ? config.recipients : config.recipient
  );
  if (recipients.length === 0) {
    throw new Error('送信先のメールアドレスが設定されていません。');
  }

  const normalizedRegistration = normalizeRegistrationData_(registrationData);
  const attachment = buildCsvAttachment_(normalizedRegistration, config);

  const recipientString = recipients.join(',');
  MailApp.sendEmail({
    to: recipientString,
    subject: config.subject,
    body: config.message,
    attachments: [attachment],
  });

  Logger.log('送信完了: ' + recipientString);

  return {
    recipients,
    attachmentCount: 1,
  };
}

function doGet(e) {
  return runExportCsvAndMail_(e);
}

function doPost(e) {
  return runExportCsvAndMail_(e);
}

function runExportCsvAndMail_(e) {
  const payload = parseRequestPayload_(e);
  const params = (e && e.parameter) || {};
  const overrides = {};

  const recipientSource =
    payload.recipients ??
    payload.recipient ??
    params.recipients ??
    params.recipient;
  if (recipientSource) {
    overrides.recipients = recipientSource;
  }

  if (payload.subject) {
    overrides.subject = payload.subject;
  }
  if (payload.message) {
    overrides.message = payload.message;
  }
  if (payload.filename) {
    overrides.filename = payload.filename;
  }
  if (payload.timeZone) {
    overrides.timeZone = payload.timeZone;
  }
  if (payload.useBom !== undefined) {
    overrides.useBom = payload.useBom;
  }

  const registrationData =
    payload.registration ??
    payload.registrationData ??
    payload.userData ??
    payload.data ??
    params.registration ??
    params.registrationData ??
    params.userData;

  try {
    const result = exportCsvAndMail(registrationData, overrides) || {};
    const recipientsForResponse =
      result.recipients && result.recipients.length > 0
        ? result.recipients
        : normalizeRecipients_(
            overrides.recipients || DEFAULT_MAIL_SETTINGS.recipient
          );

    return ContentService.createTextOutput(
      JSON.stringify({
        status: 'ok',
        recipients: recipientsForResponse,
        recipient: recipientsForResponse.join(','),
        attachments: result.attachmentCount || 0,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('エラー: ' + (error && error.stack ? error.stack : error));
    return ContentService.createTextOutput(
      JSON.stringify({
        status: 'error',
        message: error && error.message ? error.message : String(error),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function buildCsvAttachment_(registrationData, config) {
  const timeZone = config.timeZone || DEFAULT_MAIL_SETTINGS.timeZone || Session.getScriptTimeZone();
  const headerRow = REGISTRATION_FIELDS;
  const dataRow = REGISTRATION_FIELDS.map((field) => {
    if (field === 'createdAt') {
      return Utilities.formatDate(new Date(), timeZone, 'yyyy-MM-dd HH:mm:ss');
    }
    const value = registrationData[field];
    return value != null ? String(value) : '';
  });

  const csv = toCsv_([headerRow, dataRow]);
  const useBom = coerceBoolean_(
    'useBom' in config ? config.useBom : DEFAULT_MAIL_SETTINGS.useBom,
    DEFAULT_MAIL_SETTINGS.useBom
  );
  const content = (useBom ? '\uFEFF' : '') + csv;
  const filename = config.filename || DEFAULT_MAIL_SETTINGS.filename;

  return Utilities.newBlob(content, 'text/csv', filename);
}

function toCsv_(data) {
  return data
    .map((row) =>
      row
        .map((cell) => {
          const s = cell == null ? '' : String(cell);
          const needQuote = /[",\r\n]/.test(s);
          const escaped = s.replace(/"/g, '""');
          return needQuote ? `"${escaped}"` : escaped;
        })
        .join(',')
    )
    .join('\r\n');
}

function parseRequestPayload_(e) {
  if (!e || !e.postData || typeof e.postData.contents !== 'string') {
    return (e && e.parameter) || {};
  }

  const params = (e && e.parameter) || {};
  const contents = e.postData.contents;
  if (!contents) {
    return params;
  }

  try {
    const parsed = JSON.parse(contents);
    if (parsed && typeof parsed === 'object') {
      return Object.assign({}, params, parsed);
    }
  } catch (error) {
    // ignore and fall back to params
  }

  return params;
}

function normalizeRegistrationData_(registrationData) {
  const data = coerceRegistrationData_(registrationData);
  if (!data) {
    throw new Error('会員登録データが渡されていません。');
  }
  return data;
}

function coerceRegistrationData_(value) {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? coerceRegistrationData_(value[0]) : null;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }
  if (typeof value === 'object') {
    return value;
  }
  return null;
}

function parseRecipientParam_(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.reduce(
      (acc, item) => acc.concat(parseRecipientParam_(item)),
      []
    );
  }
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeRecipients_(value) {
  const rawList = parseRecipientParam_(value);
  const seen = new Set();
  const normalized = [];
  rawList.forEach((address) => {
    if (!seen.has(address)) {
      seen.add(address);
      normalized.push(address);
    }
  });
  return normalized;
}

function coerceBoolean_(value, defaultValue) {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return !/^(false|0|no)$/i.test(value);
  }
  return Boolean(value);
}
