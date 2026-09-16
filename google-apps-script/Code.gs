/**
 * Thairath Step Up & Health Up — v2.5.7 Google Sheets Backend
 * Deploy as Web App: Execute as Me / Who has access: Anyone.
 */

const CONFIG = {
  SPREADSHEET_ID: '1YgxxKpP74EkzfzAJn2wnTXamrYJ9-aBZsKwcBo7v3Dk',
  EMPLOYEE_SHEET: 'Employees',
  LOG_SHEET: 'StepLogs',
  DEPARTMENT_MAPPING_SHEET: 'DepartmentMapping',
  EMPLOYEE_RANKING_OVERRIDE_SHEET: 'EmployeeRankingOverride',
  RANKING_HISTORY_SHEET: 'RankingHistory',
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

const DEPARTMENT_MAPPING_HEADERS = [
  'sourceBU', 'sourceDepartmentId', 'canonicalDepartmentId', 'canonicalBU', 'active', 'note'
];

const EMPLOYEE_RANKING_OVERRIDE_HEADERS = [
  'employeeId', 'targetDepartmentId', 'targetBU', 'active', 'note', 'updatedBy', 'updatedAt'
];

const RANKING_HISTORY_HEADERS = [
  'snapshotId', 'snapshotAt', 'periodLabel', 'monthFilter', 'weekFilter',
  'rankingType', 'rank', 'buId', 'departmentId', 'memberCount',
  'participantCount', 'participationRate', 'totalSteps',
  'averageStepsPerPerson', 'metricUsed', 'generatedBy'
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
  return json_({ ok: true, data: { service: 'thairath-step-up-v2.5.7-backend', ready: true } });
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
      case 'syncEmployeeBuIds':
        requireAdmin_(adminContext);
        return json_({ ok: true, data: syncEmployeeBuIdsFromEmployeeId_() });
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
        return json_({ ok: true, data: calculateLeaderboard_(body.currentMonth == null ? 'all' : body.currentMonth, Boolean(body.forceRefresh)) });
      case 'fetchDepartmentMapping':
        requireAdmin_(adminContext);
        return json_({ ok: true, data: fetchDepartmentMapping_() });
      case 'fetchEmployeeRankingOverrides':
        requireAdmin_(adminContext);
        return json_({ ok: true, data: fetchEmployeeRankingOverrides_() });
      case 'saveRankingSnapshot':
        requireAdmin_(adminContext);
        return json_({ ok: true, data: saveRankingSnapshot_(body.snapshot, adminContext) });
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
  ensureSheet_(CONFIG.DEPARTMENT_MAPPING_SHEET, DEPARTMENT_MAPPING_HEADERS);
  ensureSheet_(CONFIG.EMPLOYEE_RANKING_OVERRIDE_SHEET, EMPLOYEE_RANKING_OVERRIDE_HEADERS);
  ensureSheet_(CONFIG.RANKING_HISTORY_SHEET, RANKING_HISTORY_HEADERS);
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

  // Fallback for Sheets cells that removed leading zeroes (001234 -> 1234)
  // and for case differences in alphanumeric employee IDs.
  const targetKey = canonicalEmployeeKey_(idOrEmail);
  if (!targetKey) return null;
  const values = sheet.getRange(2, 1, lastRow - 1, EMPLOYEE_HEADERS.length).getValues();
  const employeeIndex = EMPLOYEE_HEADERS.indexOf('employeeId');
  const emailIndex = EMPLOYEE_HEADERS.indexOf('email');
  for (let rowIndex = 0; rowIndex < values.length; rowIndex++) {
    if (canonicalEmployeeKey_(values[rowIndex][employeeIndex]) === targetKey ||
        canonicalEmployeeKey_(values[rowIndex][emailIndex]) === targetKey) {
      return rowToObject_(values[rowIndex], rowIndex + 2, EMPLOYEE_HEADERS);
    }
  }
  return null;
}

function normalizeId_(value) { return String(value || '').trim(); }
function normalizeText_(value) { return String(value || '').trim().toLowerCase(); }

// Use one canonical key for employee IDs and employee e-mails.
// This protects Leaderboard matching when Sheets converts 001234 to 1234,
// or when a StepLog contains an e-mail while Employees contains an ID.
function canonicalEmployeeKey_(value) {
  const text = normalizeText_(value);
  if (!text) return '';
  const localPart = text.indexOf('@') >= 0 ? text.split('@')[0] : text;
  if (/^\d{1,6}$/.test(localPart)) return localPart.padStart(6, '0');
  return text;
}

function normalizedEmployeeIdForRules_(value) {
  let id = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  if (id.indexOf('@') >= 0) id = id.split('@')[0];
  if (/^\d{1,6}$/.test(id)) id = id.padStart(6, '0');
  return id;
}

function isValidEmployeeId_(value) {
  const id = normalizedEmployeeIdForRules_(value);
  return /^\d{6}$/.test(id) || /^[A-Z][A-Z0-9]{1,11}$/.test(id);
}

// Automatic BU mapping requested by Project Owner.
// Exact exceptions must be checked before generic V-prefix handling.
function deriveBuIdFromEmployeeId_(employeeId) {
  const id = normalizedEmployeeIdForRules_(employeeId);
  if (!id) return '';

  if (['V90005', 'V90099', 'V99999'].indexOf(id) >= 0) return 'VG3';

  if (id.indexOf('100') === 0 || id.indexOf('T10') === 0 || id.indexOf('F10') === 0) return 'VG3';
  if (id.indexOf('200') === 0 || id.indexOf('T20') === 0 || id.indexOf('F20') === 0) return 'TVB';

  if (id.indexOf('00') === 0 || id.indexOf('T9') === 0 ||
      id.indexOf('R0') === 0 || id.indexOf('F9') === 0) return 'TR';

  if (id.indexOf('400') === 0) return 'EVP';
  if (id.indexOf('500') === 0) return 'TRL';
  if (id.indexOf('800') === 0) return 'YOD';

  if (id.indexOf('V') === 0) return 'TR';
  return '';
}

function assignedOrgValue_(value) {
  const id = normalizeId_(value);
  return id && normalizeText_(id) !== 'unassigned' ? id : '';
}

// A manually entered BU remains an override. Automatic mapping is used only
// when buId is blank or UNASSIGNED.
function resolveBuId_(employeeId, rawBuId) {
  const manual = assignedOrgValue_(rawBuId);
  if (manual) return manual.toUpperCase();
  return deriveBuIdFromEmployeeId_(employeeId) || 'UNASSIGNED';
}
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

// Run this public function once from Apps Script after deploying v2.5.7.
// It fills only blank/UNASSIGNED BU cells and preserves manual overrides.
function syncEmployeeBuIdsFromEmployeeId() {
  setup_();
  const result = syncEmployeeBuIdsFromEmployeeId_();
  Logger.log(JSON.stringify(result));
  return result;
}

function syncEmployeeBuIdsFromEmployeeId_() {
  const employeeSheet = ensureSheet_(CONFIG.EMPLOYEE_SHEET, EMPLOYEE_HEADERS);
  const employeeLastRow = employeeSheet.getLastRow();
  let updatedEmployees = 0;
  let updatedLogs = 0;

  if (employeeLastRow >= 2) {
    const employeeIdColumn = EMPLOYEE_HEADERS.indexOf('employeeId') + 1;
    const buColumn = EMPLOYEE_HEADERS.indexOf('buId') + 1;
    const employeeIds = employeeSheet.getRange(2, employeeIdColumn, employeeLastRow - 1, 1).getValues();
    const buValues = employeeSheet.getRange(2, buColumn, employeeLastRow - 1, 1).getValues();

    for (let index = 0; index < employeeIds.length; index++) {
      if (assignedOrgValue_(buValues[index][0])) continue;
      const derived = deriveBuIdFromEmployeeId_(employeeIds[index][0]);
      if (derived) {
        buValues[index][0] = derived;
        updatedEmployees++;
      }
    }
    if (updatedEmployees) employeeSheet.getRange(2, buColumn, employeeLastRow - 1, 1).setValues(buValues);
  }

  const users = fetchAllUsers_();
  const usersByKey = {};
  users.forEach(function(user) {
    const idKey = canonicalEmployeeKey_(user.employeeId);
    const emailKey = canonicalEmployeeKey_(user.email);
    if (idKey) usersByKey[idKey] = user;
    if (emailKey) usersByKey[emailKey] = user;
  });

  const logSheet = ensureSheet_(CONFIG.LOG_SHEET, LOG_HEADERS);
  const logLastRow = logSheet.getLastRow();
  if (logLastRow >= 2) {
    const values = logSheet.getRange(2, 1, logLastRow - 1, LOG_HEADERS.length).getValues();
    const employeeIndex = LOG_HEADERS.indexOf('employeeId');
    const emailIndex = LOG_HEADERS.indexOf('userEmail');
    const buIndex = LOG_HEADERS.indexOf('buIdAtSubmission');
    const departmentIndex = LOG_HEADERS.indexOf('departmentIdAtSubmission');

    values.forEach(function(row) {
      const user = usersByKey[canonicalEmployeeKey_(row[employeeIndex])] ||
        usersByKey[canonicalEmployeeKey_(row[emailIndex])] || null;
      if (!user) return;

      let changed = false;
      if (!assignedOrgValue_(row[buIndex])) {
        row[buIndex] = resolveBuId_(user.employeeId, user.buId);
        changed = true;
      }
      if (!assignedOrgValue_(row[departmentIndex]) && assignedOrgValue_(user.departmentId)) {
        row[departmentIndex] = user.departmentId;
        changed = true;
      }
      if (changed) updatedLogs++;
    });

    if (updatedLogs) logSheet.getRange(2, 1, logLastRow - 1, LOG_HEADERS.length).setValues(values);
  }

  invalidateLeaderboardCache_();
  return {
    updatedEmployees: updatedEmployees,
    updatedStepLogs: updatedLogs,
    mappingRulesVersion: 'v2.5.2'
  };
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
    buId: resolveBuId_(employeeId, row.buId),
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
  if (!isValidEmployeeId_(cleanId)) throw new Error('รหัสพนักงานไม่ถูกต้อง กรุณากรอกตัวเลข 6 หลักหรือรหัสตัวอักษรตามฐานพนักงาน');
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
    leaderboard: calculateLeaderboard_('all')
  };
}

