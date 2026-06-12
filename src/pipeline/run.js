import { config as dotenvConfig } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, writeFileSync, mkdirSync } from 'fs';
import { getDb, closeDb, saveDb } from '../db/connection.js';
import { migrate } from '../db/migrations.js';
import { getAttacksByDate, getDailyStats, insertReport, reportExists } from '../db/queries.js';
import { purgeOldData } from '../db/purge.js';
import { createOllamaClient } from '../llm/ollama.js';
import { generateReport, generateIndex } from './nightly.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenvConfig({ path: join(__dirname, '../../.env') });

const DB_PATH = process.env.DB_PATH || './data/sentinel.db';
const BLOG_DIR = join(__dirname, '../../blog');
const RETENTION_DAYS = parseInt(process.env.DATA_RETENTION_DAYS || '90');

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

async function runPipeline(date) {
  const targetDate = date || getYesterday();
  console.log(`[Pipeline] Starting for date: ${targetDate}`);

  const db = await getDb(DB_PATH);
  migrate(db);

  if (reportExists(db, targetDate)) {
    console.log(`[Pipeline] Report for ${targetDate} already exists. Skipping.`);
    closeDb();
    return { success: true, date: targetDate, skipped: true };
  }

  const attacks = getAttacksByDate(db, targetDate);
  const stats = getDailyStats(db, targetDate);

  console.log(`[Pipeline] Found ${attacks.length} attacks from ${stats.unique_ips} unique IPs`);

  const ollama = createOllamaClient({
    ollamaUrl: process.env.OLLAMA_URL,
    llmModel: process.env.LLM_MODEL,
    llmTimeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '5000')
  });

  let analysis = null;
  const isAvailable = await ollama.isAvailable();
  if (isAvailable && attacks.length > 0) {
    console.log('[Pipeline] Generating LLM analysis...');
    const attacksJson = attacks.slice(0, 50).map(a =>
      `- IP: ${a.source_ip}, Service: ${a.service}, Type: ${a.attack_type}, Severity: ${a.severity}, Payload: ${(a.payload || '').substring(0, 100)}`
    ).join('\n');

    analysis = await ollama.analyzeAttack({
      total_attacks: stats.total,
      unique_ips: stats.unique_ips,
      top_ips: stats.top_ips,
      services_breakdown: stats.services_breakdown,
      attacks_json: attacksJson
    });

    if (analysis) {
      console.log('[Pipeline] LLM analysis complete');
    } else {
      console.log('[Pipeline] LLM analysis failed, using basic stats');
    }
  } else {
    console.log('[Pipeline] Ollama not available or no attacks, using basic stats');
  }

  const reportData = { date: targetDate, stats, attacks, analysis };
  const html = generateReport(reportData);

  mkdirSync(BLOG_DIR, { recursive: true });
  const filename = `${targetDate}.html`;
  const filepath = join(BLOG_DIR, filename);
  writeFileSync(filepath, html, 'utf-8');
  console.log(`[Pipeline] Report written to ${filepath}`);

  insertReport(db, {
    report_date: targetDate,
    html_path: filename,
    attacks_total: stats.total,
    unique_ips: stats.unique_ips
  });

  const purgeResult = purgeOldData(db, RETENTION_DAYS);
  console.log(`[Pipeline] Purge: ${purgeResult.attacks_deleted} attacks, ${purgeResult.sessions_deleted} sessions deleted`);

  const htmlFiles = readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.html') && f !== 'index.html')
    .sort()
    .reverse()
    .map(f => ({
      filename: f,
      date: f.replace('.html', ''),
      attacks_total: 0,
      unique_ips: 0
    }));

  const indexHtml = generateIndex(htmlFiles);
  writeFileSync(join(BLOG_DIR, 'index.html'), indexHtml, 'utf-8');

  saveDb();
  closeDb();

  console.log(`[Pipeline] Complete for ${targetDate}`);
  return { success: true, date: targetDate, attacks: attacks.length };
}

const targetDate = process.argv[2];
runPipeline(targetDate).catch(err => {
  console.error('[Pipeline] Fatal error:', err);
  process.exit(1);
});
