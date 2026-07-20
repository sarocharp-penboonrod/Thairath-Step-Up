/**
 * Thairath Step Up & Health Up — Google Sheets Backend
 * Deploy this file as a Google Apps Script Web App and set the Web App URL
 * in Vercel as GOOGLE_APPS_SCRIPT_URL.
 */

const CONFIG = {
  // Recommended: keep this blank if the Apps Script is bound to the target Google Sheet.
  // For standalone script, paste the Spreadsheet ID here or set Script Property SHEET_ID.
  SPREADSHEET_ID: '1YgxxKpP74EkzfzAJn2wnTXamrYJ9-aBZsKwcBo7v3Dk',
  EMPLOYEE_SHEET: 'Employees',
  LOG_SHEET: 'StepLogs',
  TIMEZONE: 'Asia/Bangkok'
};

const EMPLOYEE_HEADERS = [
  'employeeId',
  'password',
  'dateOfBirth',
  'name',
  'Surename',
  'nickname',
  'departmentId',
  'weekTarget',
  'totalTickets',
  'email',
  'status',
  'createdAt',
  'updatedAt',
  'lastLoginAt',
  'lastSubmitAt'
];

const LOG_HEADERS = [
  'id',
  'userEmail',
  'employeeId',
  'date',
  'steps',
  'week',
  'weekOfMonth',
  'imageName',
  'submittedAt',
  'createdAt',
  'updatedAt'
];

const DEPARTMENTS = [
  { id: 'ceo', nameTh: 'สายงาน CEO', nameEn: 'CEO Office', participationRate: 92, averageStepsPerPerson: 8250, status: 'up', statusText: 'เพิ่มขึ้น 1 อันดับ' },
  { id: 'creative_digital', nameTh: 'ฝ่าย Creative Digital Studio', nameEn: 'Creative Digital Studio', participationRate: 85, averageStepsPerPerson: 7300, status: 'stable', statusText: 'คงที่' },
  { id: 'mirror', nameTh: 'ฝ่าย Mirror', nameEn: 'Mirror Editorial', participationRate: 80, averageStepsPerPerson: 6950, status: 'down', statusText: 'ลดลง 1 อันดับ' },
  { id: 'prod_tech_prod', nameTh: 'ฝ่าย Product & Technology (Product)', nameEn: 'Product & Tech (Product)', participationRate: 88, averageStepsPerPerson: 7850, status: 'up', statusText: 'เพิ่มขึ้น 2 อันดับ' },
  { id: 'prod_tech_tech', nameTh: 'ฝ่าย Product & Technology (Tech)', nameEn: 'Product & Tech (Tech)', participationRate: 90, averageStepsPerPerson: 8100, status: 'up', statusText: 'เพิ่มขึ้น 3 อันดับ' },
  { id: 'tr_creative', nameTh: 'ฝ่าย Thairath Creative', nameEn: 'Thairath Creative', participationRate: 84, averageStepsPerPerson: 7200, status: 'stable', statusText: 'คงที่' },
  { id: 'tr_money', nameTh: 'ฝ่าย Thairath Money', nameEn: 'Thairath Money', participationRate: 86, averageStepsPerPerson: 7420, status: 'stable', statusText: 'คงที่' },
  { id: 'marketing', nameTh: 'ฝ่ายการตลาด', nameEn: 'Marketing Department', participationRate: 78, averageStepsPerPerson: 6800, status: 'down', statusText: 'ลดลง 1 อันดับ' },
  { id: 'event', nameTh: 'ฝ่าย Event', nameEn: 'Event Department', participationRate: 82, averageStepsPerPerson: 7600, status: 'up', statusText: 'เพิ่มขึ้น 1 อันดับ' },
  { id: 'editorial_online', nameTh: 'ฝ่ายบรรณาธิการออนไลน์', nameEn: 'Online Editorial', participationRate: 89, averageStepsPerPerson: 7900, status: 'stable', statusText: 'คงที่' },
  { id: 'business_dev', nameTh: 'ฝ่ายพัฒนาธุรกิจ', nameEn: 'Business Development', participationRate: 75, averageStepsPerPerson: 6500, status: 'down', statusText: 'ลดลง 2 อันดับ' },
  { id: 'thairath_plus', nameTh: 'ฝ่ายไทยรัฐพลัส', nameEn: 'Thairath Plus', participationRate: 81, averageStepsPerPerson: 7120, status: 'stable', statusText: 'คงที่' },
  { id: 'sales_private_1', nameTh: 'ฝ่ายขายเอกชน 1', nameEn: 'Enterprise Sales 1', participationRate: 77, averageStepsPerPerson: 6700, status: 'down', statusText: 'ลดลง 1 อันดับ' },
  { id: 'sales_private_2', nameTh: 'ฝ่ายขายเอกชน 2', nameEn: 'Enterprise Sales 2', participationRate: 79, averageStepsPerPerson: 6920, status: 'up', statusText: 'เพิ่มขึ้น 1 อันดับ' },
  { id: 'sales_private_3', nameTh: 'ฝ่ายขายเอกชน 3', nameEn: 'Enterprise Sales 3', participationRate: 74, averageStepsPerPerson: 6450, status: 'stable', statusText: 'คงที่' },
  { id: 'sales_operation', nameTh: 'ส่วนงาน Sales Operation', nameEn: 'Sales Operations Group', participationRate: 83, averageStepsPerPerson: 7350, status: 'up', statusText: 'เพิ่มขึ้น 1 อันดับ' },
  { id: 'safety_she', nameTh: 'ฝ่ายความปลอดภัยอาชีวอนามัยและสภาพแวดล้อมในการทำงาน', nameEn: 'Safety & SHE Department', participationRate: 94, averageStepsPerPerson: 8950, status: 'stable', statusText: 'คงที่อันดับ 1' },
  { id: 'sales_gov', nameTh: 'ฝ่ายขายราชการ', nameEn: 'Government Sales', participationRate: 76, averageStepsPerPerson: 6600, status: 'down', statusText: 'ลดลง 1 อันดับ' }
];

