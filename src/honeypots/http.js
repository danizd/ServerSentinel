import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { insertAttack } from '../db/queries.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

function loadTemplates() {
  const tplDir = join(PROJECT_ROOT, 'templates', 'html');
  return {
    login: readFileSync(join(tplDir, 'login.html'), 'utf-8'),
    error: readFileSync(join(tplDir, 'error.html'), 'utf-8'),
    dashboard: readFileSync(join(tplDir, 'dashboard.html'), 'utf-8'),
    apiResponse: readFileSync(join(tplDir, 'api-response.json'), 'utf-8'),
  };
}

function generateSessionToken() {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

const SQL_INJECTION_PATTERN = /(\b(union|select|insert|update|delete|drop|truncate|exec|execute|xp_|sp_|0x[0-9a-f]+|--|#|\/\*|\*\/|;)\b)|('(\s)*(or|and)(\s)*')|((\bor\b|\band\b)\s+\d+\s*=\s*\d+)/i;

const XSS_PATTERN = /<script|javascript:|on\w+\s*=|<iframe|<object|<embed|<applet|<form|<svg\s+on/i;

const SEVERITY = {
  NORMAL: 'low',
  LOGIN: 'medium',
  SQL_INJECTION: 'critical',
  XSS: 'critical',
};

function classifySeverity(method, path, body, username, password) {
  const payload = [path, body, username, password].filter(Boolean).join(' ');
  if (SQL_INJECTION_PATTERN.test(payload)) return SEVERITY.SQL_INJECTION;
  if (XSS_PATTERN.test(payload)) return SEVERITY.XSS;
  if (method === 'POST' && path === '/login') return SEVERITY.LOGIN;
  return SEVERITY.NORMAL;
}

function getRequestIp(request) {
  return request.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || request.headers['x-real-ip']
    || request.ip
    || '127.0.0.1';
}

export async function startHttpHoneypot(db, config) {
  const templates = loadTemplates();
  const sessions = new Map();

  const app = Fastify({
    logger: false,
    trustProxy: true,
  });

  await app.register(rateLimit, {
    max: config.rateLimitRPM || 60,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({ error: 'Too Many Requests' }),
  });

  app.addHook('onSend', async (request, reply) => {
    reply.header('Server', 'Apache/2.4.41 (Ubuntu)');
  });

  function logAttack(request, attackType, severity, payload, response) {
    try {
      insertAttack(db, {
        source_ip: getRequestIp(request),
        service: 'http',
        attack_type: attackType,
        severity,
        payload: payload || null,
        response: response || null,
        metadata: {
          method: request.method,
          path: request.url,
          headers: request.headers,
          user_agent: request.headers['user-agent'] || null,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      // Never crash the server on logging failure
    }
  }

  function parseBody(request) {
    try {
      if (request.body && typeof request.body === 'object') return request.body;
      if (typeof request.body === 'string') return JSON.parse(request.body);
    } catch {}
    return {};
  }

  function getSessionFromCookie(request) {
    const cookie = request.headers.cookie || '';
    const match = cookie.match(/sentinel_session=([a-f0-9]+)/);
    if (!match) return null;
    return sessions.get(match[1]) || null;
  }

  // ── GET / ── Login page ──
  app.get('/', async (request, reply) => {
    logAttack(request, 'http_access', SEVERITY.NORMAL, request.url, 'login_page');

    const html = templates.login
      .replace('{{ERROR_DISPLAY}}', 'none')
      .replace('{{ERROR_MESSAGE}}', '');

    return reply.type('text/html').send(html);
  });

  // ── POST /login ── Process login (ALWAYS 200) ──
  app.post('/login', async (request, reply) => {
    const body = parseBody(request);
    const username = body.username || '';
    const password = body.password || '';

    const severity = classifySeverity('POST', '/login', null, username, password);
    logAttack(request, 'login_attempt', severity,
      `user=${username}&pass=${password}`,
      severity === SEVERITY.SQL_INJECTION || severity === SEVERITY.XSS ? 'blocked' : null
    );

    // Dual mode: admin/admin → dashboard, else → error
    if (username === config.adminUser && password === config.adminPass) {
      const token = generateSessionToken();
      sessions.set(token, {
        ip: getRequestIp(request),
        loginTime: new Date().toISOString(),
        pagesVisited: ['/'],
      });

      return reply
        .type('text/html')
        .setCookie('sentinel_session', token, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 1800,
        })
        .send(templates.dashboard);
    }

    // Invalid credentials — ALWAYS 200, never 401/403
    const html = templates.login
      .replace('{{ERROR_DISPLAY}}', 'block')
      .replace('{{ERROR_MESSAGE}}', 'Invalid username or password. Access denied.');

    return reply.type('text/html').send(html);
  });

  // ── GET /dashboard ── Protected panel ──
  app.get('/dashboard', async (request, reply) => {
    const session = getSessionFromCookie(request);

    if (!session) {
      logAttack(request, 'unauthorized_access', SEVERITY.NORMAL, '/dashboard', 'redirect');
      return reply.redirect('/');
    }

    session.pagesVisited.push('/dashboard');
    logAttack(request, 'http_access', SEVERITY.NORMAL, '/dashboard', 'dashboard_page');

    return reply.type('text/html').send(templates.dashboard);
  });

  // ── GET/POST /api/v1/* ── Fake API endpoints ──
  app.all('/api/v1/*', async (request, reply) => {
    const severity = classifySeverity(request.method, request.url, JSON.stringify(request.body), null, null);
    logAttack(request, 'api_access', severity, request.url, 'json_response');

    const timestamp = new Date().toISOString();
    const json = templates.apiResponse.replace(/\{\{TIMESTAMP\}\}/g, timestamp);

    return reply.type('application/json').send(json);
  });

  // ── Catch-all ──
  app.setNotFoundHandler(async (request, reply) => {
    const severity = classifySeverity(request.method, request.url, null, null, null);
    logAttack(request, 'http_access', severity, request.url, '404');

    if (request.url.startsWith('/api/')) {
      return reply.code(404).type('application/json').send({
        error: 'Not found',
        path: request.url,
        timestamp: new Date().toISOString(),
      });
    }

    return reply.redirect('/');
  });

  const port = config.port || 80;
  await app.listen({ port, host: '0.0.0.0' });

  return app;
}
