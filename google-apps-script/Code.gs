/**
 * Thairath Step Up & Health Up — v2.4 Google Sheets Backend
 * Deploy as Web App: Execute as Me / Who has access: Anyone.
 */

const CONFIG = {
  SPREADSHEET_ID: '1YgxxKpP74EkzfzAJn2wnTXamrYJ9-aBZsKwcBo7v3Dk',
  EMPLOYEE_SHEET: 'Employees',
  LOG_SHEET: 'StepLogs',
  TIMEZONE: 'Asia/Bangkok',
  WEEKLY_TARGET: 7000,
  OCR_AUTO_VERIFY_MIN_CONFIDENCE: 60,
  SUBMISSION_GRACE_DAYS: 21,
  EVIDENCE_ROOT_FOLDER_ID: '1aA_KkQN8Q-x8XPO_LrCLxlKXEGNH4g4R'
};

// Keep all original employee columns in their existing positions. buId is appended at the end.
const EMPLOYEE_HEADERS = [
  'employeeId', 'password', 'dateOfBirth', 'name', 'Surename', 'nickname',
  'departmentId', 'weekTarget', 'totalTickets', 'email', 'status', 'createdAt',
  'updatedAt', 'lastLoginAt', 'lastSubmitAt', 'buId'
];

// Keep the original 20 StepLogs columns in place. Organisation snapshots are appended.
const LOG_HEADERS = [
  'id', 'userEmail', 'employeeId', 'date', 'steps', 'week', 'weekOfMonth',
  'imageName', 'submittedAt', 'createdAt', 'updatedAt', 'imageFileId', 'imageUrl',
  'ocrText', 'ocrSteps', 'ocrConfidence', 'verificationStatus', 'reviewNote',
  'reviewedBy', 'reviewedAt', 'buIdAtSubmission', 'departmentIdAtSubmission'
];

const CAMPAIGN_WEEKS = [
  { month: 1, week: 1, startDate: '2026-07-01', endDate: '2026-07-10' },
  { month: 1, week: 2, startDate: '2026-07-11', endDate: '2026-07-17' },
  { month: 1, week: 3, startDate: '2026-07-18', endDate: '2026-07-24' },
  { month: 1, week: 4, startDate: '2026-07-25', endDate: '2026-07-31' },
  { month: 2, week: 1, startDate: '2026-08-01', endDate: '2026-08-07' },
  { month: 2, week: 2, startDate: '2026-08-08', endDate: '2026-08-14' },
  { month: 2, week: 3, startDate: '2026-08-15', endDate: '2026-08-21' },
  { month: 2, week: 4, startDate: '2026-08-22', endDate: '2026-08-28' },
  { month: 3, week: 1, startDate: '2026-08-29', endDate: '2026-09-04' },
  { month: 3, week: 2, startDate: '2026-09-05', endDate: '2026-09-11' },
  { month: 3, week: 3, startDate: '2026-09-12', endDate: '2026-09-18' },
  { month: 3, week: 4, startDate: '2026-09-19', endDate: '2026-09-25' },
  { month: 4, week: 1, startDate: '2026-09-26', endDate: '2026-10-02' },
  { month: 4, week: 2, startDate: '2026-10-03', endDate: '2026-10-09' },
  { month: 4, week: 3, startDate: '2026-10-10', endDate: '2026-10-16' },
  { month: 4, week: 4, startDate: '2026-10-17', endDate: '2026-10-23' },
  { month: 4, week: 5, startDate: '2026-10-24', endDate: '2026-10-30' },
  { month: 5, week: 1, startDate: '2026-10-31', endDate: '2026-11-06' },
  { month: 5, week: 2, startDate: '2026-11-07', endDate: '2026-11-13' },
  { month: 5, week: 3, startDate: '2026-11-14', endDate: '2026-11-20' },
  { month: 5, week: 4, startDate: '2026-11-21', endDate: '2026-11-27' },
  { month: 6, week: 1, startDate: '2026-11-28', endDate: '2026-12-04' },
  { month: 6, week: 2, startDate: '2026-12-05', endDate: '2026-12-11' }
];

function doGet() {
  setup_();
  return json_({ ok: true, data: { service: 'thairath-step-up-v2.4-backend', ready: true } });
}

