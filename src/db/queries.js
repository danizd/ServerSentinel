function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(db, sql, params = []) {
  const results = queryAll(db, sql, params);
  return results[0] || null;
}

function runSql(db, sql, params = []) {
  db.run(sql, params);
}

const SESSION_TIMEOUT_MINUTES = 30;

export function insertSession(db, sourceIp) {
  const existing = queryOne(db,
    `SELECT id FROM sessions WHERE source_ip = ? AND ended_at IS NULL
     AND datetime(started_at, '+' || ? || ' minutes') > datetime('now')`,
    [sourceIp, SESSION_TIMEOUT_MINUTES]
  );

  if (existing) return existing.id;

  runSql(db, `INSERT INTO sessions (source_ip) VALUES (?)`, [sourceIp]);
  const row = queryOne(db, `SELECT last_insert_rowid() as id`);
  return row.id;
}

export function endSession(db, sessionId) {
  runSql(db, `UPDATE sessions SET ended_at = datetime('now') WHERE id = ?`, [sessionId]);
}

export function insertAttack(db, attack) {
  const sessionId = insertSession(db, attack.source_ip);

  runSql(db,
    `UPDATE sessions SET attack_count = attack_count + 1,
     services_used = CASE
       WHEN services_used IS NULL THEN ?
       WHEN services_used LIKE '%' || ? || '%' THEN services_used
       ELSE services_used || ',' || ?
     END WHERE id = ?`,
    [attack.service, attack.service, attack.service, sessionId]
  );

  runSql(db,
    `INSERT INTO attacks (session_id, source_ip, service, attack_type, severity, payload, response, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      attack.source_ip,
      attack.service,
      attack.attack_type,
      attack.severity || 'low',
      attack.payload || null,
      attack.response || null,
      attack.metadata ? JSON.stringify(attack.metadata) : null
    ]
  );

  const row = queryOne(db, `SELECT last_insert_rowid() as id`);
  return row.id;
}

export function getAttacksByDate(db, date) {
  return queryAll(db, `SELECT * FROM attacks WHERE date(created_at) = ? ORDER BY created_at`, [date]);
}

export function getDailyStats(db, date) {
  const total = queryOne(db, `SELECT COUNT(*) as count FROM attacks WHERE date(created_at) = ?`, [date]);
  const uniqueIps = queryOne(db, `SELECT COUNT(DISTINCT source_ip) as count FROM attacks WHERE date(created_at) = ?`, [date]);
  const topIps = queryAll(db,
    `SELECT source_ip, COUNT(*) as count FROM attacks WHERE date(created_at) = ? GROUP BY source_ip ORDER BY count DESC LIMIT 10`,
    [date]
  );
  const servicesBreakdown = queryAll(db,
    `SELECT service, COUNT(*) as count FROM attacks WHERE date(created_at) = ? GROUP BY service ORDER BY count DESC`,
    [date]
  );

  return {
    total: total?.count || 0,
    unique_ips: uniqueIps?.count || 0,
    top_ips: topIps,
    services_breakdown: servicesBreakdown
  };
}

export function getActiveSessions(db) {
  return queryAll(db, `SELECT * FROM sessions WHERE ended_at IS NULL`);
}

export function insertReport(db, report) {
  runSql(db,
    `INSERT OR REPLACE INTO reports (report_date, html_path, attacks_total, unique_ips)
     VALUES (?, ?, ?, ?)`,
    [report.report_date, report.html_path, report.attacks_total, report.unique_ips]
  );
}

export function reportExists(db, date) {
  const row = queryOne(db, `SELECT id FROM reports WHERE report_date = ?`, [date]);
  return !!row;
}

export function getReportStats(db, date) {
  return queryOne(db, `SELECT attacks_total, unique_ips FROM reports WHERE report_date = ?`, [date]);
}
