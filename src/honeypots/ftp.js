import net from 'node:net';
import { insertAttack, insertSession } from '../db/queries.js';

const VIRTUAL_ROOT = '/home/admin';

const VIRTUAL_FS = {
  '/home/admin': {
    type: 'dir',
    children: ['public_html', 'logs', 'config', 'backup', 'secrets'],
  },
  '/home/admin/public_html': {
    type: 'dir',
    children: ['index.html', 'style.css', 'script.js'],
  },
  '/home/admin/public_html/index.html': { type: 'file', size: 4096, date: '20260601120000' },
  '/home/admin/public_html/style.css': { type: 'file', size: 2048, date: '20260601120000' },
  '/home/admin/public_html/script.js': { type: 'file', size: 1024, date: '20260601120000' },
  '/home/admin/logs': {
    type: 'dir',
    children: ['access.log', 'error.log'],
  },
  '/home/admin/logs/access.log': { type: 'file', size: 8192, date: '20260612083045' },
  '/home/admin/logs/error.log': { type: 'file', size: 4096, date: '20260612083045' },
  '/home/admin/config': {
    type: 'dir',
    children: ['nginx.conf', 'database.yml'],
  },
  '/home/admin/config/nginx.conf': { type: 'file', size: 1024, date: '20260515102030' },
  '/home/admin/config/database.yml': { type: 'file', size: 512, date: '20260520140520' },
  '/home/admin/backup': {
    type: 'dir',
    children: ['db_backup_2026-06-01.sql.gz', 'www_backup.tar.gz'],
  },
  '/home/admin/backup/db_backup_2026-06-01.sql.gz': { type: 'file', size: 1048576, date: '20260601020000' },
  '/home/admin/backup/www_backup.tar.gz': { type: 'file', size: 524288, date: '20260601020000' },
  '/home/admin/secrets': {
    type: 'dir',
    children: ['.htpasswd'],
  },
  '/home/admin/secrets/.htpasswd': { type: 'file', size: 256, date: '20260401120000' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatFTPDate(dateStr) {
  const month = MONTHS[parseInt(dateStr.slice(4, 6), 10) - 1];
  const day = dateStr.slice(6, 8);
  const hour = dateStr.slice(8, 10);
  const min = dateStr.slice(10, 12);
  return `${month} ${day} ${hour}:${min}`;
}

function generateListing(path) {
  const node = VIRTUAL_FS[path];
  if (!node || node.type !== 'dir') return null;

  return node.children
    .map((name) => {
      const childPath = `${path}/${name}`;
      const child = VIRTUAL_FS[childPath];
      const isDir = child.type === 'dir';
      const perms = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
      const size = isDir ? 4096 : child.size;
      const date = formatFTPDate(child.date);
      return `${perms} 1 admin admin ${String(size).padStart(5)} ${date} ${name}`;
    })
    .join('\r\n');
}

function resolvePath(currentDir, target) {
  if (target.startsWith('/')) return target;

  const parts = currentDir.split('/').filter(Boolean);
  const targetParts = target.split('/').filter(Boolean);

  for (const part of targetParts) {
    if (part === '..') {
      if (parts.length > 2) parts.pop();
    } else if (part !== '.') {
      parts.push(part);
    }
  }

  return '/' + parts.join('/');
}

function logAttack(db, sourceIp, attackType, severity, payload, response) {
  try {
    insertAttack(db, {
      source_ip: sourceIp,
      service: 'ftp',
      attack_type: attackType,
      severity,
      payload: payload || null,
      response: response || null,
      metadata: null,
    });
  } catch (err) {
    console.error('[FTP] Failed to log attack:', err.message);
  }
}

function handlePasv(dataServerRef, currentDir, socket) {
  if (dataServerRef.value) dataServerRef.value.close();

  const ds = net.createServer((client) => {
    const listing = generateListing(currentDir);
    if (listing) client.write(listing + '\r\n');
    client.end();
    ds.close();
    dataServerRef.value = null;
  });

  ds.on('error', () => {});
  ds.on('close', () => { dataServerRef.value = null; });

  ds.listen(0, '127.0.0.1', () => {
    const port = ds.address().port;
    const hi = Math.floor(port / 256);
    const lo = port % 256;
    socket.write(`227 Entering Passive Mode (127,0,0,1,${hi},${lo})\r\n`);
  });

  dataServerRef.value = ds;
}

function handleEpsv(dataServerRef, currentDir, socket) {
  if (dataServerRef.value) dataServerRef.value.close();

  const ds = net.createServer((client) => {
    const listing = generateListing(currentDir);
    if (listing) client.write(listing + '\r\n');
    client.end();
    ds.close();
    dataServerRef.value = null;
  });

  ds.on('error', () => {});
  ds.on('close', () => { dataServerRef.value = null; });

  ds.listen(0, '127.0.0.1', () => {
    socket.write('229 Entering Extended Passive Mode\r\n');
  });

  dataServerRef.value = ds;
}

export function startFtpHoneypot(db, config) {
  const port = config?.port || 2121;

  const server = net.createServer((socket) => {
    const sourceIp = socket.remoteAddress;
    let currentDir = VIRTUAL_ROOT;
    let username = null;
    const dataServerRef = { value: null };

    console.log(`[FTP] Connection from ${sourceIp}`);
    socket.write('220 Welcome to FTP server\r\n');

    socket.on('data', (data) => {
      const lines = data.toString().split(/\r?\n/).filter(Boolean);

      for (const line of lines) {
        const raw = line.trim().slice(0, 1024);
        if (!raw) continue;

        const parts = raw.split(/\s+/);
        const command = (parts[0] || '').toUpperCase();
        const arg = parts.slice(1).join(' ');

        console.log(`[FTP] ${sourceIp} > ${raw}`);

        let response = '';

        switch (command) {
          case 'USER': {
            username = arg || 'anonymous';
            response = '331 Password required';
            logAttack(db, sourceIp, 'USER', 'low', raw, response);
            break;
          }

          case 'PASS': {
            response = '230 Login successful';
            logAttack(db, sourceIp, 'PASS', 'low', raw, response);
            break;
          }

          case 'PWD': {
            response = `257 "${currentDir}"`;
            logAttack(db, sourceIp, 'PWD', 'low', raw, response);
            break;
          }

          case 'CWD': {
            const newPath = resolvePath(currentDir, arg);
            if (VIRTUAL_FS[newPath] && VIRTUAL_FS[newPath].type === 'dir') {
              currentDir = newPath;
              response = '250 Directory changed';
            } else {
              response = '550 Directory not found';
            }
            logAttack(db, sourceIp, 'CWD', 'low', raw, response);
            break;
          }

          case 'PASV': {
            handlePasv(dataServerRef, currentDir, socket);
            break;
          }

          case 'EPSV': {
            handleEpsv(dataServerRef, currentDir, socket);
            break;
          }

          case 'LIST': {
            socket.write('150 Here comes the directory listing\r\n');
            socket.write('226 Directory send OK\r\n');
            logAttack(db, sourceIp, 'LIST', 'low', raw, 'Directory listed');
            break;
          }

          case 'SIZE': {
            const filePath = resolvePath(currentDir, arg);
            const fileNode = VIRTUAL_FS[filePath];
            if (fileNode && fileNode.type === 'file') {
              response = `213 ${fileNode.size}`;
            } else {
              response = '550 File not found';
            }
            logAttack(db, sourceIp, 'SIZE', 'low', raw, response);
            break;
          }

          case 'MDTM': {
            const filePath = resolvePath(currentDir, arg);
            const fileNode = VIRTUAL_FS[filePath];
            if (fileNode && fileNode.type === 'file') {
              response = `213 ${fileNode.date}`;
            } else {
              response = '550 File not found';
            }
            logAttack(db, sourceIp, 'MDTM', 'low', raw, response);
            break;
          }

          case 'RETR': {
            const filePath = resolvePath(currentDir, arg);
            const fileNode = VIRTUAL_FS[filePath];
            if (fileNode && fileNode.type === 'dir') {
              response = '550 Is a directory';
            } else {
              response = '550 Permission denied';
            }
            logAttack(db, sourceIp, 'RETR', 'medium', raw, response);
            break;
          }

          case 'STOR': {
            const suspicious = /\.(sh|exe|bat|cmd|ps1|py|pl|rb|php)$/i.test(arg);
            const severity = suspicious ? 'critical' : 'high';
            response = '550 Permission denied';
            logAttack(db, sourceIp, 'STOR', severity, raw, response);
            break;
          }

          case 'QUIT': {
            socket.write('221 Goodbye\r\n');
            logAttack(db, sourceIp, 'QUIT', 'low', raw, '221 Goodbye');
            if (dataServerRef.value) dataServerRef.value.close();
            socket.end();
            return;
          }

          case 'TYPE': {
            response = '200 Type set';
            break;
          }

          case 'FEAT': {
            response = '211-Features:\r\n SIZE\r\n MDTM\r\n PASV\r\n EPSV\r\n UTF8\r\n211 End';
            break;
          }

          case 'SYST': {
            response = '215 UNIX Type: L8';
            break;
          }

          case 'OPTS': {
            response = '200 Option set';
            break;
          }

          case 'NOOP': {
            response = '200 NOOP ok';
            break;
          }

          default: {
            response = '502 Command not implemented';
            logAttack(db, sourceIp, command, 'high', raw, response);
            break;
          }
        }

        if (response) {
          socket.write(response + '\r\n');
          console.log(`[FTP] ${sourceIp} < ${response}`);
        }
      }
    });

    socket.on('close', () => {
      console.log(`[FTP] Connection closed from ${sourceIp}`);
      if (dataServerRef.value) dataServerRef.value.close();
    });

    socket.on('error', (err) => {
      console.error(`[FTP] Socket error from ${sourceIp}:`, err.message);
      if (dataServerRef.value) dataServerRef.value.close();
    });

    socket.setTimeout(600_000);
    socket.on('timeout', () => {
      socket.write('221 Goodbye\r\n');
      if (dataServerRef.value) dataServerRef.value.close();
      socket.end();
    });
  });

  server.listen(port, () => {
    console.log(`[FTP] Honeypot listening on port ${port}`);
  });

  server.on('error', (err) => {
    console.error('[FTP] Server error:', err.message);
  });

  return server;
}
