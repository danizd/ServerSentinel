import { config as dotenvConfig } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: join(__dirname, '../../.env') });

import { getDb, closeDb } from '../db/connection.js';
import { migrate } from '../db/migrations.js';

const services = [
  { name: 'HTTP', check: async () => { try { const r = await fetch(`http://localhost:${process.env.HTTP_PORT || 80}/`, { signal: AbortSignal.timeout(3000) }); return r.ok; } catch { return false; } } },
  { name: 'SSH', check: async () => { const net = await import('net'); return new Promise(resolve => { const s = net.createConnection({ port: parseInt(process.env.SSH_PORT || '2222'), host: 'localhost' }, () => { s.destroy(); resolve(true); }); s.on('error', () => resolve(false)); s.setTimeout(3000, () => { s.destroy(); resolve(false); }); }); } },
  { name: 'FTP', check: async () => { const net = await import('net'); return new Promise(resolve => { const s = net.createConnection({ port: parseInt(process.env.FTP_PORT || '2121'), host: 'localhost' }, () => { s.destroy(); resolve(true); }); s.on('error', () => resolve(false)); s.setTimeout(3000, () => { s.destroy(); resolve(false); }); }); } },
  { name: 'MySQL', check: async () => { const net = await import('net'); return new Promise(resolve => { const s = net.createConnection({ port: parseInt(process.env.MYSQL_PORT || '3306'), host: 'localhost' }, () => { s.destroy(); resolve(true); }); s.on('error', () => resolve(false)); s.setTimeout(3000, () => { s.destroy(); resolve(false); }); }); } }
];

async function healthCheck() {
  console.log(`[HealthCheck] ${new Date().toISOString()}`);
  const results = [];

  for (const svc of services) {
    const ok = await svc.check();
    results.push({ service: svc.name, status: ok ? 'UP' : 'DOWN' });
    console.log(`  ${svc.name}: ${ok ? '✓ UP' : '✗ DOWN'}`);
  }

  const db = await getDb(process.env.DB_PATH || './data/sentinel.db');
  migrate(db);
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM attacks WHERE date(created_at) = date('now')`);
  let count = 0;
  if (stmt.step()) count = stmt.getAsObject().count;
  stmt.free();
  console.log(`  Attacks today: ${count}`);
  closeDb();

  const allUp = results.every(r => r.status === 'UP');
  console.log(`  Overall: ${allUp ? '✓ ALL SERVICES UP' : '✗ DEGRADED'}`);

  return { results, allUp };
}

healthCheck().catch(err => {
  console.error('[HealthCheck] Error:', err);
  process.exit(1);
});
