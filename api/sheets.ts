import { createHmac, timingSafeEqual } from 'node:crypto';

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

const ADMIN_COOKIE = 'stepup_admin_session';
const ADMIN_ACTIONS = new Set([
  'fetchAllUsers',
  'fetchAllStepLogs',
  'reviewUserLog',
  'deleteUserLog',
  'adminSaveUserProfile',
  'fetchDepartmentMapping',
  'fetchEmployeeRankingOverrides',
  'saveRankingSnapshot'
]);

function readBody(req: any): any {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (_err) {
      return {};
    }
  }
  return req.body;
}

function base64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function createAdminToken(context: { displayName: string; allowedBUIds: string[] }): string {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  const payload = base64Url(JSON.stringify({
    ...context,
    exp: Date.now() + 8 * 60 * 60 * 1000
  }));
  return `${payload}.${signPayload(payload, secret)}`;
}

function parseCookies(req: any): Record<string, string> {
  const raw = String(req.headers?.cookie || '');
  return raw.split(';').reduce((result, part) => {
    const index = part.indexOf('=');
    if (index < 0) return result;
    result[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
    return result;
  }, {} as Record<string, string>);
}

function verifyAdminToken(req: any): { displayName: string; allowedBUIds: string[] } | null {
  const token = parseCookies(req)[ADMIN_COOKIE];
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
  if (!token || !secret) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = signPayload(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed.exp || Number(parsed.exp) < Date.now()) return null;
    return {
      displayName: String(parsed.displayName || 'Admin'),
      allowedBUIds: Array.isArray(parsed.allowedBUIds) ? parsed.allowedBUIds.map(String) : ['ALL']
    };
  } catch (_err) {
    return null;
  }
}

function setAdminCookie(res: any, token: string, maxAgeSeconds = 8 * 60 * 60) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`);
}

function clearAdminCookie(res: any) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    return res.status(200).setHeader('Content-Type', jsonHeaders['Content-Type']).json({
      ok: true,
      data: {
        service: 'thairath-step-up-system-proxy',
        ready: Boolean(process.env.GOOGLE_APPS_SCRIPT_URL)
      }
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET,POST,OPTIONS');
    return res.status(405).setHeader('Content-Type', jsonHeaders['Content-Type']).json({
      ok: false,
      error: 'Method not allowed'
    });
  }

  const body = readBody(req);

  if (body.action === 'verifyAdmin') {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminUsername || !adminPassword) {
      return res.status(500).setHeader('Content-Type', jsonHeaders['Content-Type']).json({
        ok: false,
        error: 'Admin credentials are not configured on Vercel'
      });
    }

    const valid = String(body.username || '').trim() === adminUsername &&
      String(body.password || '') === adminPassword;
    if (!valid) {
      return res.status(401).setHeader('Content-Type', jsonHeaders['Content-Type']).json({
        ok: false,
        error: 'ชื่อผู้ใช้หรือรหัสผ่าน Admin ไม่ถูกต้อง'
      });
    }

    const allowedBUIds = String(process.env.ADMIN_ALLOWED_BU_IDS || 'ALL')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const context = {
      displayName: String(process.env.ADMIN_DISPLAY_NAME || body.username || 'Admin'),
      allowedBUIds: allowedBUIds.length ? allowedBUIds : ['ALL']
    };
    setAdminCookie(res, createAdminToken(context));
    return res.status(200).setHeader('Content-Type', jsonHeaders['Content-Type']).json({
      ok: true,
      data: { authenticated: true, ...context }
    });
  }

  if (body.action === 'logoutAdmin') {
    clearAdminCookie(res);
    return res.status(200).setHeader('Content-Type', jsonHeaders['Content-Type']).json({
      ok: true,
      data: { loggedOut: true }
    });
  }

  const adminContext = ADMIN_ACTIONS.has(String(body.action || '')) ? verifyAdminToken(req) : null;
  if (ADMIN_ACTIONS.has(String(body.action || '')) && !adminContext) {
    return res.status(401).setHeader('Content-Type', jsonHeaders['Content-Type']).json({
      ok: false,
      error: 'Session ผู้ดูแลระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่'
    });
  }

  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!scriptUrl) {
    return res.status(500).setHeader('Content-Type', jsonHeaders['Content-Type']).json({
      ok: false,
      error: 'Missing GOOGLE_APPS_SCRIPT_URL environment variable on Vercel'
    });
  }

  try {
    const upstream = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        ...body,
        _proxySecret: process.env.APP_PROXY_SECRET || '',
        _adminContext: adminContext || undefined
      }),
      redirect: 'follow'
    });

    const text = await upstream.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (_err) {
      parsed = {
        ok: false,
        error: `Apps Script returned a non-JSON response: ${text.slice(0, 240)}`
      };
    }

    return res
      .status(upstream.ok && parsed.ok !== false ? 200 : 502)
      .setHeader('Content-Type', jsonHeaders['Content-Type'])
      .json(parsed);
  } catch (err: any) {
    return res.status(500).setHeader('Content-Type', jsonHeaders['Content-Type']).json({
      ok: false,
      error: err?.message || 'Cannot connect to Google Apps Script'
    });
  }
}
