const FAKE_DATA = {
  users: [
    { id: 1, username: 'admin', email: 'admin@company.com', password_hash: '$2b$12$LJ3m4ys3Lg.Ky8Z3.qXz5O4S3j8K5z9X2v1b4n7m8j9k0l', role: 'superuser', created_at: '2024-01-15 10:30:00' },
    { id: 2, username: 'operator', email: 'ops@company.com', password_hash: '$2b$12$Mk4n5x8R2t6Y7z1W3q8E5r9T0u2i4o6p8a0s2d4f6g8h0j', role: 'admin', created_at: '2024-03-20 14:00:00' },
    { id: 3, username: 'viewer', email: 'view@company.com', password_hash: '$2b$12$Nl6o7y0S4u8A2b4C6d8E0f2G4h6I8j0K2l4M6n8O0p2Q4r', role: 'readonly', created_at: '2024-06-10 09:15:00' },
    { id: 4, username: 'test', email: 'test@company.com', password_hash: '$2b$12$Om8p9z2T6w0C4e6F8g0I2k4L6m8N0q2R4s6T8u0V2w4X6y', role: 'test', created_at: '2025-01-05 16:45:00' },
    { id: 5, username: 'backup', email: 'backup@company.com', password_hash: '$2b$12$Pn0q1a4U8x2G6i8J0k2M4o6P8q0S2t4V6w8Y0a2c4e6f8g0', role: 'system', created_at: '2025-06-01 02:00:00' }
  ],
  orders: [
    { id: 1001, user_id: 1, total: 149.99, status: 'completed', created_at: '2026-06-10 08:30:00' },
    { id: 1002, user_id: 2, total: 79.50, status: 'pending', created_at: '2026-06-11 14:20:00' },
    { id: 1003, user_id: 3, total: 299.00, status: 'shipped', created_at: '2026-06-12 09:00:00' }
  ],
  products: [
    { id: 1, name: 'Pro Subscription', price: 29.99, stock: 500, category: 'subscription' },
    { id: 2, name: 'Enterprise License', price: 499.00, stock: 50, category: 'license' },
    { id: 3, name: 'Support Package', price: 99.00, stock: 200, category: 'service' },
    { id: 4, name: 'Training Course', price: 199.00, stock: 100, category: 'education' }
  ],
  logs: [
    { id: 1, action: 'user.login', ip_address: '192.168.1.100', timestamp: '2026-06-12 23:45:01' },
    { id: 2, action: 'config.update', ip_address: '192.168.1.100', timestamp: '2026-06-12 23:42:15' },
    { id: 3, action: 'backup.complete', ip_address: '127.0.0.1', timestamp: '2026-06-12 23:38:44' },
    { id: 4, action: 'system.health', ip_address: '127.0.0.1', timestamp: '2026-06-12 23:30:00' },
    { id: 5, action: 'user.logout', ip_address: '192.168.1.100', timestamp: '2026-06-12 23:25:00' }
  ],
  config: [
    { key: 'site_name', value: 'Production Server', updated_at: '2026-06-01 10:00:00' },
    { key: 'max_upload_size', value: '10485760', updated_at: '2026-06-01 10:00:00' },
    { key: 'session_timeout', value: '3600', updated_at: '2026-06-01 10:00:00' },
    { key: 'backup_enabled', value: 'true', updated_at: '2026-06-01 10:00:00' },
    { key: 'ssl_cert_path', value: '/etc/ssl/certs/server.crt', updated_at: '2026-06-01 10:00:00' }
  ]
};

const TABLE_COLUMNS = {
  users: 'id|username|email|password_hash|role|created_at',
  orders: 'id|user_id|total|status|created_at',
  products: 'id|name|price|stock|category',
  logs: 'id|action|ip_address|timestamp',
  config: 'key|value|updated_at'
};

const COLUMN_TYPES = {
  users: 'int varchar(50) varchar(100) varchar(255) varchar(20) datetime',
  orders: 'int int decimal(10,2) varchar(20) datetime',
  products: 'int varchar(100) decimal(10,2) int varchar(50)',
  logs: 'int varchar(50) varchar(45) datetime',
  config: 'varchar(50) varchar(255) datetime'
};

