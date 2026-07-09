import { ActiveUser, StepLog, DepartmentInfo } from './types';
import { INITIAL_DEPARTMENTS } from './mockData';

type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

type LoginResult = {
  profile: ActiveUser;
  requiresSetup: boolean;
};

const SHEETS_API_URL = import.meta.env.VITE_SHEETS_API_URL || '/api/sheets';

async function sheetsRequest<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(SHEETS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action, ...payload })
  });

  const rawText = await response.text();
  let result: ApiEnvelope<T>;

  try {
    result = JSON.parse(rawText) as ApiEnvelope<T>;
  } catch (_err) {
    throw new Error(`ไม่สามารถอ่านคำตอบจาก Google Sheets API ได้: ${rawText.slice(0, 140)}`);
  }

  if (!response.ok || !result.ok) {
    throw new Error(result.error || 'Google Sheets API ทำงานไม่สำเร็จ');
  }

  return result.data as T;
}

function normalizeUserKey(userKey: string): string {
  return userKey.trim().toLowerCase();
}

function withSafeDepartment(profile: ActiveUser): ActiveUser {
  const departmentId = String(profile.departmentId || '').trim();
  return {
    ...profile,
    departmentId: departmentId || INITIAL_DEPARTMENTS[0]?.id || 'ceo',
    weekTarget: Number(profile.weekTarget) || 60000,
    totalTickets: Number(profile.totalTickets) || 0,
    age: profile.age ? Number(profile.age) : undefined
  };
}

// Google Sheets setup is handled by the Apps Script endpoint.
export async function seedInitialDataIfNecessary() {
  try {
    await sheetsRequest<{ ready: boolean }>('setup');
  } catch (err) {
    console.warn('Google Sheets setup check skipped:', err);
  }
}

export async function verifyEmployeeLogin(employeeId: string, password: string): Promise<LoginResult> {
  const result = await sheetsRequest<LoginResult>('verifyLogin', {
    employeeId: employeeId.trim(),
    password: password.trim()
  });

  return {
    ...result,
    profile: withSafeDepartment(result.profile)
  };
}

export async function getUserProfile(idOrEmail: string): Promise<ActiveUser | null> {
  try {
    const profile = await sheetsRequest<ActiveUser | null>('getUserProfile', {
      idOrEmail: normalizeUserKey(idOrEmail)
    });
    return profile ? withSafeDepartment(profile) : null;
  } catch (err) {
    console.error('Error getting user profile from Google Sheets:', err);
    return null;
  }
}

export async function createUserOrUpdateProfile(idOrEmail: string, profile: ActiveUser, passwordText?: string) {
  await sheetsRequest<{ saved: boolean }>('saveUserProfile', {
    idOrEmail: normalizeUserKey(profile.employeeId || idOrEmail),
    profile,
    password: passwordText
  });
}

export async function fetchUserLogs(userKey: string): Promise<StepLog[]> {
  try {
    const logs = await sheetsRequest<StepLog[]>('fetchUserLogs', {
      userKey: normalizeUserKey(userKey)
    });
    return logs.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  } catch (err) {
    console.error('Error fetching logs from Google Sheets:', err);
    return [];
  }
}

export async function saveUserLog(userKey: string, log: StepLog) {
  const payload: StepLog = {
    ...log,
    // Google Sheets has a 50,000-character cell limit, so we do not persist the base64 preview.
    imagePreview: undefined
  };

  await sheetsRequest<{ saved: boolean }>('saveUserLog', {
    userKey: normalizeUserKey(userKey),
    log: payload
  });
}

export async function deleteUserLog(logId: string) {
  await sheetsRequest<{ deleted: boolean }>('deleteUserLog', {
    logId
  });
}

export async function updateUserTickets(employeeId: string, totalTickets: number) {
  await sheetsRequest<{ saved: boolean }>('updateUserTickets', {
    employeeId: employeeId.trim(),
    totalTickets: Math.max(0, Number(totalTickets) || 0)
  });
}

export async function calculateSheetsLeaderboard(currentWeek: number): Promise<DepartmentInfo[]> {
  try {
    const leaderboard = await sheetsRequest<DepartmentInfo[]>('calculateLeaderboard', {
      currentWeek
    });
    return leaderboard && leaderboard.length > 0 ? leaderboard : INITIAL_DEPARTMENTS;
  } catch (err) {
    console.error('Error fetching dynamic leaderboard data from Google Sheets:', err);
    return INITIAL_DEPARTMENTS;
  }
}

export async function fetchAllUsers(): Promise<any[]> {
  try {
    return await sheetsRequest<any[]>('fetchAllUsers');
  } catch (err) {
    console.error('Error fetching all users for admin from Google Sheets:', err);
    return [];
  }
}

export async function fetchAllStepLogs(): Promise<any[]> {
  try {
    const logs = await sheetsRequest<any[]>('fetchAllStepLogs');
    return logs.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  } catch (err) {
    console.error('Error fetching all step logs for admin from Google Sheets:', err);
    return [];
  }
}