function getUserProfile_(idOrEmail) {
  return employeeToProfile_(findEmployeeByKey_(idOrEmail));
}

function saveUserProfile_(idOrEmail, profile, password, allowOrgChange) {
  if (!profile) throw new Error('Missing profile payload');
  const employeeId = normalizeId_(profile.employeeId || idOrEmail);
  if (!isValidEmployeeId_(employeeId)) throw new Error('รหัสพนักงานไม่ถูกต้อง');
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
  const requestedBuId = allowOrgChange ? normalizeId_(profile.buId) : normalizeId_(existing && existing.buId);
  const buId = resolveBuId_(employeeId, requestedBuId);
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
    buId
  ];
  if (existing) sheet.getRange(existing._row, 1, 1, EMPLOYEE_HEADERS.length).setValues([rowValues]);
  else sheet.appendRow(rowValues);
  invalidateLeaderboardCache_();
}

function adminSaveUserProfile_(idOrEmail, profile, password, adminContext) {
  if (!profile) throw new Error('Missing profile payload');
  const existing = findEmployeeByKey_(profile.employeeId || idOrEmail);
  if (existing && !adminCanAccessBU_(adminContext, resolveBuId_(existing.employeeId, existing.buId))) {
    throw new Error('ไม่มีสิทธิ์แก้ไขพนักงานใน BU เดิม');
  }
  const targetBuId = resolveBuId_(profile.employeeId || idOrEmail, profile.buId);
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
    const buId = assignedOrgValue_(log.buIdAtSubmission) || (user && user.buId) || deriveBuIdFromEmployeeId_(log.employeeId || log.userEmail) || 'UNASSIGNED';
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
  const snapshotBuId = assignedOrgValue_(row.buIdAtSubmission);
  if (snapshotBuId) return snapshotBuId.toUpperCase();
  const employee = findEmployeeByKey_(row.employeeId || row.userEmail);
  return employee ? resolveBuId_(employee.employeeId, employee.buId) : (deriveBuIdFromEmployeeId_(row.employeeId || row.userEmail) || 'UNASSIGNED');
}

