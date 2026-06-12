export function migrate(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_ip TEXT NOT NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT,
      attack_count INTEGER DEFAULT 0,
      services_used TEXT
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_sessions_source_ip ON sessions(source_ip)');
  db.run('CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at)');

  db.run(`
    CREATE TABLE IF NOT EXISTS attacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      source_ip TEXT NOT NULL,
      service TEXT NOT NULL,
      attack_type TEXT NOT NULL,
      severity TEXT DEFAULT 'low',
      payload TEXT,
      response TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_attacks_source_ip ON attacks(source_ip)');
  db.run('CREATE INDEX IF NOT EXISTS idx_attacks_created_at ON attacks(created_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_attacks_service ON attacks(service)');

  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_date TEXT NOT NULL UNIQUE,
      html_path TEXT,
      attacks_total INTEGER,
      unique_ips INTEGER,
      generated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}
