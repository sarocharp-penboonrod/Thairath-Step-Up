import {
  ActiveUser,
  StepLog,
  DepartmentInfo,
  NewStepLogInput,
  VerificationStatus,
  EmployeeLoginResult,
  LeaderboardData,
  AdminSession
} from './types';
import { INITIAL_DEPARTMENTS } from './mockData';
import { CAMPAIGN_WEEKLY_TARGET } from './campaignConfig';

type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

const SHEETS_API_URL = import.meta.env.VITE_SHEETS_API_URL || '/api/sheets';

async function sheetsRequest<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(SHEETS_API_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload })
  });

  const rawText = await response.text();
  let result: ApiEnvelope<T>;

  try {
    result = JSON.parse(rawText) as ApiEnvelope<T>;
  } catch (_err) {
    throw new Error(`ไม่สามารถอ่านคำตอบจากระบบได้: ${rawText.slice(0, 140)}`);
  }

  if (!response.ok || !result.ok) {
    throw new Error(result.error || 'ระบบฐานข้อมูลทำงานไม่สำเร็จ');
  }

  return result.data as T;
}

function normalizeUserKey(userKey: string): string {
  return userKey.trim().toLowerCase();
}

function withSafeProfile(profile: ActiveUser): ActiveUser {
  const departmentId = String(profile.departmentId || '').trim();
  const buId = String(profile.buId || '').trim();
  return {
    ...profile,
    buId: buId || 'UNASSIGNED',
    departmentId: departmentId || INITIAL_DEPARTMENTS[0]?.id || 'unassigned',
    weekTarget: CAMPAIGN_WEEKLY_TARGET,
    totalTickets: Number(profile.totalTickets) || 0,
    age: profile.age ? Number(profile.age) : undefined
  };
}

function normalizeLeaderboard(data?: LeaderboardData | null): LeaderboardData {
  return {
    departments: data?.departments?.length ? data.departments : INITIAL_DEPARTMENTS,
    businessUnits: data?.businessUnits || [],
    generatedAt: data?.generatedAt || new Date().toISOString()
  };
}

export async function seedInitialDataIfNecessary() {
  try {
    await sheetsRequest<{ ready: boolean }>('setup');
  } catch (err) {
    console.warn('System setup check skipped:', err);
  }
}

export async function verifyAdminLogin(username: string, password: string): Promise<AdminSession> {
  return sheetsRequest<AdminSession>('verifyAdmin', {
    username: username.trim(),
    password
  });
}

export async function verifyEmployeeLogin(
  employeeId: string,
  password: string,
  currentMonth: number
): Promise<EmployeeLoginResult> {
  const result = await sheetsRequest<EmployeeLoginResult>('verifyLogin', {
    employeeId: employeeId.trim(),
    password: password.trim(),
    currentMonth
  });

  return {
    ...result,
    profile: withSafeProfile(result.profile),
    logs: (result.logs || []).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '')),
    leaderboard: normalizeLeaderboard(result.leaderboard)
  };
}

export async function getUserProfile(idOrEmail: string): Promise<ActiveUser | null> {
  try {
    const profile = await sheetsRequest<ActiveUser | null>('getUserProfile', {
      idOrEmail: normalizeUserKey(idOrEmail)
    });
    return profile ? withSafeProfile(profile) : null;
  } catch (err) {
    console.error('Error getting user profile:', err);
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
    console.error('Error fetching logs:', err);
    return [];
  }
}

export async function saveUserLog(userKey: string, input: NewStepLogInput): Promise<StepLog> {
  return sheetsRequest<StepLog>('saveUserLog', {
    userKey: normalizeUserKey(userKey),
    log: {
      ...input,
      id: `log-${Date.now()}`,
      submittedAt: new Date().toISOString()
    }
  });
}

export async function reviewUserLog(
  logId: string,
  verificationStatus: Extract<VerificationStatus, 'APPROVED' | 'REJECTED'>,
  reviewNote = ''
): Promise<StepLog> {
  return sheetsRequest<StepLog>('reviewUserLog', {
    logId,
    verificationStatus,
    reviewNote
  });
}

export async function deleteUserLog(logId: string) {
  await sheetsRequest<{ deleted: boolean }>('deleteUserLog', { logId });
}

export async function calculateSheetsLeaderboard(currentMonth: number, forceRefresh = false): Promise<LeaderboardData> {
  try {
    const leaderboard = await sheetsRequest<LeaderboardData>('calculateLeaderboard', { currentMonth, forceRefresh });
    return normalizeLeaderboard(leaderboard);
  } catch (err) {
    console.error('Error fetching leaderboard data:', err);
    return normalizeLeaderboard(null);
  }
}

export async function adminCreateUserOrUpdateProfile(idOrEmail: string, profile: ActiveUser, passwordText?: string) {
  await sheetsRequest<{ saved: boolean }>('adminSaveUserProfile', {
    idOrEmail: normalizeUserKey(profile.employeeId || idOrEmail),
    profile,
    password: passwordText
  });
}

export async function fetchAllUsers(): Promise<unknown[]> {
  return sheetsRequest<unknown[]>('fetchAllUsers');
}

export async function fetchAllStepLogs(): Promise<unknown[]> {
  const logs = await sheetsRequest<StepLog[]>('fetchAllStepLogs');
  return logs.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
}

export async function logoutAdmin(): Promise<void> {
  try {
    await sheetsRequest<{ loggedOut: boolean }>('logoutAdmin');
  } catch (err) {
    console.warn('Admin logout cleanup skipped:', err);
  }
}