function reviewUserLog_(logId, verificationStatus, reviewNote, adminContext) {
  const nextStatus = normalizeVerificationStatus_(verificationStatus);
  if (nextStatus !== 'APPROVED' && nextStatus !== 'REJECTED') throw new Error('Admin สามารถเลือกได้เฉพาะ APPROVED หรือ REJECTED');
  const sheet = ensureSheet_(CONFIG.LOG_SHEET, LOG_HEADERS);
  const row = findRow_(CONFIG.LOG_SHEET, LOG_HEADERS, function(item) { return String(item.id) === String(logId); });
  if (!row) throw new Error('ไม่พบรายการหลักฐานที่ต้องการตรวจ');
  if (!adminCanAccessBU_(adminContext, getLogBU_(row))) throw new Error('ไม่มีสิทธิ์ตรวจหลักฐานของ BU นี้');
  const currentStatus = normalizeVerificationStatus_(row.verificationStatus);
  if (currentStatus === 'AUTO_VERIFIED' && nextStatus === 'APPROVED') {
    return logRowToObject_(row);
  }
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


function boolean_(value, fallback) {
  if (typeof value === 'boolean') return value;
  const text = normalizeText_(value);
  if (!text) return fallback;
  if (['false', '0', 'no', 'inactive'].indexOf(text) >= 0) return false;
  if (['true', '1', 'yes', 'active'].indexOf(text) >= 0) return true;
  return fallback;
}

function fetchDepartmentMapping_() {
  return readObjects_(CONFIG.DEPARTMENT_MAPPING_SHEET, DEPARTMENT_MAPPING_HEADERS)
    .filter(function(row) {
      return normalizeId_(row.sourceDepartmentId) && boolean_(row.active, true);
    })
    .map(function(row) {
      return {
        sourceBU: normalizeId_(row.sourceBU).toUpperCase() || '*',
        sourceDepartmentId: normalizeId_(row.sourceDepartmentId),
        canonicalDepartmentId: normalizeId_(row.canonicalDepartmentId) || normalizeId_(row.sourceDepartmentId),
        canonicalBU: normalizeId_(row.canonicalBU).toUpperCase(),
        active: boolean_(row.active, true),
        note: String(row.note || '')
      };
    });
}

function fetchEmployeeRankingOverrides_() {
  return readObjects_(CONFIG.EMPLOYEE_RANKING_OVERRIDE_SHEET, EMPLOYEE_RANKING_OVERRIDE_HEADERS)
    .filter(function(row) {
      return canonicalEmployeeKey_(row.employeeId) && normalizeId_(row.targetDepartmentId) && boolean_(row.active, true);
    })
    .map(function(row) {
      return {
        employeeId: normalizeId_(row.employeeId),
        targetDepartmentId: normalizeId_(row.targetDepartmentId),
        targetBU: normalizeId_(row.targetBU).toUpperCase(),
        active: boolean_(row.active, true),
        note: String(row.note || ''),
        updatedBy: String(row.updatedBy || ''),
        updatedAt: String(row.updatedAt || '')
      };
    });
}

function departmentRuleKey_(sourceBU, departmentId) {
  return (normalizeId_(sourceBU).toUpperCase() || '*') + '::' + normalizeText_(departmentId);
}

function buildDepartmentGrouping_(users) {
  const ruleBySource = {};
  fetchDepartmentMapping_().forEach(function(rule) {
    const sourceBU = normalizeId_(rule.sourceBU).toUpperCase() || '*';
    ruleBySource[departmentRuleKey_(sourceBU, rule.sourceDepartmentId)] = rule;
  });

  const overrideByEmployee = {};
  fetchEmployeeRankingOverrides_().forEach(function(item) {
    const key = canonicalEmployeeKey_(item.employeeId);
    if (key) overrideByEmployee[key] = item;
  });

  return {
    ruleBySource: ruleBySource,
    overrideByEmployee: overrideByEmployee
  };
}

function findDepartmentRule_(grouping, departmentId, rawBuId) {
  const department = normalizeId_(departmentId) || 'UNASSIGNED';
  const bu = normalizeId_(rawBuId).toUpperCase() || 'UNASSIGNED';
  return grouping.ruleBySource[departmentRuleKey_(bu, department)] ||
    grouping.ruleBySource[departmentRuleKey_('*', department)] ||
    null;
}

function resolveDepartmentGroup_(grouping, departmentId, rawBuId, employeeIdOrEmail) {
  const override = grouping.overrideByEmployee[canonicalEmployeeKey_(employeeIdOrEmail)] || null;
  const rawDepartment = normalizeId_(override && override.targetDepartmentId) || normalizeId_(departmentId) || 'UNASSIGNED';
  const rawBU = normalizeId_(override && override.targetBU).toUpperCase() || normalizeId_(rawBuId).toUpperCase() || 'UNASSIGNED';
  const rule = findDepartmentRule_(grouping, rawDepartment, rawBU);
  const canonicalDepartment = normalizeId_(rule && rule.canonicalDepartmentId) || rawDepartment;
  const canonicalBU = normalizeId_(rule && rule.canonicalBU).toUpperCase() || rawBU;

  // Important v2.5.2 rule:
  // Same department names in different BUs stay separate by default.
  // They merge only when DepartmentMapping explicitly resolves them to the same
  // canonical department + canonical BU.
  return {
    key: normalizeText_(canonicalBU) + '::' + normalizeText_(canonicalDepartment),
    departmentId: canonicalDepartment,
    buId: canonicalBU
  };
}

function sum_(values) {
  return (values || []).map(Number).filter(function(value) {
    return Number.isFinite(value);
  }).reduce(function(sum, value) {
    return sum + value;
  }, 0);
}

function saveRankingSnapshot_(snapshot, adminContext) {
  const payload = snapshot || {};
  const rows = Array.isArray(payload.rows) ? payload.rows.slice(0, 1000) : [];
  if (!rows.length) throw new Error('ไม่มีข้อมูล Ranking สำหรับบันทึก');

  const sheet = ensureSheet_(CONFIG.RANKING_HISTORY_SHEET, RANKING_HISTORY_HEADERS);
  const snapshotId = 'RANK-' + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss') + '-' + Utilities.getUuid().slice(0, 8);
  const snapshotAt = now_();
  const periodLabel = String(payload.periodLabel || '');
  const monthFilter = String(payload.monthFilter || 'all');
  const weekFilter = String(payload.weekFilter || 'all');
  const generatedBy = String(adminContext.displayName || 'Admin');

  const values = rows.map(function(row) {
    const rankingType = String(row.rankingType || '').toUpperCase() === 'DEPARTMENT' ? 'DEPARTMENT' : 'BU';
    const buId = normalizeId_(row.buId).toUpperCase() || 'UNASSIGNED';
    if (!adminCanAccessBU_(adminContext, buId)) {
      throw new Error('ไม่มีสิทธิ์บันทึก Ranking ของ BU ' + buId);
    }
    return [
      snapshotId,
      snapshotAt,
      periodLabel,
      monthFilter,
      weekFilter,
      rankingType,
      number_(row.rank, 0),
      buId,
      rankingType === 'DEPARTMENT' ? normalizeId_(row.departmentId) : '',
      number_(row.memberCount, 0),
      number_(row.participantCount, 0),
      number_(row.participationRate, 0),
      number_(row.totalSteps, 0),
      number_(row.averageStepsPerPerson, 0),
      rankingType === 'DEPARTMENT' ? 'TOTAL_STEPS' : 'AVERAGE_STEPS_PER_PERSON',
      generatedBy
    ];
  });

  const startRow = sheet.getLastRow() + 1;
  const requiredLastRow = startRow + values.length - 1;
  if (requiredLastRow > sheet.getMaxRows()) {
    sheet.insertRowsAfter(sheet.getMaxRows(), requiredLastRow - sheet.getMaxRows());
  }
  sheet.getRange(startRow, 1, values.length, RANKING_HISTORY_HEADERS.length).setValues(values);
  return { snapshotId: snapshotId, rowsSaved: values.length };
}


function normalizeLeaderboardPeriod_(value) {
  const text = normalizeText_(value);
  if (text === 'all' || text === '0') return 'all';
  const month = Number(value);
  return Number.isFinite(month) && month > 0 ? month : 'all';
}

function leaderboardCacheKey_(period) {
  const normalized = normalizeLeaderboardPeriod_(period);
  return 'leaderboard_v257_' + (normalized === 'all' ? 'all' : String(normalized));
}

function invalidateLeaderboardCache_() {
  const cache = CacheService.getScriptCache();
  cache.remove(leaderboardCacheKey_('all'));
  const months = {};
  CAMPAIGN_WEEKS.forEach(function(item) { months[item.month] = true; });
  Object.keys(months).forEach(function(month) { cache.remove(leaderboardCacheKey_(Number(month))); });
}

function latestVerifiedLogsPerEmployeeWeek_(logs) {
  const latestBySlot = {};
  (logs || []).forEach(function(log, index) {
    const employeeKey = canonicalEmployeeKey_(log.employeeId) || canonicalEmployeeKey_(log.userEmail);
    if (!employeeKey) return;
    const monthKey = Number(log.week) || 0;
    const weekKey = Number(log.weekOfMonth) || 0;
    const slotKey = weekKey > 0
      ? employeeKey + '::' + monthKey + '::' + weekKey
      : employeeKey + '::' + monthKey + '::' + String(log.id || index);
    const timestampValue = log.updatedAt || log.reviewedAt || log.submittedAt || log.createdAt || '';
    const timestamp = new Date(timestampValue).getTime();
    const candidateTime = Number.isFinite(timestamp) ? timestamp : index;
    const current = latestBySlot[slotKey];
    if (!current || candidateTime >= current.timestamp) {
      latestBySlot[slotKey] = { timestamp: candidateTime, log: log };
    }
  });
  return Object.keys(latestBySlot).map(function(key) { return latestBySlot[key].log; });
}

function calculateLeaderboard_(currentMonth, forceRefresh) {
  const period = normalizeLeaderboardPeriod_(currentMonth);
  const cache = CacheService.getScriptCache();
  const cacheKey = leaderboardCacheKey_(period);
  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch (err) { console.warn('Leaderboard cache parse failed: ' + err); }
    }
  }

  const users = fetchAllUsers_().filter(function(user) {
    return normalizeText_(user.status || 'Active') === 'active';
  });
  const logs = fetchAllStepLogs_().filter(function(log) {
    return isVerifiedStatus_(log.verificationStatus) && (period === 'all' || Number(log.week) === Number(period));
  });

  const grouping = buildDepartmentGrouping_(users);
  const usersByKey = {};
  users.forEach(function(user) {
    const idKey = canonicalEmployeeKey_(user.employeeId);
    const emailKey = canonicalEmployeeKey_(user.email);
    if (idKey) usersByKey[idKey] = user;
    if (emailKey) usersByKey[emailKey] = user;
  });

  const departmentLogIds = {};
  latestVerifiedLogsPerEmployeeWeek_(logs).forEach(function(log, index) {
    const key = normalizeId_(log.id) || ('department-log-' + index);
    departmentLogIds[key] = true;
  });

  // BU ranking stays average-based.
  // Department ranking uses TOTAL_STEPS = sum of each employee's verified weekly-average results.
  // One verified result per employee per campaign week is counted; if duplicates exist, the latest verified record wins.
  const buGroups = {};
  const departmentGroups = {};

  users.forEach(function(user) {
    const employeeKey = canonicalEmployeeKey_(user.employeeId) || canonicalEmployeeKey_(user.email);
    if (!employeeKey) return;

    const rawBU = resolveBuId_(user.employeeId, user.buId);
    if (!buGroups[rawBU]) {
      buGroups[rawBU] = { id: rawBU, memberIds: {}, participantValues: {} };
    }
    buGroups[rawBU].memberIds[employeeKey] = true;

    const departmentGroup = resolveDepartmentGroup_(grouping, user.departmentId, rawBU, user.employeeId || user.email);
    if (!departmentGroups[departmentGroup.key]) {
      departmentGroups[departmentGroup.key] = {
        id: departmentGroup.departmentId,
        buId: departmentGroup.buId,
        memberIds: {},
        participantValues: {}
      };
    }
    departmentGroups[departmentGroup.key].memberIds[employeeKey] = true;
  });

  logs.forEach(function(log) {
    const rawKey = canonicalEmployeeKey_(log.employeeId) || canonicalEmployeeKey_(log.userEmail);
    const matchedUser = usersByKey[canonicalEmployeeKey_(log.employeeId)] ||
      usersByKey[canonicalEmployeeKey_(log.userEmail)] ||
      null;
    const employeeKey = matchedUser
      ? (canonicalEmployeeKey_(matchedUser.employeeId) || canonicalEmployeeKey_(matchedUser.email))
      : rawKey;
    if (!employeeKey) return;

    const rawBU = assignedOrgValue_(log.buIdAtSubmission) ||
      normalizeId_(matchedUser && matchedUser.buId) ||
      deriveBuIdFromEmployeeId_(log.employeeId || log.userEmail) ||
      'UNASSIGNED';
    const rawDepartment = assignedOrgValue_(log.departmentIdAtSubmission) ||
      normalizeId_(matchedUser && matchedUser.departmentId) ||
      'UNASSIGNED';
    const steps = number_(log.steps, 0);
    if (!(steps > 0)) return;

    if (!buGroups[rawBU]) {
      buGroups[rawBU] = { id: rawBU, memberIds: {}, participantValues: {} };
    }
    if (!buGroups[rawBU].participantValues[employeeKey]) buGroups[rawBU].participantValues[employeeKey] = [];
    buGroups[rawBU].participantValues[employeeKey].push(steps);

    const departmentLogKey = normalizeId_(log.id);
    if (departmentLogKey && departmentLogIds[departmentLogKey]) {
      const departmentGroup = resolveDepartmentGroup_(grouping, rawDepartment, rawBU, matchedUser ? (matchedUser.employeeId || matchedUser.email) : (log.employeeId || log.userEmail));
      if (!departmentGroups[departmentGroup.key]) {
        departmentGroups[departmentGroup.key] = {
          id: departmentGroup.departmentId,
          buId: departmentGroup.buId,
          memberIds: {},
          participantValues: {}
        };
      }
      if (!departmentGroups[departmentGroup.key].participantValues[employeeKey]) {
        departmentGroups[departmentGroup.key].participantValues[employeeKey] = [];
      }
      departmentGroups[departmentGroup.key].participantValues[employeeKey].push(steps);
    }
  });

  const businessUnits = Object.keys(buGroups).map(function(key) {
    const group = buGroups[key];
    const participantAverages = Object.keys(group.participantValues).map(function(employeeKey) {
      return average_(group.participantValues[employeeKey]);
    }).filter(function(value) { return Number.isFinite(value) && value > 0; });
    const memberCount = Object.keys(group.memberIds).length;
    return {
      id: group.id,
      nameTh: group.id,
      nameEn: group.id,
      participationRate: memberCount ? Math.round(participantAverages.length / memberCount * 100) : 0,
      averageStepsPerPerson: average_(participantAverages),
      totalSteps: sum_(participantAverages),
      memberCount: memberCount,
      participantCount: participantAverages.length,
      status: 'stable',
      statusText: 'BU Ranking ใช้ค่าเฉลี่ยต่อคน'
    };
  }).sort(function(a, b) {
    if (b.averageStepsPerPerson !== a.averageStepsPerPerson) return b.averageStepsPerPerson - a.averageStepsPerPerson;
    return b.participationRate - a.participationRate;
  });

  const departments = Object.keys(departmentGroups).map(function(key) {
    const group = departmentGroups[key];
    const participantTotals = Object.keys(group.participantValues).map(function(employeeKey) {
      return sum_(group.participantValues[employeeKey]);
    }).filter(function(value) { return Number.isFinite(value) && value > 0; });
    const memberCount = Object.keys(group.memberIds).length;
    const totalSteps = sum_(participantTotals);
    const submittedWeekResults = Object.keys(group.participantValues).reduce(function(total, employeeKey) {
      return total + group.participantValues[employeeKey].length;
    }, 0);
    return {
      id: group.id,
      buId: group.buId,
      nameTh: group.id,
      nameEn: group.id,
      participationRate: memberCount ? Math.round(participantTotals.length / memberCount * 100) : 0,
      averageStepsPerPerson: average_(participantTotals),
      totalSteps: totalSteps,
      memberCount: memberCount,
      participantCount: participantTotals.length,
      status: 'stable',
      statusText: 'รวม ' + totalSteps.toLocaleString() + ' ก้าว จาก ' + participantTotals.length + ' คน · ' + submittedWeekResults + ' ผลสัปดาห์'
    };
  }).sort(function(a, b) {
    if (b.totalSteps !== a.totalSteps) return b.totalSteps - a.totalSteps;
    if (b.participationRate !== a.participationRate) return b.participationRate - a.participationRate;
    return String(a.nameTh).localeCompare(String(b.nameTh));
  });

  const result = {
    businessUnits: businessUnits,
    departments: departments,
    generatedAt: now_(),
    periodKey: period === 'all' ? 'all' : String(period),
    verifiedLogCount: logs.length
  };
  try { cache.put(cacheKey, JSON.stringify(result), 300); } catch (err) { console.warn('Leaderboard cache skipped: ' + err); }
  return result;
}

function authorizeDriveAccess() {
  const folder = DriveApp.getFolderById(CONFIG.EVIDENCE_ROOT_FOLDER_ID);
  Logger.log('Drive authorized: ' + folder.getName());
}
