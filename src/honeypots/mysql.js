import { createServer } from 'node:net';
import crypto from 'node:crypto';
import { insertAttack } from '../db/queries.js';

const SERVER_VERSION = '5.7.42-0ubuntu0.18.04.1';
const CAPABILITY_FLAGS_LOWER = 0xf7ff;
const CAPABILITY_FLAGS_UPPER = 0x807f;
const STATUS_FLAGS = 0x0002;
const CHARSET = 0x21; // utf8mb4

const COM_QUIT = 0x01;
const COM_QUERY = 0x03;

const SQL_INJECTION_PATTERNS = [
  /UNION\s+SELECT/i,
  /OR\s+1\s*=\s*1/i,
  /--/,
  /;DROP/i,
  /\/\*/,
  /\*\/|;\s*DROP/i,
  /CONCAT\s*\(/i,
  /SLEEP\s*\(/i,
  /BENCHMARK\s*\(/i,
  /LOAD_FILE\s*\(/i,
  /INTO\s+(OUT|DUMP)FILE/i,
  /WAITFOR\s+DELAY/i,
  /CHAR\s*\(/i,
  /0x[0-9a-fA-F]+/,
  /GROUP\s+BY.*HAVING/i,
  /EXTRACTVALUE\s*\(/i,
  /UPDATEXML\s*\(/i,
];

const FAKE_USERS = [
  { id: 1, username: 'admin', email: 'admin@corp.com', password_hash: '$2b$12$LJ3m4ys3Lz0wqV9rK5eJxuQGvR5YHtK7aDpCfX1mN0oP2qR3sT4u', role: 'admin', created_at: '2024-01-15 08:30:00' },
  { id: 2, username: 'operator', email: 'operator@corp.com', password_hash: '$2b$12$kR9xN2wP4qL7mJ1vH5tYbOeDfG3aS6dF8gH0jK2lZ4xC7vB9nM1p', role: 'operator', created_at: '2024-03-22 14:15:00' },
  { id: 3, username: 'viewer', email: 'viewer@corp.com', password_hash: '$2b$12$mP1qR3sT5uV7wX9yA2bC4dE6fG8hI0jK2lM4nO6pQ8rS0tU2vW4x', role: 'viewer', created_at: '2024-06-10 09:45:00' },
  { id: 4, username: 'test', email: 'test@corp.com', password_hash: '$2b$12$nQ2rS4tU6vW8xY0aB3cD5eF7gH9iJ1kL3mN5oP7qR9sT1uV3wX5y', role: 'viewer', created_at: '2024-09-05 11:20:00' },
  { id: 5, username: 'backup', email: 'backup@corp.com', password_hash: '$2b$12$oR3sT5uV7wX9yA1bC4dE6fG8hI0jK2lM4nO6pQ8rS0tU2vW4xY6z', role: 'operator', created_at: '2024-12-01 16:00:00' },
];

const FAKE_ORDERS = [
  { id: 1001, user_id: 1, total: 249.99, status: 'completed', created_at: '2025-01-10 13:25:00' },
  { id: 1002, user_id: 2, total: 89.50, status: 'shipped', created_at: '2025-02-18 09:10:00' },
  { id: 1003, user_id: 3, total: 1549.00, status: 'pending', created_at: '2025-03-25 17:45:00' },
];

const FAKE_PRODUCTS = [
  { id: 1, name: 'Widget Pro', price: 49.99, stock: 150, category: 'Electronics' },
  { id: 2, name: 'Gadget Plus', price: 129.95, stock: 75, category: 'Accessories' },
  { id: 3, name: 'Service Annual', price: 599.00, stock: 999, category: 'Services' },
  { id: 4, name: 'Support Ticket', price: 19.99, stock: 500, category: 'Services' },
];

const FAKE_LOGS = [
  { id: 1, action: 'user_login', ip_address: '192.168.1.100', timestamp: '2025-04-01 08:00:00' },
  { id: 2, action: 'data_export', ip_address: '192.168.1.100', timestamp: '2025-04-01 08:15:00' },
  { id: 3, action: 'config_change', ip_address: '10.0.0.55', timestamp: '2025-04-02 14:30:00' },
];

const FAKE_CONFIG = [
  { key: 'app_name', value: 'ServerSentinel', updated_at: '2025-01-01 00:00:00' },
  { key: 'version', value: '2.4.1', updated_at: '2025-03-15 12:00:00' },
  { key: 'max_connections', value: '100', updated_at: '2025-02-10 09:00:00' },
  { key: 'session_timeout', value: '1800', updated_at: '2025-01-20 16:30:00' },
];

const TABLE_SCHEMAS = {
  users: [
    { field: 'id', type: 'int(11)' },
    { field: 'username', type: 'varchar(50)' },
    { field: 'email', type: 'varchar(100)' },
    { field: 'password_hash', type: 'varchar(255)' },
    { field: 'role', type: 'varchar(20)' },
    { field: 'created_at', type: 'datetime' },
  ],
  orders: [
    { field: 'id', type: 'int(11)' },
    { field: 'user_id', type: 'int(11)' },
    { field: 'total', type: 'decimal(10,2)' },
    { field: 'status', type: 'varchar(20)' },
    { field: 'created_at', type: 'datetime' },
  ],
  products: [
    { field: 'id', type: 'int(11)' },
    { field: 'name', type: 'varchar(100)' },
    { field: 'price', type: 'decimal(10,2)' },
    { field: 'stock', type: 'int(11)' },
    { field: 'category', type: 'varchar(50)' },
  ],
  logs: [
    { field: 'id', type: 'int(11)' },
    { field: 'action', type: 'varchar(50)' },
    { field: 'ip_address', type: 'varchar(45)' },
    { field: 'timestamp', type: 'datetime' },
  ],
  config: [
    { field: 'key', type: 'varchar(50)' },
    { field: 'value', type: 'varchar(255)' },
    { field: 'updated_at', type: 'datetime' },
  ],
};

function createPacket(sequenceId, payload) {
  const length = payload.length;
  const header = Buffer.alloc(4);
  header[0] = length & 0xff;
  header[1] = (length >> 8) & 0xff;
  header[2] = (length >> 16) & 0xff;
  header[3] = sequenceId;
  return Buffer.concat([header, payload]);
}

function createHandshake() {
  const connectionId = crypto.randomInt(1, 0xffffff);
  const scramblePart1 = crypto.randomBytes(8);
  const scramblePart2 = crypto.randomBytes(12);
  const scramble = Buffer.concat([scramblePart1, scramblePart2]);

  const payload = [];
  payload.push(Buffer.from([0x0a]));
  payload.push(Buffer.from(SERVER_VERSION + '\0'));
  payload.writeUInt32LE(connectionId, 0);
  payload.push(Buffer.from([0x00, 0x00, 0x00, 0x00]));
  payload.push(Buffer.from([CAPABILITY_FLAGS_LOWER & 0xff, (CAPABILITY_FLAGS_LOWER >> 8) & 0xff]));
  payload.push(Buffer.from([CHARSET]));
  payload.push(Buffer.from([STATUS_FLAGS & 0xff, (STATUS_FLAGS >> 8) & 0xff]));
  payload.push(Buffer.from([CAPABILITY_FLAGS_UPPER & 0xff, (CAPABILITY_FLAGS_UPPER >> 8) & 0xff]));
  payload.push(Buffer.from([scramble.length]));
  payload.push(Buffer.alloc(10, 0));
  payload.push(scramblePart2);
  payload.push(Buffer.alloc(1, 0));

  return createPacket(0, Buffer.concat(payload));
}

function createOkPacket(sequenceId, affectedRows = 0, lastInsertId = 0) {
  const payload = [];
  payload.push(Buffer.from([0x00]));
  payload.push(encodeLength(affectedRows));
  payload.push(encodeLength(lastInsertId));
  payload.push(Buffer.from([STATUS_FLAGS & 0xff, (STATUS_FLAGS >> 8) & 0xff]));
  payload.push(Buffer.from([0x00, 0x00]));
  return createPacket(sequenceId, Buffer.concat(payload));
}

function createErrorPacket(sequenceId, errorCode, sqlState, message) {
  const payload = [];
  payload.push(Buffer.from([0xff]));
  payload.writeUInt16LE(errorCode, 0);
  payload.push(Buffer.from('#' + sqlState));
  payload.push(Buffer.from(message));
  return createPacket(sequenceId, Buffer.concat(payload));
}

function createResultSetPacket(sequenceId, columns, rows) {
  const packets = [];

  const colDefPayloads = columns.map((col) => {
    const buf = [];
    buf.push(Buffer.from([0x03]));
    buf.push(encodeLength(0x03));
    buf.push(encodeLength(col.db ? col.db.length : 0));
    buf.push(Buffer.from(col.db || 'production_db'));
    buf.push(encodeLength(0));
    buf.push(encodeLength(col.table ? col.table.length : 0));
    buf.push(Buffer.from(col.table || ''));
    buf.push(encodeLength(0));
    buf.push(encodeLength(col.orgTable ? col.orgTable.length : 0));
    buf.push(Buffer.from(col.orgTable || ''));
    buf.push(encodeLength(0));
    buf.push(encodeLength(col.name.length));
    buf.push(Buffer.from(col.name));
    buf.push(encodeLength(0));
    buf.push(encodeLength(col.orgName ? col.orgName.length : 0));
    buf.push(Buffer.from(col.orgName || ''));
    buf.push(Buffer.from([0x21]));
    buf.push(Buffer.from([0x00, 0x00, 0x00]));
    buf.push(Buffer.from([col.type || 0xfd]));
    buf.push(Buffer.from([0x00, 0x00]));
    buf.push(Buffer.from([0x00]));
    return Buffer.concat(buf);
  });

  let colSeq = 0;
  packets.push(createPacket(colSeq++, encodeLength(columns.length)));
  for (const colDef of colDefPayloads) {
    packets.push(createPacket(colSeq++, colDef));
  }
  packets.push(createPacket(colSeq++, Buffer.from([0xfe, 0x00, 0x00, STATUS_FLAGS & 0xff, (STATUS_FLAGS >> 8) & 0xff])));

  for (const row of rows) {
    const rowPayload = row.map((val) => {
      if (val === null) return Buffer.from([0xfb]);
      const str = String(val);
      const buf = Buffer.alloc(1 + encodeLength(str.length).length + str.length);
      let offset = 0;
      buf[offset++] = 0xfd;
      const lenBuf = encodeLength(str.length);
      lenBuf.copy(buf, offset);
      offset += lenBuf.length;
      buf.write(str, offset, 'utf8');
      return buf;
    });
    packets.push(createPacket(colSeq++, Buffer.concat(rowPayload)));
  }

  return Buffer.concat(packets);
}

function encodeLength(len) {
  if (len < 0xfb) return Buffer.from([len]);
  if (len < 0x10000) return Buffer.from([0xfc, len & 0xff, (len >> 8) & 0xff]);
  return Buffer.from([0xfd, len & 0xff, (len >> 8) & 0xff, (len >> 16) & 0xff]);
}

function decodeLength(buffer, offset) {
  const first = buffer[offset];
  if (first < 0xfb) return { length: first, bytesRead: 1 };
  if (first === 0xfc) return { length: buffer.readUInt16LE(offset + 1), bytesRead: 3 };
  if (first === 0xfd) return { length: buffer.readUInt32LE(offset + 1) & 0xffffff, bytesRead: 4 };
  return { length: buffer.readUInt32LE(offset + 1), bytesRead: 5 };
}

function isSqlInjection(query) {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(query));
}

function executeQuery(query) {
  const normalized = query.trim().replace(/\s+/g, ' ').toUpperCase();

  if (normalized === 'SELECT VERSION()') {
    return { columns: [{ name: 'VERSION()', type: 0xfd }], rows: [[SERVER_VERSION]] };
  }

  if (normalized === 'SELECT USER()') {
    return { columns: [{ name: 'USER()', type: 0xfd }], rows: [['root@localhost']] };
  }

  if (normalized === 'SELECT DATABASE()') {
    return { columns: [{ name: 'DATABASE()', type: 0xfd }], rows: [[null]] };
  }

  if (normalized === 'SHOW DATABASES') {
    return {
      columns: [{ name: 'Database', type: 0xfd }],
      rows: [['production_db']],
    };
  }

  if (normalized === 'SHOW TABLES') {
    return {
      columns: [{ name: 'Tables_in_production_db', type: 0xfd }],
      rows: [['users'], ['orders'], ['products'], ['logs'], ['config']],
    };
  }

  if (normalized.startsWith('DESCRIBE ') || normalized.startsWith('DESC ')) {
    const tableName = query.trim().split(/\s+/)[1].toLowerCase();
    const schema = TABLE_SCHEMAS[tableName];
    if (!schema) {
      return {
        error: true,
        code: 1146,
        sqlState: '42S02',
        message: `Table 'production_db.${tableName}' doesn't exist`,
      };
    }
    return {
      columns: [
        { name: 'Field', type: 0xfd },
        { name: 'Type', type: 0xfd },
        { name: 'Null', type: 0xfd },
        { name: 'Key', type: 0xfd },
        { name: 'Default', type: 0xfd },
        { name: 'Extra', type: 0xfd },
      ],
      rows: schema.map((col) => [
        col.field,
        col.type,
        'YES',
        col.field === 'id' ? 'PRI' : '',
        null,
        col.field === 'id' ? 'auto_increment' : '',
      ]),
    };
  }

  if (normalized.startsWith('SELECT * FROM ')) {
    const tableName = query.trim().split(/\s+/)[3].toLowerCase().replace(/;$/, '');
    const tableData = {
      users: FAKE_USERS.map((u) => [u.id, u.username, u.email, u.password_hash, u.role, u.created_at]),
      orders: FAKE_ORDERS.map((o) => [o.id, o.user_id, o.total, o.status, o.created_at]),
      products: FAKE_PRODUCTS.map((p) => [p.id, p.name, p.price, p.stock, p.category]),
      logs: FAKE_LOGS.map((l) => [l.id, l.action, l.ip_address, l.timestamp]),
      config: FAKE_CONFIG.map((c) => [c.key, c.value, c.updated_at]),
    };
    const data = tableData[tableName];
    if (!data) {
      return {
        error: true,
        code: 1146,
        sqlState: '42S02',
        message: `Table 'production_db.${tableName}' doesn't exist`,
      };
    }
    const schema = TABLE_SCHEMAS[tableName];
    return {
      columns: schema.map((col) => ({ name: col.field, type: 0xfd })),
      rows: data,
    };
  }

  if (normalized.startsWith('INSERT ') || normalized.startsWith('UPDATE ') || normalized.startsWith('DELETE ') ||
      normalized.startsWith('CREATE ') || normalized.startsWith('DROP ') || normalized.startsWith('ALTER ') ||
      normalized.startsWith('TRUNCATE ') || normalized.startsWith('REPLACE ')) {
    return { ok: true, affectedRows: 0 };
  }

  if (normalized.startsWith('USE ')) {
    return { ok: true, affectedRows: 0, databaseChanged: true };
  }

  return {
    error: true,
    code: 1064,
    sqlState: '42000',
    message: `You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '${query.trim().substring(0, 50)}' at line 1`,
  };
}

function logAttack(db, sourceIp, attackType, severity, payload, response, metadata) {
  try {
    insertAttack(db, {
      source_ip: sourceIp,
      service: 'mysql',
      attack_type: attackType,
      severity: severity,
      payload: payload,
      response: response,
      metadata: metadata,
    });
  } catch (err) {
    console.error('[MySQL Honeypot] Failed to log attack:', err.message);
  }
}

export function startMysqlHoneypot(db, config = {}) {
  const port = config.port || 3306;
  const host = config.host || '0.0.0.0';

  const server = createServer((socket) => {
    const sourceIp = socket.remoteAddress?.replace(/^::ffff:/, '') || 'unknown';
    let handshakeSent = false;
    let authenticated = false;
    let buffer = Buffer.alloc(0);
    let sequenceId = 0;

    const sendHandshake = () => {
      const packet = createHandshake();
      socket.write(packet);
      handshakeSent = true;
      sequenceId = 0;
    };

    const processBuffer = () => {
      while (buffer.length >= 4) {
        const packetLength = buffer[0] | (buffer[1] << 8) | (buffer[2] << 16);
        const seq = buffer[3];

        if (buffer.length < 4 + packetLength) break;

        const payload = buffer.subarray(4, 4 + packetLength);
        buffer = buffer.subarray(4 + packetLength);

        if (!handshakeSent) {
          sendHandshake();
          continue;
        }

        if (!authenticated) {
          handleAuth(payload, seq);
          continue;
        }

        handleCommand(payload, seq);
      }
    };

    const handleAuth = (payload, seq) => {
      let offset = 0;
      const capFlags = payload.readUInt32LE(offset);
      offset += 4;
      const maxPacketSize = payload.readUInt32LE(offset);
      offset += 4;
      const charset = payload[offset];
      offset += 23;

      let username = '';
      while (offset < payload.length && payload[offset] !== 0x00) {
        username += String.fromCharCode(payload[offset]);
        offset++;
      }
      offset++;

      const authDataLength = payload[offset];
      offset++;
      const authData = payload.subarray(offset, offset + authDataLength);
      offset += authDataLength;

      let database = '';
      if (offset < payload.length) {
        while (offset < payload.length && payload[offset] !== 0x00) {
          database += String.fromCharCode(payload[offset]);
          offset++;
        }
      }

      authenticated = true;
      sequenceId = seq + 1;
      socket.write(createOkPacket(sequenceId));

      logAttack(db, sourceIp, 'login_attempt', 'low', `user="${username}" db="${database}"`, 'Authentication successful', { username, database, capabilities: capFlags });
    };

    const handleCommand = (payload, seq) => {
      const commandType = payload[0];
      const commandPayload = payload.subarray(1);

      if (commandType === COM_QUIT) {
        socket.end();
        return;
      }

      if (commandType !== COM_QUERY) {
        sequenceId = seq + 1;
        socket.write(createErrorPacket(sequenceId, 1064, '42000', 'Not implemented'));
        return;
      }

      const query = commandPayload.toString('utf8').trim();
      const severity = isSqlInjection(query) ? 'critical' : 'low';
      const result = executeQuery(query);

      sequenceId = seq + 1;

      if (result.error) {
        const errorPacket = createErrorPacket(sequenceId, result.code, result.sqlState, result.message);
        socket.write(errorPacket);
        logAttack(db, sourceIp, 'query', severity, query, result.message, { errorCode: result.code });
      } else if (result.ok) {
        socket.write(createOkPacket(sequenceId, result.affectedRows || 0));
        logAttack(db, sourceIp, 'query', severity, query, 'Query OK', { affectedRows: result.affectedRows });
      } else {
        const resultSet = createResultSetPacket(sequenceId, result.columns, result.rows);
        socket.write(resultSet);
        logAttack(db, sourceIp, 'query', severity, query, `${result.rows.length} rows returned`, { rowCount: result.rows.length });
      }
    };

    socket.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);
      processBuffer();
    });

    socket.on('error', (err) => {
      console.error(`[MySQL Honeypot] Connection error from ${sourceIp}:`, err.message);
    });

    socket.on('close', () => {
      buffer = Buffer.alloc(0);
    });

    sendHandshake();
  });

  server.listen(port, host, () => {
    console.log(`[MySQL Honeypot] Listening on ${host}:${port}`);
  });

  server.on('error', (err) => {
    console.error('[MySQL Honeypot] Server error:', err.message);
  });

  return server;
}
