function runSql(db, sql, params = []) {
  db.run(sql, params);
}

function queryOne(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  let result = null;
  if (stmt.step()) result = stmt.getAsObject();
  stmt.free();
  return result;
}

export function purgeOldData(db, retentionDays) {
  const cutoff = `-${retentionDays} days`;

  const beforeAttacks = queryOne(db, `SELECT COUNT(*) as count FROM attacks`);
  runSql(db, `DELETE FROM attacks WHERE created_at < datetime('now', ?)`, [cutoff]);
  const afterAttacks = queryOne(db, `SELECT COUNT(*) as count FROM attacks`);

  const beforeSessions = queryOne(db, `SELECT COUNT(*) as count FROM sessions`);
  runSql(db,
    `DELETE FROM sessions WHERE id NOT IN (SELECT DISTINCT session_id FROM attacks WHERE session_id IS NOT NULL)
     AND ended_at < datetime('now', ?)`,
    [cutoff]
  );
  const afterSessions = queryOne(db, `SELECT COUNT(*) as count FROM sessions`);

  return {
    attacks_deleted: (beforeAttacks?.count || 0) - (afterAttacks?.count || 0),
    sessions_deleted: (beforeSessions?.count || 0) - (afterSessions?.count || 0)
  };
}
