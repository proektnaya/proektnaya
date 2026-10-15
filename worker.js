/* =========================================================
   ПРОЕКТНАЯ — Cloudflare Worker «телеметрия»
   Принимает визиты со страниц сайта и отдаёт статистику
   странице stats.html. Пароли проверяются ЗДЕСЬ, на сервере.

   Деплой (10 минут, бесплатно):
   1. dash.cloudflare.com → Workers & Pages → Create Worker
   2. Впиши код из этого файла, сохрани.
   3. Storage → KV → Create namespace → имя ОБЯЗАТЕЛЬНО `DB`,
      привяжи его к воркеру (Settings → Bindings → KV).
   4. Скопируй URL воркера (что-то вида https://proektnaya.<имя>.workers.dev)
      и впиши его в fx.js и stats.html (константы WORKER_URL).
   ========================================================= */

// три пароля и что каждому разрешено видеть
const PASSWORDS = {
  adminer: { level: 'full',  label: 'полный доступ' },
  adinir:  { level: 'full',  label: 'полный доступ' },
  adman:   { level: 'today', label: 'только сегодня' },
};

const CORS = {
  'access-control-allow-origin': '*', // при желании сузь до https://proektnaya.github.io
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'x-stats-key, content-type',
  'access-control-max-age': '86400',
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS },
  });
}

/* ---- разбор user-agent: модель телефона / ОС / браузер ---- */
function deviceName(ua) {
  let m;
  if (/iPhone/i.test(ua)) {
    m = ua.match(/iPhone OS (\d+)[._](\d+)/);
    return 'iPhone' + (m ? ' iOS ' + m[1] + '.' + m[2] : '');
  }
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) {
    // модель обычно в скобках перед "Build/": Redmi Note 9 Pro, SM-A515F, ...
    m = ua.match(/Android [\d.]+; ([^;)]+?)(?: Build)?[);]/);
    const model = m ? m[1].trim() : 'Android';
    return model.length > 40 ? 'Android' : model;
  }
  if (/Windows NT 10/i.test(ua)) return 'Windows ПК';
  if (/Windows/i.test(ua)) return 'Windows (старая)';
  if (/Mac OS X/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Linux';
  return ua ? 'неизвестно' : 'без юзер-агента';
}

function osName(ua) {
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iOS/i.test(ua)) return 'iOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return '?';
}

function browserName(ua) {
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/OPR\/|Opera/i.test(ua)) return 'Opera';
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return 'Chrome';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Safari\//i.test(ua)) return 'Safari';
  return '?';
}

/* ---------- логика ---------- */
async function logVisit(request, env) {
  const url = new URL(request.url);
  const ua = request.headers.get('user-agent') || '';
  const cf = request.cf || {};
  const rec = {
    ts: Date.now(),
    ip: request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '?',
    country: cf.country || '?',
    city: cf.city || '',
    device: deviceName(ua),
    os: osName(ua),
    browser: browserName(ua),
    path: (url.searchParams.get('p') || '/').slice(0, 80),
  };
  const key = 'v:' + new Date(rec.ts).toISOString().replace(/[:.]/g, '-').slice(0, 19) +
    ':' + Math.random().toString(36).slice(2, 7);
  await env.DB.put(key, JSON.stringify(rec));
  return json({ ok: true });
}

async function stats(request, env) {
  const pass = request.headers.get('x-stats-key') || '';
  const auth = PASSWORDS[pass];
  if (!auth) return json({ error: 'wrong password' }, 401);

  const { keys } = await env.DB.list({ prefix: 'v:', limit: 1000 });
  const visits = [];
  for (const k of keys) {
    const raw = await env.DB.get(k.name);
    if (raw) { try { visits.push(JSON.parse(raw)); } catch (e) {} }
  }
  visits.sort((a, b) => b.ts - a.ts);

  if (auth.level === 'today') {
    const day0 = new Date(); day0.setHours(0, 0, 0, 0);
    return json({ level: 'today', visits: visits.filter(v => v.ts >= day0.getTime()) });
  }
  return json({ level: 'full', visits });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (!env || !env.DB) {
      return json({ error: 'KV namespace "DB" не привязан к воркеру' }, 500);
    }
    const path = new URL(request.url).pathname;
    try {
      if (path === '/log') return await logVisit(request, env);
      if (path === '/stats') return await stats(request, env);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 500);
    }
    return json({ error: 'not found' }, 404);
  },
};