function doPost(e) {
  try {
    setup_();
    const body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    validateProxySecret_(body);
    const action = String(body.action || '');
    const adminContext = body._adminContext || null;

    switch (action) {
      case 'setup':
        syncWeeklyTarget_();
        return json_({ ok: true, data: { ready: true, weeklyTarget: CONFIG.WEEKLY_TARGET } });
      case 'verifyLogin':
        return json_({ ok: true, data: verifyLogin_(body.employeeId, body.password, Number(body.currentMonth) || 1) });
      case 'getUserProfile':
        return json_({ ok: true, data: getUserProfile_(body.idOrEmail) });
      case 'saveUserProfile':
        saveUserProfile_(body.idOrEmail, body.profile, body.password, false);
        return json_({ ok: true, data: { saved: true } });
      case 'adminSaveUserProfile':
        requireAdmin_(adminContext);
        adminSaveUserProfile_(body.idOrEmail, body.profile, body.password, adminContext);
        return json_({ ok: true, data: { saved: true } });
      case 'fetchUserLogs':
        return json_({ ok: true, data: fetchUserLogs_(body.userKey) });
      case 'saveUserLog':
        return json_({ ok: true, data: saveUserLog_(body.userKey, body.log) });
      case 'reviewUserLog':
        requireAdmin_(adminContext);
        return json_({ ok: true, data: reviewUserLog_(body.logId, body.verificationStatus, body.reviewNote, adminContext) });
      case 'deleteUserLog':
        requireAdmin_(adminContext);
        deleteUserLog_(body.logId, adminContext);
        return json_({ ok: true, data: { deleted: true } });
      case 'calculateLeaderboard':
        return json_({ ok: true, data: calculateLeaderboard_(Number(body.currentMonth) || 1, Boolean(body.forceRefresh)) });
      case 'fetchAllUsers':
        requireAdmin_(adminContext);
        return json_({ ok: true, data: filterUsersForAdmin_(fetchAllUsers_(), adminContext) });
      case 'fetchAllStepLogs':
        requireAdmin_(adminContext);
        return json_({ ok: true, data: filterLogsForAdmin_(fetchAllStepLogs_(), adminContext) });
      default:
        return json_({ ok: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return json_({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function validateProxySecret_(body) {
  const configured = PropertiesService.getScriptProperties().getProperty('APP_PROXY_SECRET');
  if (configured && String(body._proxySecret || '') !== configured) {
    throw new Error('Unauthorized proxy request');
  }
}

function requireAdmin_(context) {
  if (!context || !context.displayName) throw new Error('Admin session is required');
}

function adminCanAccessBU_(context, buId) {
  const allowed = context && Array.isArray(context.allowedBUIds) ? context.allowedBUIds.map(normalizeText_) : [];
  return allowed.indexOf('all') >= 0 || allowed.indexOf(normalizeText_(buId)) >= 0;
}

function ss_() {
  const propertyId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  const id = propertyId || CONFIG.SPREADSHEET_ID;
  if (id) return SpreadsheetApp.openById(id);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('Spreadsheet not found. Set Script Property SHEET_ID.');
  return active;
}

function setup_() {
  ensureSheet_(CONFIG.EMPLOYEE_SHEET, EMPLOYEE_HEADERS);
  ensureSheet_(CONFIG.LOG_SHEET, LOG_HEADERS);
}

function ensureSheet_(sheetName, headers) {
  const ss = ss_();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  const width = Math.max(sheet.getLastColumn(), headers.length);
  const existing = sheet.getRange(1, 1, 1, width).getValues()[0];
  headers.forEach(function(header, index) {
    if (!existing[index]) sheet.getRange(1, index + 1).setValue(header);
  });
  sheet.setFrozenRows(1);
  return sheet;
}

function readObjects_(sheetName, headers) {
  const sheet = ensureSheet_(sheetName, headers);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values.filter(function(row) {
    return row.some(function(cell) { return cell !== '' && cell !== null; });
  }).map(function(row, index) {
    return rowToObject_(row, index + 2, headers);
  });
}

function rowToObject_(row, rowNumber, headers) {
  const obj = { _row: rowNumber };
  headers.forEach(function(header, index) { obj[header] = row[index]; });
  return obj;
}

function findRow_(sheetName, headers, predicate) {
  const rows = readObjects_(sheetName, headers);
  return rows.find(predicate) || null;
}

function findEmployeeByKey_(idOrEmail) {
  const key = normalizeText_(idOrEmail);
  if (!key) return null;
  const sheet = ensureSheet_(CONFIG.EMPLOYEE_SHEET, EMPLOYEE_HEADERS);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  // Employee login is filtered from the first step: search only ID/email columns, then read one row.
  const columns = [EMPLOYEE_HEADERS.indexOf('employeeId') + 1, EMPLOYEE_HEADERS.indexOf('email') + 1];
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    const finder = sheet.getRange(2, column, lastRow - 1, 1).createTextFinder(String(idOrEmail).trim()).matchEntireCell(true);
    const found = finder.findNext();
    if (found) {
      const rowNumber = found.getRow();
      const values = sheet.getRange(rowNumber, 1, 1, EMPLOYEE_HEADERS.length).getValues()[0];
      return rowToObject_(values, rowNumber, EMPLOYEE_HEADERS);
    }
  }
  return null;
}

function normalizeId_(value) { return String(value || '').trim(); }
function normalizeText_(value) { return String(value || '').trim().toLowerCase(); }
function number_(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
function now_() { return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX"); }
function toIsoDate_(date) { return date ? Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy-MM-dd') : ''; }
function average_(values) {
  const valid = (values || []).map(Number).filter(function(value) { return Number.isFinite(value); });
  return valid.length ? Math.round(valid.reduce(function(sum, value) { return sum + value; }, 0) / valid.length) : 0;
}

function migrateWeeklyTargetTo7000() { setup_(); syncWeeklyTarget_(); }

function syncWeeklyTarget_() {
  const sheet = ensureSheet_(CONFIG.EMPLOYEE_SHEET, EMPLOYEE_HEADERS);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const targetColumn = EMPLOYEE_HEADERS.indexOf('weekTarget') + 1;
  const range = sheet.getRange(2, targetColumn, lastRow - 1, 1);
  range.setValues(range.getValues().map(function() { return [CONFIG.WEEKLY_TARGET]; }));
}

function parseBirthDate_(value, passwordFallback) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) return value;
  const raw = String(value || '').trim();
  if (!raw && passwordFallback) return parseBirthDate_(passwordFallback, '');
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parts = raw.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const separated = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/);
  if (separated) return dateFromDmy_(Number(separated[1]), Number(separated[2]), Number(separated[3]));
  if (/^\d{8}$/.test(raw)) return dateFromDmy_(Number(raw.slice(0, 2)), Number(raw.slice(2, 4)), Number(raw.slice(4, 8)));
  if (/^\d{6}$/.test(raw)) return dateFromDmy_(Number(raw.slice(0, 2)), Number(raw.slice(2, 4)), Number(raw.slice(4, 6)));
  return null;
}

function dateFromDmy_(day, month, year) {
  if (!day || !month || !year) return null;
  const currentYear = new Date().getFullYear();
  const candidates = [];
  if (year < 100) {
    candidates.push(2500 + year - 543, 2400 + year - 543, 1900 + year, 2000 + year);
  } else if (year > 2400) {
    candidates.push(year - 543);
  } else {
    candidates.push(year);
  }
  const valid = candidates.map(function(y) { return new Date(y, month - 1, day); }).filter(function(date) {
    return !isNaN(date.getTime()) && date.getDate() === day && date.getMonth() === month - 1;
  }).sort(function(a, b) {
    const ageA = currentYear - a.getFullYear();
    const ageB = currentYear - b.getFullYear();
    return (ageA >= 15 && ageA <= 80 ? 0 : 1) - (ageB >= 15 && ageB <= 80 ? 0 : 1);
  });
  return valid[0] || null;
}

function calculateAge_(date) {
  if (!date) return '';
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const month = today.getMonth() - date.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < date.getDate())) age--;
  return age;
}

function passwordFromBirthDate_(date) {
  if (!date) return '';
  return Utilities.formatDate(date, CONFIG.TIMEZONE, 'ddMM') + String(date.getFullYear() + 543).slice(-2);
}

function employeeToProfile_(row) {
  if (!row) return null;
  const birthDate = parseBirthDate_(row.dateOfBirth, row.password);
  const employeeId = normalizeId_(row.employeeId);
  const nickname = String(row.nickname || '').trim();
  const firstName = String(row.name || '').trim();
  const surname = String(row.Surename || '').trim();
  return {
    name: [firstName, surname].filter(Boolean).join(' ').trim() || (nickname ? 'คุณ' + nickname : 'พนักงาน'),
    surname: surname,
    nickname: nickname,
    buId: normalizeId_(row.buId) || 'UNASSIGNED',
    departmentId: normalizeId_(row.departmentId) || 'UNASSIGNED',
    weekTarget: CONFIG.WEEKLY_TARGET,
    totalTickets: number_(row.totalTickets, 0),
    email: String(row.email || (employeeId ? employeeId + '@thairathgroup.com' : '')).trim(),
    employeeId: employeeId,
    age: calculateAge_(birthDate),
    dateOfBirth: toIsoDate_(birthDate),
    lastLoginAt: String(row.lastLoginAt || '').trim(),
    lastSubmitAt: String(row.lastSubmitAt || '').trim()
  };
}

function recordLastLogin_(employeeRow) {
  if (!employeeRow || !employeeRow._row) return;
  const sheet = ensureSheet_(CONFIG.EMPLOYEE_SHEET, EMPLOYEE_HEADERS);
  sheet.getRange(employeeRow._row, EMPLOYEE_HEADERS.indexOf('lastLoginAt') + 1).setValue(now_());
}

function updateEmployeeTimestamp_(employeeId, headerName, value) {
  const employee = findEmployeeByKey_(employeeId);
  if (!employee) return;
  const column = EMPLOYEE_HEADERS.indexOf(headerName) + 1;
  if (column > 0) ensureSheet_(CONFIG.EMPLOYEE_SHEET, EMPLOYEE_HEADERS).getRange(employee._row, column).setValue(value || '');
}

function verifyLogin_(employeeId, password, currentMonth) {
  const cleanId = normalizeId_(employeeId);
  const cleanPassword = normalizeId_(password);
  if (!/^\d{6}$/.test(cleanId)) throw new Error('รหัสพนักงานต้องเป็นตัวเลข 6 หลัก');
  if (!/^\d{6}$/.test(cleanPassword)) throw new Error('รหัสผ่านวันเกิดต้องเป็นตัวเลข 6 หลัก');
  const row = findEmployeeByKey_(cleanId);
  if (!row) throw new Error('ไม่พบรหัสพนักงานนี้ในฐานข้อมูล กรุณาติดต่อ HR/Admin');
  if (normalizeText_(row.status || 'Active') !== 'active') throw new Error('รหัสพนักงานนี้ยังไม่ได้เปิดสิทธิ์ใช้งาน');
  const birthDate = parseBirthDate_(row.dateOfBirth, row.password);
  const expectedPassword = normalizeId_(row.password) || passwordFromBirthDate_(birthDate);
  if (expectedPassword && expectedPassword !== cleanPassword) throw new Error('รหัสผ่านวันเดือนปีเกิดไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');

  recordLastLogin_(row);
  const refreshed = findEmployeeByKey_(cleanId) || row;
  const profile = employeeToProfile_(refreshed);
  return {
    profile: profile,
    requiresSetup: !profile.nickname,
    logs: fetchUserLogs_(cleanId),
    leaderboard: calculateLeaderboard_(currentMonth)
  };
}

function getUserProfile_(idOrEmail) {
  return employeeToProfile_(findEmployeeByKey_(idOrEmail));
}

function saveUserProfile_(idOrEmail, profile, password, allowOrgChange) {
  if (!profile) throw new Error('Missing profile payload');
  const employeeId = normalizeId_(profile.employeeId || idOrEmail);
  if (!/^\d{6}$/.test(employeeId)) throw new Error('รหัสพนักงานต้องเป็นตัวเลข 6 หลัก');
  const sheet = ensureSheet_(CONFIG.EMPLOYEE_SHEET, EMPLOYEE_HEADERS);
  const existing = findEmployeeByKey_(employeeId);
  if (!existing && !allowOrgChange) throw new Error('ไม่พบข้อมูลพนักงาน ไม่อนุญาตให้สร้างบัญชีจากหน้า User');

  const submittedBirthDate = parseBirthDate_(profile.dateOfBirth, password);
  const birthDateValue = allowOrgChange
    ? (submittedBirthDate ? toIsoDate_(submittedBirthDate) : (existing ? existing.dateOfBirth : ''))
    : (existing ? existing.dateOfBirth : '');
  const passwordValue = allowOrgChange
    ? (normalizeId_(password) || (submittedBirthDate ? passwordFromBirthDate_(submittedBirthDate) : (existing ? existing.password : '')))
    : (existing ? existing.password : '');
  const createdAt = existing ? existing.createdAt : now_();
  const buId = allowOrgChange ? normalizeId_(profile.buId) : normalizeId_(existing && existing.buId);
  const departmentId = allowOrgChange ? normalizeId_(profile.departmentId) : normalizeId_(existing && existing.departmentId);
  const rowValues = [
    employeeId,
    passwordValue,
    birthDateValue,
    allowOrgChange ? (profile.name || (existing ? existing.name : '')) : existing.name,
    allowOrgChange ? (profile.surname || profile.Surename || (existing ? existing.Surename : '')) : existing.Surename,
    profile.nickname || (existing ? existing.nickname : ''),
    departmentId || 'UNASSIGNED',
    CONFIG.WEEKLY_TARGET,
    allowOrgChange ? number_(profile.totalTickets, existing ? existing.totalTickets : 0) : number_(existing.totalTickets, 0),
    allowOrgChange ? (profile.email || (existing ? existing.email : employeeId + '@thairathgroup.com')) : existing.email,
    existing ? (existing.status || 'Active') : 'Active',
    createdAt,
    now_(),
    existing ? String(existing.lastLoginAt || '') : '',
    existing ? String(existing.lastSubmitAt || '') : '',
    buId || 'UNASSIGNED'
  ];
  if (existing) sheet.getRange(existing._row, 1, 1, EMPLOYEE_HEADERS.length).setValues([rowValues]);
  else sheet.appendRow(rowValues);
  invalidateLeaderboardCache_();
}

function adminSaveUserProfile_(idOrEmail, profile, password, adminContext) {
  if (!profile) throw new Error('Missing profile payload');
  const existing = findEmployeeByKey_(profile.employeeId || idOrEmail);
  if (existing && !adminCanAccessBU_(adminContext, existing.buId || 'UNASSIGNED')) {
    throw new Error('ไม่มีสิทธิ์แก้ไขพนักงานใน BU เดิม');
  }
  const targetBuId = normalizeId_(profile.buId) || 'UNASSIGNED';
  if (!adminCanAccessBU_(adminContext, targetBuId)) {
    throw new Error('ไม่มีสิทธิ์บันทึกพนักงานเข้า BU นี้');
  }
  saveUserProfile_(idOrEmail, profile, password, true);
}

function fetchAllUsers_() {
  return readObjects_(CONFIG.EMPLOYEE_SHEET, EMPLOYEE_HEADERS).map(function(row) {
    const profile = employeeToProfile_(row);
    return Object.assign({
      id: profile.employeeId,
      status: row.status || 'Active',
      rawDepartmentId: normalizeId_(row.departmentId),
      rawBuId: normalizeId_(row.buId)
    }, profile);
  });
}

function filterUsersForAdmin_(users, context) {
  return users.filter(function(user) { return adminCanAccessBU_(context, user.buId); });
}

function normalizeVerificationStatus_(value) {
  const status = String(value || '').trim().toUpperCase();
  return ['AUTO_VERIFIED', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED'].indexOf(status) >= 0 ? status : 'NEEDS_REVIEW';
}

function isVerifiedStatus_(value) {
  const status = normalizeVerificationStatus_(value);
  return status === 'AUTO_VERIFIED' || status === 'APPROVED';
}

function determineInitialVerificationStatus_(steps, ocrSteps, ocrConfidence) {
  const entered = number_(steps, 0);
  const detected = number_(ocrSteps, 0);
  const confidence = number_(ocrConfidence, 0);
  return detected > 0 && detected === entered && confidence >= CONFIG.OCR_AUTO_VERIFY_MIN_CONFIDENCE ? 'AUTO_VERIFIED' : 'NEEDS_REVIEW';
}

function safeFileName_(value) {
  return String(value || 'evidence.jpg').replace(/[\\/:*?"<>|#%{}~&]/g, '_').replace(/\s+/g, '_').slice(0, 120);
}

function getOrCreateChildFolder_(parentFolder, folderName) {
  const iterator = parentFolder.getFoldersByName(folderName);
  return iterator.hasNext() ? iterator.next() : parentFolder.createFolder(folderName);
}

function uploadEvidence_(employeeId, log) {
  const rawData = String(log.imageData || '');
  const match = rawData.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('ไม่พบข้อมูลรูปหลักฐานหรือรูปอยู่ในรูปแบบที่ไม่ถูกต้อง');
  const monthNumber = number_(log.week, 1);
  const weekNumber = number_(log.weekOfMonth, 1);
  const monthFolderName = 'Month_' + String(monthNumber).padStart(2, '0');
  const weekFolderName = 'Week_' + String(weekNumber).padStart(2, '0');
  const root = DriveApp.getFolderById(CONFIG.EVIDENCE_ROOT_FOLDER_ID);
  const weekFolder = getOrCreateChildFolder_(getOrCreateChildFolder_(root, monthFolderName), weekFolderName);
  const bytes = Utilities.base64Decode(match[2]);
  const mimeType = String(log.imageMimeType || match[1] || 'image/jpeg');
  const timestamp = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd_HHmmss');
  const fileName = safeFileName_(employeeId + '_' + monthFolderName + '_' + weekFolderName + '_' + timestamp + '_' + (log.imageName || 'evidence.jpg'));
  const file = weekFolder.createFile(Utilities.newBlob(bytes, mimeType, fileName));
  file.setDescription('Thairath Step Up evidence | Employee ' + employeeId + ' | Month ' + monthNumber + ' | Week ' + weekNumber);
  return { imageName: fileName, imageFileId: file.getId(), imageUrl: file.getUrl() };
}

function logRowToObject_(row) {
  return {
    id: String(row.id || ''),
    userEmail: String(row.userEmail || '').toLowerCase(),
    employeeId: normalizeId_(row.employeeId),
    date: String(row.date || ''),
    steps: number_(row.steps, 0),
    week: number_(row.week, 1),
    weekOfMonth: row.weekOfMonth ? number_(row.weekOfMonth, undefined) : undefined,
    imageName: String(row.imageName || ''),
    imageFileId: String(row.imageFileId || ''),
    imageUrl: String(row.imageUrl || ''),
    imagePreview: '',
    ocrText: String(row.ocrText || ''),
    ocrSteps: row.ocrSteps ? number_(row.ocrSteps, undefined) : undefined,
    ocrConfidence: number_(row.ocrConfidence, 0),
    verificationStatus: normalizeVerificationStatus_(row.verificationStatus),
    reviewNote: String(row.reviewNote || ''),
    reviewedBy: String(row.reviewedBy || ''),
    reviewedAt: String(row.reviewedAt || ''),
    submittedAt: String(row.submittedAt || ''),
    buIdAtSubmission: normalizeId_(row.buIdAtSubmission),
    departmentIdAtSubmission: normalizeId_(row.departmentIdAtSubmission)
  };
}

function fetchAllStepLogs_() {
  return readObjects_(CONFIG.LOG_SHEET, LOG_HEADERS).map(logRowToObject_);
}

function findExactRows_(sheet, columnIndex, value) {
  if (!value || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, columnIndex, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(value).trim())
    .matchEntireCell(true)
    .matchCase(false)
    .findAll()
    .map(function(cell) { return cell.getRow(); });
}

function fetchUserLogs_(userKey) {
  const key = normalizeText_(userKey);
  const user = findEmployeeByKey_(key);
  const employeeId = user ? normalizeId_(user.employeeId) : String(userKey || '').trim();
  const email = user ? normalizeId_(user.email || user.employeeId + '@thairathgroup.com') : String(userKey || '').trim();
  const sheet = ensureSheet_(CONFIG.LOG_SHEET, LOG_HEADERS);
  const employeeColumn = LOG_HEADERS.indexOf('employeeId') + 1;
  const emailColumn = LOG_HEADERS.indexOf('userEmail') + 1;
  const rowNumbers = {};
  findExactRows_(sheet, employeeColumn, employeeId).forEach(function(row) { rowNumbers[row] = true; });
  findExactRows_(sheet, emailColumn, email).forEach(function(row) { rowNumbers[row] = true; });
  return Object.keys(rowNumbers).map(Number).sort(function(a, b) { return a - b; }).map(function(rowNumber) {
    const values = sheet.getRange(rowNumber, 1, 1, LOG_HEADERS.length).getValues()[0];
    return logRowToObject_(rowToObject_(values, rowNumber, LOG_HEADERS));
  });
}

function filterLogsForAdmin_(logs, context) {
  const users = fetchAllUsers_();
  const userMap = {};
  users.forEach(function(user) {
    userMap[normalizeText_(user.employeeId)] = user;
    userMap[normalizeText_(user.email)] = user;
  });
  return logs.filter(function(log) {
    const user = userMap[normalizeText_(log.employeeId)] || userMap[normalizeText_(log.userEmail)];
    const buId = log.buIdAtSubmission || (user && user.buId) || 'UNASSIGNED';
    return adminCanAccessBU_(context, buId);
  });
}

function submissionWindow_(monthNumber, weekNumber) {
  const config = CAMPAIGN_WEEKS.find(function(item) { return item.month === Number(monthNumber) && item.week === Number(weekNumber); });
  if (!config) throw new Error('ไม่พบช่วงเวลาของสัปดาห์ที่เลือก');
  const openAt = new Date(config.startDate + 'T00:00:00+07:00');
  const closeAt = new Date(config.endDate + 'T23:59:59+07:00');
  closeAt.setTime(closeAt.getTime() + CONFIG.SUBMISSION_GRACE_DAYS * 24 * 60 * 60 * 1000);
  return { openAt: openAt, closeAt: closeAt };
}

function assertSubmissionWindowOpen_(monthNumber, weekNumber) {
  const window = submissionWindow_(monthNumber, weekNumber);
  const current = new Date();
  if (current.getTime() < window.openAt.getTime()) throw new Error('สัปดาห์นี้ยังไม่เปิดให้ส่งผล');
  if (current.getTime() > window.closeAt.getTime()) {
    const label = Utilities.formatDate(window.closeAt, CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm');
    throw new Error('เกินกำหนดส่งผลแล้ว ปิดรับเมื่อ ' + label + ' น.');
  }
}

function recalculateTicketsForEmployee_(employeeId, logs) {
  const cleanId = normalizeId_(employeeId);
  if (!cleanId) return 0;
  const sourceLogs = logs || fetchAllStepLogs_();
  const count = sourceLogs.filter(function(log) {
    return normalizeId_(log.employeeId) === cleanId && isVerifiedStatus_(log.verificationStatus) && number_(log.steps, 0) >= CONFIG.WEEKLY_TARGET;
  }).length;
  const row = findEmployeeByKey_(cleanId);
  if (row) {
    const sheet = ensureSheet_(CONFIG.EMPLOYEE_SHEET, EMPLOYEE_HEADERS);
    sheet.getRange(row._row, EMPLOYEE_HEADERS.indexOf('totalTickets') + 1).setValue(count);
    sheet.getRange(row._row, EMPLOYEE_HEADERS.indexOf('updatedAt') + 1).setValue(now_());
  }
  return count;
}

function recalculateAllVerifiedTickets() {
  setup_();
  const users = fetchAllUsers_();
  const logs = fetchAllStepLogs_();
  const counts = {};
  logs.forEach(function(log) {
    if (isVerifiedStatus_(log.verificationStatus) && number_(log.steps, 0) >= CONFIG.WEEKLY_TARGET) {
      const key = normalizeId_(log.employeeId);
      counts[key] = (counts[key] || 0) + 1;
    }
  });
  const sheet = ensureSheet_(CONFIG.EMPLOYEE_SHEET, EMPLOYEE_HEADERS);
  if (users.length) {
    const values = users.map(function(user) { return [counts[normalizeId_(user.employeeId)] || 0]; });
    sheet.getRange(2, EMPLOYEE_HEADERS.indexOf('totalTickets') + 1, values.length, 1).setValues(values);
  }
}

function saveUserLog_(userKey, log) {
  if (!log) throw new Error('Missing log payload');
  const user = findEmployeeByKey_(userKey);
  if (!user) throw new Error('ไม่พบผู้ใช้งานสำหรับบันทึกค่าเฉลี่ยก้าว');
  const monthNumber = number_(log.week, 1);
  const weekOfMonth = number_(log.weekOfMonth, 0);
  const enteredSteps = number_(log.steps, 0);
  if (enteredSteps <= 0) throw new Error('ค่าเฉลี่ยก้าวต้องมากกว่า 0');
  if (!weekOfMonth) throw new Error('กรุณาระบุสัปดาห์ของเดือน');
  assertSubmissionWindowOpen_(monthNumber, weekOfMonth);

  const sheet = ensureSheet_(CONFIG.LOG_SHEET, LOG_HEADERS);
  const logId = String(log.id || Utilities.getUuid()).trim();
  const existing = findRow_(CONFIG.LOG_SHEET, LOG_HEADERS, function(row) { return String(row.id) === logId; });
  const employeeId = normalizeId_(user.employeeId);
  const duplicate = findRow_(CONFIG.LOG_SHEET, LOG_HEADERS, function(row) {
    return String(row.id) !== logId && normalizeText_(row.employeeId) === normalizeText_(employeeId) &&
      Number(row.week) === monthNumber && Number(row.weekOfMonth) === weekOfMonth;
  });
  if (duplicate) throw new Error('พนักงานรายนี้ส่งผลของเดือนและสัปดาห์นี้แล้ว กรุณาติดต่อ Admin หากต้องการแก้ไข');

  const evidence = existing && existing.imageFileId
    ? { imageName: existing.imageName, imageFileId: existing.imageFileId, imageUrl: existing.imageUrl }
    : uploadEvidence_(employeeId, log);
  const verificationStatus = determineInitialVerificationStatus_(enteredSteps, log.ocrSteps, log.ocrConfidence);
  const timestamp = now_();
  const submittedAt = log.submittedAt || timestamp;
  const rowValues = [
    logId,
    String(user.email || employeeId + '@thairathgroup.com').toLowerCase(),
    employeeId,
    log.date || '',
    enteredSteps,
    monthNumber,
    weekOfMonth,
    evidence.imageName,
    submittedAt,
    existing ? existing.createdAt : timestamp,
    timestamp,
    evidence.imageFileId,
    evidence.imageUrl,
    String(log.ocrText || '').slice(0, 45000),
    log.ocrSteps ? number_(log.ocrSteps, '') : '',
    number_(log.ocrConfidence, 0),
    verificationStatus,
    '',
    verificationStatus === 'AUTO_VERIFIED' ? 'ระบบ OCR' : '',
    verificationStatus === 'AUTO_VERIFIED' ? timestamp : '',
    normalizeId_(user.buId) || 'UNASSIGNED',
    normalizeId_(user.departmentId) || 'UNASSIGNED'
  ];
  if (existing) sheet.getRange(existing._row, 1, 1, LOG_HEADERS.length).setValues([rowValues]);
  else sheet.appendRow(rowValues);

  updateEmployeeTimestamp_(employeeId, 'lastSubmitAt', submittedAt);
  recalculateTicketsForEmployee_(employeeId);
  invalidateLeaderboardCache_();
  return logRowToObject_(findRow_(CONFIG.LOG_SHEET, LOG_HEADERS, function(row) { return String(row.id) === logId; }));
}

function getLogBU_(row) {
  if (row.buIdAtSubmission) return normalizeId_(row.buIdAtSubmission);
  const employee = findEmployeeByKey_(row.employeeId || row.userEmail);
  return employee ? normalizeId_(employee.buId) : 'UNASSIGNED';
}

function reviewUserLog_(logId, verificationStatus, reviewNote, adminContext) {
  const nextStatus = normalizeVerificationStatus_(verificationStatus);
  if (nextStatus !== 'APPROVED' && nextStatus !== 'REJECTED') throw new Error('Admin สามารถเลือกได้เฉพาะ APPROVED หรือ REJECTED');
  const sheet = ensureSheet_(CONFIG.LOG_SHEET, LOG_HEADERS);
  const row = findRow_(CONFIG.LOG_SHEET, LOG_HEADERS, function(item) { return String(item.id) === String(logId); });
  if (!row) throw new Error('ไม่พบรายการหลักฐานที่ต้องการตรวจ');
  if (!adminCanAccessBU_(adminContext, getLogBU_(row))) throw new Error('ไม่มีสิทธิ์ตรวจหลักฐานของ BU นี้');
  const timestamp = now_();
  sheet.getRange(row._row, LOG_HEADERS.indexOf('verificationStatus') + 1).setValue(nextStatus);
  sheet.getRange(row._row, LOG_HEADERS.indexOf('reviewNote') + 1).setValue(String(reviewNote || '').slice(0, 500));
  sheet.getRange(row._row, LOG_HEADERS.indexOf('reviewedBy') + 1).setValue(String(adminContext.displayName || 'Admin'));
  sheet.getRange(row._row, LOG_HEADERS.indexOf('reviewedAt') + 1).setValue(timestamp);
  sheet.getRange(row._row, LOG_HEADERS.indexOf('updatedAt') + 1).setValue(timestamp);
  recalculateTicketsForEmployee_(row.employeeId);
  invalidateLeaderboardCache_();
  return logRowToObject_(findRow_(CONFIG.LOG_SHEET, LOG_HEADERS, function(item) { return String(item.id) === String(logId); }));
}

function recalculateLastSubmitAt_(employeeId) {
  const latest = fetchAllStepLogs_().filter(function(log) { return normalizeText_(log.employeeId) === normalizeText_(employeeId); })
    .sort(function(a, b) { return String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')); })[0];
  updateEmployeeTimestamp_(employeeId, 'lastSubmitAt', latest ? latest.submittedAt : '');
}

function deleteUserLog_(logId, adminContext) {
  const sheet = ensureSheet_(CONFIG.LOG_SHEET, LOG_HEADERS);
  const row = findRow_(CONFIG.LOG_SHEET, LOG_HEADERS, function(item) { return String(item.id) === String(logId); });
  if (!row) return;
  if (!adminCanAccessBU_(adminContext, getLogBU_(row))) throw new Error('ไม่มีสิทธิ์ลบหลักฐานของ BU นี้');
  const employeeId = normalizeId_(row.employeeId);
  const imageFileId = normalizeId_(row.imageFileId);
  sheet.deleteRow(row._row);
  if (imageFileId) {
    try { DriveApp.getFileById(imageFileId).setTrashed(true); } catch (err) { console.warn(err); }
  }
  if (employeeId) {
    recalculateLastSubmitAt_(employeeId);
    recalculateTicketsForEmployee_(employeeId);
    invalidateLeaderboardCache_();
  }
}

function leaderboardCacheKey_(currentMonth) { return 'leaderboard_v24_' + Number(currentMonth || 1); }

function invalidateLeaderboardCache_() {
  const cache = CacheService.getScriptCache();
  CAMPAIGN_WEEKS.forEach(function(item) { cache.remove(leaderboardCacheKey_(item.month)); });
}

function calculateLeaderboard_(currentMonth, forceRefresh) {
  const cache = CacheService.getScriptCache();
  const cacheKey = leaderboardCacheKey_(currentMonth);
  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch (err) { console.warn('Leaderboard cache parse failed: ' + err); }
    }
  }
  const users = fetchAllUsers_().filter(function(user) { return normalizeText_(user.status || 'Active') === 'active'; });
  const logs = fetchAllStepLogs_().filter(function(log) {
    return Number(log.week) === Number(currentMonth) && isVerifiedStatus_(log.verificationStatus);
  });
  const usersByKey = {};
  users.forEach(function(user) {
    usersByKey[normalizeText_(user.employeeId)] = user;
    usersByKey[normalizeText_(user.email)] = user;
  });

  // First average each employee's verified weekly averages. This prevents frequent submitters receiving extra weight.
  const employeeValues = {};
  logs.forEach(function(log) {
    const key = normalizeText_(log.employeeId || log.userEmail);
    if (!employeeValues[key]) employeeValues[key] = [];
    employeeValues[key].push(number_(log.steps, 0));
  });
  const employeeAverages = {};
  Object.keys(employeeValues).forEach(function(key) { employeeAverages[key] = average_(employeeValues[key]); });

  const buIds = {};
  const departmentKeys = {};
  users.forEach(function(user) {
    const buId = normalizeId_(user.buId) || 'UNASSIGNED';
    const departmentId = normalizeId_(user.departmentId) || 'UNASSIGNED';
    buIds[buId] = true;
    departmentKeys[buId + '::' + departmentId] = { buId: buId, departmentId: departmentId };
  });

  const businessUnits = Object.keys(buIds).map(function(buId) {
    const members = users.filter(function(user) { return normalizeText_(user.buId) === normalizeText_(buId); });
    const participantAverages = members.map(function(user) {
      return employeeAverages[normalizeText_(user.employeeId)] || employeeAverages[normalizeText_(user.email)];
    }).filter(function(value) { return Number.isFinite(value) && value > 0; });
    return {
      id: buId,
      nameTh: buId,
      nameEn: buId,
      participationRate: members.length ? Math.round(participantAverages.length / members.length * 100) : 0,
      averageStepsPerPerson: average_(participantAverages),
      memberCount: members.length,
      participantCount: participantAverages.length,
      status: 'stable',
      statusText: 'ข้อมูลจากระบบ'
    };
  }).sort(function(a, b) { return b.averageStepsPerPerson - a.averageStepsPerPerson; });

  const departments = Object.keys(departmentKeys).map(function(key) {
    const item = departmentKeys[key];
    const members = users.filter(function(user) {
      return normalizeText_(user.buId) === normalizeText_(item.buId) && normalizeText_(user.departmentId) === normalizeText_(item.departmentId);
    });
    const participantAverages = members.map(function(user) {
      return employeeAverages[normalizeText_(user.employeeId)] || employeeAverages[normalizeText_(user.email)];
    }).filter(function(value) { return Number.isFinite(value) && value > 0; });
    return {
      id: item.departmentId,
      buId: item.buId,
      nameTh: item.departmentId,
      nameEn: item.departmentId,
      participationRate: members.length ? Math.round(participantAverages.length / members.length * 100) : 0,
      averageStepsPerPerson: average_(participantAverages),
      memberCount: members.length,
      participantCount: participantAverages.length,
      status: 'stable',
      statusText: 'ข้อมูลจากระบบ'
    };
  }).sort(function(a, b) { return b.averageStepsPerPerson - a.averageStepsPerPerson; });

  const result = { businessUnits: businessUnits, departments: departments, generatedAt: now_() };
  try { cache.put(cacheKey, JSON.stringify(result), 300); } catch (err) { console.warn('Leaderboard cache skipped: ' + err); }
  return result;
}

function authorizeDriveAccess() {
  const folder = DriveApp.getFolderById(CONFIG.EVIDENCE_ROOT_FOLDER_ID);
  Logger.log('Drive authorized: ' + folder.getName());
}
