import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

let db = null;
let dbPath = null;

export async function getDb(path) {
  if (db) return db;

  dbPath = path;
  mkdirSync(dirname(path), { recursive: true });

  const SQL = await initSqlJs();

  if (existsSync(path)) {
    const buffer = readFileSync(path);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA busy_timeout = 5000');
  db.run('PRAGMA synchronous = NORMAL');
  db.run('PRAGMA foreign_keys = ON');

  return db;
}

export function saveDb() {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(dbPath, buffer);
  }
}

export function closeDb() {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
}

export function getRawDb() {
  return db;
}
