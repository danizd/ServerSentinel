import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = join(__dirname, '../blog');
config({ path: join(__dirname, '../.env') });

import { getDb, closeDb, saveDb } from './db/connection.js';
import { migrate } from './db/migrations.js';
import { startHttpHoneypot } from './honeypots/http.js';
import { startSshHoneypot } from './honeypots/ssh.js';
import { startFtpHoneypot } from './honeypots/ftp.js';
import { startMysqlHoneypot } from './honeypots/mysql.js';
import { startBlogServer } from './blog-server.js';

const appConfig = {
  httpPort: parseInt(process.env.HTTP_PORT || '80'),
  sshPort: parseInt(process.env.SSH_PORT || '2222'),
  ftpPort: parseInt(process.env.FTP_PORT || '2121'),
  mysqlPort: parseInt(process.env.MYSQL_PORT || '3306'),
  blogPort: parseInt(process.env.BLOG_PORT || '8080'),
  dbPath: process.env.DB_PATH || './data/sentinel.db',
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  llmModel: process.env.LLM_MODEL || 'qwen2.5:1.5b',
  llmTimeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '5000'),
  rateLimitRPM: parseInt(process.env.RATE_LIMIT_RPM || '60'),
  adminUser: process.env.ADMIN_USER || 'admin',
  adminPass: process.env.ADMIN_PASS || 'admin',
  simulationMode: process.env.SIMULATION_MODE || 'full'
};

console.log('╔══════════════════════════════════════════╗');
console.log('║        ServerSentinel v1.0.0             ║');
console.log('║    Honeypot Threat Detection System      ║');
console.log('╚══════════════════════════════════════════╝');
console.log('');

const db = await getDb(appConfig.dbPath);
migrate(db);
console.log(`[DB] SQLite connected at ${appConfig.dbPath}`);

const servers = [];

try {
  const httpServer = await startHttpHoneypot(db, {
    port: appConfig.httpPort,
    adminUser: appConfig.adminUser,
    adminPass: appConfig.adminPass,
    rateLimitRPM: appConfig.rateLimitRPM,
    ollamaUrl: appConfig.ollamaUrl,
    llmModel: appConfig.llmModel,
    llmTimeoutMs: appConfig.llmTimeoutMs
  });
  servers.push(httpServer);
  console.log(`[HTTP] Honeypot listening on port ${appConfig.httpPort}`);
} catch (err) {
  console.error(`[HTTP] Failed to start: ${err.message}`);
}

try {
  const sshServer = await startSshHoneypot(db, { port: appConfig.sshPort });
  servers.push(sshServer);
  console.log(`[SSH]  Honeypot listening on port ${appConfig.sshPort}`);
} catch (err) {
  console.error(`[SSH]  Failed to start: ${err.message}`);
}

try {
  const ftpServer = await startFtpHoneypot(db, { port: appConfig.ftpPort });
  servers.push(ftpServer);
  console.log(`[FTP]  Honeypot listening on port ${appConfig.ftpPort}`);
} catch (err) {
  console.error(`[FTP]  Failed to start: ${err.message}`);
}

try {
  const mysqlServer = await startMysqlHoneypot(db, { port: appConfig.mysqlPort });
  servers.push(mysqlServer);
  console.log(`[MySQL] Honeypot listening on port ${appConfig.mysqlPort}`);
} catch (err) {
  console.error(`[MySQL] Failed to start: ${err.message}`);
}

try {
  const blogServer = await startBlogServer(BLOG_DIR, appConfig.blogPort);
  servers.push(blogServer);
  console.log(`[BLOG]  Static blog on port ${appConfig.blogPort}`);
} catch (err) {
  console.error(`[BLOG]  Failed to start: ${err.message}`);
}

console.log('');
console.log('[SYS] ServerSentinel is running. Press Ctrl+C to stop.');

process.on('SIGINT', () => {
  console.log('\n[SYS] Shutting down...');
  for (const s of servers) {
    if (s && s.close) s.close();
  }
  saveDb();
  closeDb();
  console.log('[SYS] Goodbye.');
  process.exit(0);
});

process.on('SIGTERM', () => {
  for (const s of servers) {
    if (s && s.close) s.close();
  }
  saveDb();
  closeDb();
  process.exit(0);
});