export function handleQuery(query) {
  const q = query.trim().replace(/;/g, '').trim();
  const upper = q.toUpperCase();

  if (upper === 'SELECT VERSION()') {
    return { type: 'resultset', columns: ['VERSION()'], rows: [['5.7.42-0ubuntu0.18.04.1']] };
  }
  if (upper === 'SELECT USER()' || upper === 'SELECT CURRENT_USER()') {
    return { type: 'resultset', columns: ['USER()'], rows: [['root@localhost']] };
  }
  if (upper === 'SELECT DATABASE()' || upper === 'SELECT SCHEMA()') {
    return { type: 'resultset', columns: ['DATABASE()'], rows: [[null]] };
  }
  if (upper === 'SHOW DATABASES' || upper === 'SHOW SCHEMAS') {
    return { type: 'resultset', columns: ['Database'], rows: [['production_db']] };
  }
  if (upper === 'SHOW TABLES') {
    return { type: 'resultset', columns: [`Tables_in_production_db`], rows: [['users'], ['orders'], ['products'], ['logs'], ['config']] };
  }

  const descMatch = q.match(/DESCRIBE\s+(\w+)/i) || q.match(/DESC\s+(\w+)/i) || q.match(/SHOW\s+COLUMNS\s+FROM\s+(\w+)/i);
  if (descMatch) {
    const table = descMatch[1].toLowerCase();
    if (!TABLE_COLUMNS[table]) return { type: 'error', error: `Table '${table}' doesn't exist` };
    const cols = TABLE_COLUMNS[table].split('|');
    const types = COLUMN_TYPES[table].split(' ');
    const rows = cols.map((c, i) => [c, types[i], 'YES', 'PRI', null, '']);
    return { type: 'resultset', columns: ['Field', 'Type', 'Null', 'Key', 'Default', 'Extra'], rows };
  }

  const selectMatch = q.match(/SELECT\s+\*\s+FROM\s+(\w+)/i);
  if (selectMatch) {
    const table = selectMatch[1].toLowerCase();
    if (!FAKE_DATA[table]) return { type: 'error', error: `Table '${table}' doesn't exist` };
    const data = FAKE_DATA[table];
    const cols = TABLE_COLUMNS[table].split('|');
    const rows = data.map(row => cols.map(c => row[c]));
    return { type: 'resultset', columns: cols, rows };
  }

  if (upper.startsWith('USE ')) {
    return { type: 'ok', message: 'Database changed' };
  }

  if (upper.startsWith('INSERT') || upper.startsWith('UPDATE') || upper.startsWith('DELETE') ||
      upper.startsWith('CREATE') || upper.startsWith('ALTER') || upper.startsWith('DROP') ||
      upper.startsWith('SET') || upper.startsWith('TRUNCATE')) {
    return { type: 'ok', affectedRows: 0 };
  }

  return { type: 'error', error: `You have an error in your SQL syntax; check the manual that corresponds to your MySQL Server version for the right syntax to use near '${q.substring(0, 50)}' at line 1` };
}

export function detectSqlInjection(query) {
  const patterns = [
    /UNION\s+(ALL\s+)?SELECT/i,
    /OR\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,
    /OR\s+1\s*=\s*1/i,
    /--\s*$/,
    /\/\*.*\*\//,
    /;\s*DROP/i,
    /;\s*DELETE/i,
    /;\s*UPDATE/i,
    /SLEEP\s*\(/i,
    /BENCHMARK\s*\(/i,
    /LOAD_FILE\s*\(/i,
    /INTO\s+(OUTFILE|DUMPFILE)/i,
    /EXEC\s*\(/i,
    /EXECUTE\s+IMMEDIATE/i,
    /CONCAT\s*\(/i,
    /CHAR\s*\(/i,
    /0x[0-9a-f]+/i
  ];

  return patterns.some(p => p.test(query));
}