function doGet() {
  setup_();
  return json_({ ok: true, data: { service: 'thairath-step-up-google-sheets-backend', ready: true } });
}

function doPost(e) {
  try {
    setup_();
    const body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = body.action;

    switch (action) {
      case 'setup':
        return json_({ ok: true, data: { ready: true } });
      case 'verifyLogin':
        return json_({ ok: true, data: verifyLogin_(body.employeeId, body.password) });
      case 'getUserProfile':
        return json_({ ok: true, data: getUserProfile_(body.idOrEmail) });
      case 'saveUserProfile':
        saveUserProfile_(body.idOrEmail, body.profile, body.password);
        return json_({ ok: true, data: { saved: true } });
      case 'fetchUserLogs':
        return json_({ ok: true, data: fetchUserLogs_(body.userKey) });
      case 'saveUserLog':
        saveUserLog_(body.userKey, body.log);
        return json_({ ok: true, data: { saved: true } });
      case 'deleteUserLog':
        deleteUserLog_(body.logId);
        return json_({ ok: true, data: { deleted: true } });
      case 'updateUserTickets':
        updateUserTickets_(body.employeeId, body.totalTickets);
        return json_({ ok: true, data: { saved: true } });
      case 'calculateLeaderboard':
        return json_({ ok: true, data: calculateLeaderboard_(Number(body.currentWeek) || 1) });
      case 'fetchAllUsers':
        return json_({ ok: true, data: fetchAllUsers_() });
      case 'fetchAllStepLogs':
        return json_({ ok: true, data: fetchAllStepLogs_() });
      default:
        return json_({ ok: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return json_({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function ss_() {
  const propertyId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  const id = propertyId || CONFIG.SPREADSHEET_ID;
  if (id) return SpreadsheetApp.openById(id);

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('Spreadsheet not found. Bind this script to a Google Sheet or set Script Property SHEET_ID.');
  }
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
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    return sheet;
  }

  const existing = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
  let changed = false;
  headers.forEach((h, idx) => {
    if (existing[idx] !== h) {
      sheet.getRange(1, idx + 1).setValue(h);
      changed = true;
    }
  });
  if (changed) sheet.setFrozenRows(1);
  return sheet;
}

function readObjects_(sheetName, headers) {
  const sheet = ensureSheet_(sheetName, headers);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map((row, index) => {
      const obj = { _row: index + 2 };
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
}

function findRow_(sheetName, headers, predicate) {
  const rows = readObjects_(sheetName, headers);
  return rows.find(predicate) || null;
}

function normalizeId_(value) {
  return String(value || '').trim();
}

function normalizeText_(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeDeptKey_(value) {
  return normalizeText_(value).replace(/^ฝ่าย\s*/i, '').replace(/\s+/g, ' ');
}

function canonicalDepartmentId_(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const key = normalizeDeptKey_(raw);
  const matched = DEPARTMENTS.find(d => {
    return normalizeDeptKey_(d.id) === key ||
      normalizeDeptKey_(d.nameTh) === key ||
      normalizeDeptKey_(d.nameEn) === key;
  });
  return matched ? matched.id : raw;
}

function departmentLabel_(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const id = canonicalDepartmentId_(raw);
  const matched = DEPARTMENTS.find(d => normalizeDeptKey_(d.id) === normalizeDeptKey_(id));
  return matched ? matched.nameTh : raw;
}

function getDepartmentCatalog_(users) {
  const byId = {};

  (users || []).forEach(u => {
    const rawDept = String(u.departmentId || '').trim();
    if (!rawDept) return;
    const id = canonicalDepartmentId_(rawDept);
    if (byId[id]) return;

    const known = DEPARTMENTS.find(d => normalizeDeptKey_(d.id) === normalizeDeptKey_(id));
    byId[id] = known
      ? Object.assign({}, known)
      : {
          id: id,
          nameTh: departmentLabel_(rawDept) || id,
          nameEn: departmentLabel_(rawDept) || id,
          participationRate: 0,
          averageStepsPerPerson: 0,
          status: 'stable',
          statusText: 'ข้อมูลจาก Google Sheets'
        };
  });

  // Fallback for an empty database so the frontend still has a valid structure.
  return Object.keys(byId).length > 0
    ? Object.keys(byId).map(id => byId[id])
    : DEPARTMENTS.map(d => Object.assign({}, d, { participationRate: 0, averageStepsPerPerson: 0 }));
}

function sameDepartment_(a, b) {
  return normalizeDeptKey_(canonicalDepartmentId_(a)) === normalizeDeptKey_(canonicalDepartmentId_(b));
}

function number_(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function now_() {
  return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function toIsoDate_(date) {
  if (!date) return '';
  return Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy-MM-dd');
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
  if (separated) {
    return dateFromDmy_(Number(separated[1]), Number(separated[2]), Number(separated[3]));
  }

  if (/^\d{8}$/.test(raw)) {
    return dateFromDmy_(Number(raw.slice(0, 2)), Number(raw.slice(2, 4)), Number(raw.slice(4, 8)));
  }

  if (/^\d{6}$/.test(raw)) {
    return dateFromDmy_(Number(raw.slice(0, 2)), Number(raw.slice(2, 4)), Number(raw.slice(4, 6)));
  }

  return null;
}

function dateFromDmy_(day, month, year) {
  if (!day || !month || !year) return null;

  const currentYear = new Date().getFullYear();
  const candidates = [];

  if (year < 100) {
    candidates.push(2500 + year - 543); // Thai Buddhist year, e.g. 42 -> 2542 -> 1999
    candidates.push(2400 + year - 543); // Older generation, e.g. 12 -> 2512 -> 1969
    candidates.push(1900 + year);
    candidates.push(2000 + year);
  } else if (year > 2400) {
    candidates.push(year - 543);
  } else {
    candidates.push(year);
  }

  const valid = candidates
    .map(y => new Date(y, month - 1, day))
    .filter(d => !isNaN(d.getTime()) && d.getDate() === day && d.getMonth() === month - 1)
    .sort((a, b) => {
      const ageA = currentYear - a.getFullYear();
      const ageB = currentYear - b.getFullYear();
      const scoreA = ageA >= 15 && ageA <= 80 ? 0 : 1;
      const scoreB = ageB >= 15 && ageB <= 80 ? 0 : 1;
      return scoreA - scoreB;
    });

  return valid[0] || null;
}

function calculateAge_(date) {
  if (!date) return '';
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const m = today.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
  return age;
}

function passwordFromBirthDate_(date) {
  if (!date) return '';
  const day = Utilities.formatDate(date, CONFIG.TIMEZONE, 'dd');
  const month = Utilities.formatDate(date, CONFIG.TIMEZONE, 'MM');
  const thaiYearLast2 = String(date.getFullYear() + 543).slice(-2);
  return day + month + thaiYearLast2;
}

function getEmployeeByIdOrEmail_(idOrEmail) {
  const key = normalizeText_(idOrEmail);
  if (!key) return null;
  return findRow_(CONFIG.EMPLOYEE_SHEET, EMPLOYEE_HEADERS, r => {
    return normalizeText_(r.employeeId) === key || normalizeText_(r.email) === key;
  });
}

function employeeToProfile_(row) {
  if (!row) return null;
  const birthDate = parseBirthDate_(row.dateOfBirth, row.password);
  const employeeId = normalizeId_(row.employeeId);
  const nickname = String(row.nickname || '').trim();
  const firstName = String(row.name || '').trim();
  const surname = String(row.Surename || '').trim();
  const fullName = [firstName, surname].filter(Boolean).join(' ').trim();
  return {
    name: String(fullName || (nickname ? 'คุณ' + nickname : 'พนักงานไทยรัฐ')).trim(),
    surname: surname,
    nickname: nickname,
    departmentId: canonicalDepartmentId_(row.departmentId) || 'ceo',
    weekTarget: number_(row.weekTarget, 60000),
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
  const lastLoginCol = EMPLOYEE_HEADERS.indexOf('lastLoginAt') + 1;
  if (lastLoginCol > 0) {
    sheet.getRange(employeeRow._row, lastLoginCol).setValue(now_());
  }
}

function updateEmployeeTimestamp_(employeeId, headerName, value) {
  const employee = getEmployeeByIdOrEmail_(employeeId);
  if (!employee || !employee._row) return;
  const column = EMPLOYEE_HEADERS.indexOf(headerName) + 1;
  if (column <= 0) return;
  const sheet = ensureSheet_(CONFIG.EMPLOYEE_SHEET, EMPLOYEE_HEADERS);
  sheet.getRange(employee._row, column).setValue(value || '');
}

function recalculateLastSubmitAt_(employeeId) {
  const cleanId = normalizeText_(employeeId);
  const latest = fetchAllStepLogs_()
    .filter(log => normalizeText_(log.employeeId) === cleanId)
    .sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')))[0];
  updateEmployeeTimestamp_(employeeId, 'lastSubmitAt', latest ? latest.submittedAt : '');
}

function verifyLogin_(employeeId, password) {
  const cleanId = normalizeId_(employeeId);
  const cleanPassword = normalizeId_(password);
  if (!/^\d{6}$/.test(cleanId)) throw new Error('รหัสพนักงานต้องเป็นตัวเลข 6 หลัก');
  if (!/^\d{6}$/.test(cleanPassword)) throw new Error('รหัสผ่านวันเกิดต้องเป็นตัวเลข 6 หลัก');

  const row = getEmployeeByIdOrEmail_(cleanId);
  if (!row) throw new Error('ไม่พบรหัสพนักงานนี้ในฐานข้อมูล กรุณาติดต่อ HR/Admin');

  if (String(row.status || 'Active').toLowerCase() !== 'active') {
    throw new Error('รหัสพนักงานนี้ยังไม่ได้เปิดสิทธิ์ใช้งาน');
  }

  const birthDate = parseBirthDate_(row.dateOfBirth, row.password);
  const expectedPassword = normalizeId_(row.password) || passwordFromBirthDate_(birthDate);
  if (expectedPassword && expectedPassword !== cleanPassword) {
    throw new Error('รหัสผ่านวันเดือนปีเกิดไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
  }

  recordLastLogin_(row);
  const refreshedRow = getEmployeeByIdOrEmail_(cleanId) || row;
  const profile = employeeToProfile_(refreshedRow);
  return {
    profile: profile,
    requiresSetup: !profile.nickname || !profile.departmentId
  };
}

function getUserProfile_(idOrEmail) {
  const row = getEmployeeByIdOrEmail_(idOrEmail);
  return row ? employeeToProfile_(row) : null;
}

function saveUserProfile_(idOrEmail, profile, password) {
  if (!profile) throw new Error('Missing profile payload');
  const employeeId = normalizeId_(profile.employeeId || idOrEmail);
  if (!/^\d{6}$/.test(employeeId)) throw new Error('รหัสพนักงานต้องเป็นตัวเลข 6 หลัก');

  const sheet = ensureSheet_(CONFIG.EMPLOYEE_SHEET, EMPLOYEE_HEADERS);
  const existing = getEmployeeByIdOrEmail_(employeeId);
  const birthDate = parseBirthDate_(profile.dateOfBirth, password);
  const passwordValue = normalizeId_(password) || (birthDate ? passwordFromBirthDate_(birthDate) : (existing ? existing.password : ''));
  const createdAt = existing ? existing.createdAt : now_();
  const rowValues = [
    employeeId,
    passwordValue,
    birthDate ? toIsoDate_(birthDate) : (existing ? existing.dateOfBirth : ''),
    profile.name || (existing ? existing.name : ''),
    profile.surname || profile.Surename || (existing ? existing.Surename : ''),
    profile.nickname || (existing ? existing.nickname : ''),
    canonicalDepartmentId_(profile.departmentId || (existing ? existing.departmentId : 'ceo')) || 'ceo',
    number_(profile.weekTarget, existing ? existing.weekTarget : 60000),
    number_(profile.totalTickets, existing ? existing.totalTickets : 0),
    profile.email || (existing ? existing.email : employeeId + '@thairathgroup.com'),
    'Active',
    createdAt,
    now_(),
    existing ? String(existing.lastLoginAt || '') : '',
    existing ? String(existing.lastSubmitAt || '') : ''
  ];

  if (existing) {
    sheet.getRange(existing._row, 1, 1, EMPLOYEE_HEADERS.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

function fetchAllUsers_() {
  return readObjects_(CONFIG.EMPLOYEE_SHEET, EMPLOYEE_HEADERS).map(r => {
    const profile = employeeToProfile_(r);
    return Object.assign({
      id: profile.employeeId,
      status: r.status || 'Active',
      rawDepartmentId: String(r.departmentId || '').trim(),
      departmentName: departmentLabel_(r.departmentId),
      lastLoginAt: String(r.lastLoginAt || '').trim(),
      lastSubmitAt: String(r.lastSubmitAt || '').trim()
    }, profile);
  });
}

function updateUserTickets_(employeeId, totalTickets) {
  const row = getEmployeeByIdOrEmail_(employeeId);
  if (!row) throw new Error('ไม่พบพนักงานที่ต้องการปรับตั๋ว');
  const sheet = ensureSheet_(CONFIG.EMPLOYEE_SHEET, EMPLOYEE_HEADERS);
  const col = EMPLOYEE_HEADERS.indexOf('totalTickets') + 1;
  const updatedCol = EMPLOYEE_HEADERS.indexOf('updatedAt') + 1;
  sheet.getRange(row._row, col).setValue(Math.max(0, Number(totalTickets) || 0));
  sheet.getRange(row._row, updatedCol).setValue(now_());
}

function saveUserLog_(userKey, log) {
  if (!log) throw new Error('Missing log payload');
  const user = getEmployeeByIdOrEmail_(userKey);
  if (!user) throw new Error('ไม่พบผู้ใช้งานสำหรับบันทึกก้าว');

  const sheet = ensureSheet_(CONFIG.LOG_SHEET, LOG_HEADERS);
  const logId = String(log.id || Utilities.getUuid()).trim();
  const existing = findRow_(CONFIG.LOG_SHEET, LOG_HEADERS, r => String(r.id) === logId);
  const monthNumber = number_(log.week, 1);
  const weekOfMonth = log.weekOfMonth ? number_(log.weekOfMonth, '') : '';
  const employeeId = normalizeId_(user.employeeId);

  if (weekOfMonth) {
    const duplicate = findRow_(CONFIG.LOG_SHEET, LOG_HEADERS, r =>
      String(r.id) !== logId &&
      normalizeText_(r.employeeId) === normalizeText_(employeeId) &&
      Number(r.week) === Number(monthNumber) &&
      Number(r.weekOfMonth) === Number(weekOfMonth)
    );
    if (duplicate) {
      throw new Error('พนักงานรายนี้ส่งข้อมูลของเดือนและสัปดาห์นี้แล้ว กรุณาลบรายการเดิมก่อนบันทึกใหม่');
    }
  }

  const now = now_();
  const submittedAt = log.submittedAt || now;
  const rowValues = [
    logId,
    String(user.email || (user.employeeId + '@thairathgroup.com')).toLowerCase(),
    employeeId,
    log.date || '',
    number_(log.steps, 0),
    monthNumber,
    weekOfMonth,
    log.imageName || '',
    submittedAt,
    existing ? existing.createdAt : now,
    now
  ];

  if (existing) {
    sheet.getRange(existing._row, 1, 1, LOG_HEADERS.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  updateEmployeeTimestamp_(employeeId, 'lastSubmitAt', submittedAt);
}

function fetchAllStepLogs_() {
  return readObjects_(CONFIG.LOG_SHEET, LOG_HEADERS).map(r => ({
    id: String(r.id || ''),
    userEmail: String(r.userEmail || '').toLowerCase(),
    employeeId: normalizeId_(r.employeeId),
    date: String(r.date || ''),
    steps: number_(r.steps, 0),
    week: number_(r.week, 1),
    weekOfMonth: r.weekOfMonth ? number_(r.weekOfMonth, undefined) : undefined,
    imageName: String(r.imageName || ''),
    imagePreview: '',
    submittedAt: String(r.submittedAt || '')
  }));
}

function fetchUserLogs_(userKey) {
  const key = normalizeText_(userKey);
  const user = getEmployeeByIdOrEmail_(key);
  const employeeId = user ? normalizeText_(user.employeeId) : key;
  const email = user ? normalizeText_(user.email || user.employeeId + '@thairathgroup.com') : key;

  return fetchAllStepLogs_().filter(log => {
    return normalizeText_(log.employeeId) === employeeId || normalizeText_(log.userEmail) === email;
  });
}

function deleteUserLog_(logId) {
  const sheet = ensureSheet_(CONFIG.LOG_SHEET, LOG_HEADERS);
  const row = findRow_(CONFIG.LOG_SHEET, LOG_HEADERS, r => String(r.id) === String(logId));
  if (!row) return;
  const employeeId = normalizeId_(row.employeeId);
  sheet.deleteRow(row._row);
  if (employeeId) recalculateLastSubmitAt_(employeeId);
}

function calculateLeaderboard_(currentWeek) {
  const users = fetchAllUsers_();
  const logs = fetchAllStepLogs_().filter(l => Number(l.week) === Number(currentWeek));
  const userMap = {};

  users.forEach(u => {
    userMap[normalizeText_(u.employeeId)] = u;
    userMap[normalizeText_(u.email)] = u;
  });

  const departmentCatalog = getDepartmentCatalog_(users);

  return departmentCatalog.map(dept => {
    const deptUsers = users.filter(u => sameDepartment_(u.departmentId, dept.id));
    const deptUserCount = deptUsers.length || 1;
    const deptLogs = logs.filter(l => {
      const user = userMap[normalizeText_(l.employeeId)] || userMap[normalizeText_(l.userEmail)];
      return user && sameDepartment_(user.departmentId, dept.id);
    });

    const totalSteps = deptLogs.reduce((sum, l) => sum + number_(l.steps, 0), 0);
    const uniqueParticipants = {};
    deptLogs.forEach(l => uniqueParticipants[normalizeText_(l.employeeId || l.userEmail)] = true);
    const participantCount = Object.keys(uniqueParticipants).length;

    const averageStepsPerPerson = totalSteps > 0
      ? Math.round(totalSteps / Math.max(1, participantCount))
      : 0;

    const participationRate = deptUsers.length > 0
      ? Math.round((participantCount / deptUserCount) * 100)
      : 0;

    return Object.assign({}, dept, {
      averageStepsPerPerson: averageStepsPerPerson,
      participationRate: Math.min(100, participationRate)
    });
  });
}
