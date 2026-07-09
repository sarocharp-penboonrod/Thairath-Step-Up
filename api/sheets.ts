const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

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
        service: 'thairath-step-up-sheets-proxy',
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

  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!scriptUrl) {
    return res.status(500).setHeader('Content-Type', jsonHeaders['Content-Type']).json({
      ok: false,
      error: 'Missing GOOGLE_APPS_SCRIPT_URL environment variable on Vercel'
    });
  }

  try {
    const body = readBody(req);
    const upstream = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(body),
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
