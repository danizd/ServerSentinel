import ssh2pkg from 'ssh2';
const { Server } = ssh2pkg;
import { generateKeyPairSync } from 'crypto';
import { insertAttack, insertSession, endSession } from '../db/queries.js';

const BANNER = 'SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.3';
const TIMEOUT_MS = 30 * 60 * 1000;
const HOME_DIR = '/home/admin';

const FILESYSTEM = {
  '/home/admin': {
    type: 'dir',
    children: {
      config: { type: 'dir', children: { 'nginx.conf': { type: 'file', size: '2.4K' }, 'app.env': { type: 'file', size: '1.1K' } } },
      logs: { type: 'dir', children: { 'access.log': { type: 'file', size: '45M' }, 'error.log': { type: 'file', size: '3.2M' } } },
      public_html: { type: 'dir', children: { 'index.html': { type: 'file', size: '4.7K' }, 'style.css': { type: 'file', size: '12K' } } },
      backup: { type: 'dir', children: { 'db_backup_2026-06-10.sql.gz': { type: 'file', size: '128M' } } },
      '.ssh': { type: 'dir', children: { 'authorized_keys': { type: 'file', size: '0.5K' } } },
      '.bash_history': { type: 'file', size: '2.1K' },
      '.bashrc': { type: 'file', size: '3.7K' },
    }
  },
  '/': {
    type: 'dir',
    children: {
      home: { type: 'dir' },
      etc: { type: 'dir', children: { 'passwd': { type: 'file' }, 'hosts': { type: 'file' }, 'hostname': { type: 'file' } } },
      var: { type: 'dir', children: { log: { type: 'dir' } } },
      tmp: { type: 'dir' },
      usr: { type: 'dir', children: { bin: { type: 'dir' }, local: { type: 'dir' } } },
    }
  }
};

const PASSWD_CONTENT = [
  'root:x:0:0:root:/root:/bin/bash',
  'daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin',
  'bin:x:2:2:bin:/bin:/usr/sbin/nologin',
  'sys:x:3:3:sys:/dev:/usr/sbin/nologin',
  'sync:x:4:65534:sync:/bin:/bin/sync',
  'games:x:5:60:games:/usr/games:/usr/sbin/nologin',
  'man:x:6:12:man:/var/cache/man:/usr/sbin/nologin',
  'lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin',
  'mail:x:8:8:mail:/var/mail:/usr/sbin/nologin',
  'news:x:9:9:news:/var/spool/news:/usr/sbin/nologin',
  'uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin',
  'proxy:x:13:13:proxy:/bin:/usr/sbin/nologin',
  'www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin',
  'backup:x:34:34:backup:/var/backups:/usr/sbin/nologin',
  'list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin',
  'irc:x:39:39:ircd:/var/run/ircd:/usr/sbin/nologin',
  'gnats:x:41:41:Gnats Bug-Reporting System:/var/lib/gnats:/usr/sbin/nologin',
  'nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin',
  'systemd-network:x:100:102:systemd Network Manager:/run/systemd:/usr/sbin/nologin',
  'syslog:x:101:103::/home/syslog:/usr/sbin/nologin',
  'messagebus:x:102:105::/nonexistent:/usr/sbin/nologin',
  '_apt:x:103:65534::/nonexistent:/usr/sbin/nologin',
  'admin:x:1000:1000:admin:/home/admin:/bin/bash',
  'sshd:x:104:65534::/run/sshd:/usr/sbin/nologin',
].join('\n');

const PROCESS_LIST = [
  'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND',
  'root         1  0.0  0.1 169648 13280 ?        Ss   Jun10   0:03 /sbin/init',
  'root         2  0.0  0.0      0     0 ?        S    Jun10   0:00 [kthreadd]',
  'root       234  0.0  0.1  72300  9600 ?        Ss   Jun10   0:01 /usr/sbin/sshd -D',
  'root       267  0.0  0.1  70548  8960 ?        Ss   Jun10   0:00 /usr/sbin/apache2 -k start',
  'www-data   268  0.2  0.3 476020 27360 ?        Sl   Jun10   1:23 /usr/sbin/apache2 -k start',
  'www-data   269  0.1  0.3 476020 24480 ?        Sl   Jun10   0:56 /usr/sbin/apache2 -k start',
  'root       312  0.0  0.0  14584  5248 ?        Ss   Jun10   0:00 /usr/sbin/cron -f',
  'mysql      445  0.3  1.2 1864560 101440 ?      Sl   Jun10   2:45 /usr/sbin/mysqld',
  'root       501  0.0  0.0   8076  3328 ?        Ss   Jun10   0:00 /bin/bash /opt/scripts/health-check.sh',
  'root       502  0.0  0.0   8076  3200 ?        S    Jun10   0:00 /bin/bash /opt/scripts/backup.sh',
  'admin     1204  0.0  0.2  21496  16400 pts/0    Ss   10:30   0:00 -bash',
  'admin     1302  0.0  0.0  37360  3200 pts/0    R+   10:45   0:00 ps aux',
].join('\n');

const DISK_USAGE = [
  'Filesystem      Size  Used Avail Use% Mounted on',
  '/dev/sda1        40G   28G   10G  74% /',
  'tmpfs           3.9G     0  3.9G   0% /dev/shm',
  'tmpfs           3.9G  1.2M  3.9G   1% /run',
  'tmpfs           3.9G     0  3.9G   0% /tmp',
  '/dev/sdb1       200G  142G   58G  71% /data',
  'tmpfs           789M     0  789M   0% /run/user/1000',
].join('\n');

const UNAME_OUTPUT = 'Linux server 5.4.0-42-generic #46-Ubuntu SMP Tue Jul 12 08:41:10 UTC 2022 x86_64 x86_64 x86_64 GNU/Linux';

const HELP_TEXT = [
  'Available commands:',
  '  ls          List directory contents',
  '  pwd         Print working directory',
  '  whoami      Print current user',
  '  cat         Display file contents',
  '  uname       Print system information',
  '  ps          List running processes',
  '  df          Report disk space usage',
  '  history     Command history',
  '  cd          Change directory',
  '  help        Show this help message',
  '',
  'Restricted commands:',
  '  sudo        Execute as superuser (denied)',
].join('\n');

const SUSPICIOUS_PATTERNS = /\b(wget|curl|nc|ncat|netcat|nmap|python|perl|ruby|php|bash\s*-i|mkfifo|\/dev\/tcp|chmod|chown|rm\s+-rf|dd\s+if=)\b/i;

function generateHostKey() {
  return generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  }).privateKey;
}

function getSeverity(command) {
  const trimmed = command.trim();
  if (/^sudo\b/i.test(trimmed)) return 'high';
  if (SUSPICIOUS_PATTERNS.test(trimmed)) return 'medium';
  return 'low';
}

function buildPrompt(cwd) {
  const display = cwd === HOME_DIR ? '~' : cwd.replace(/^\/home\/admin/, '~');
  return `admin@server:${display}$`;
}

function resolvePath(cwd, target) {
  if (!target) return cwd;
  if (target === '~') return HOME_DIR;
  if (target.startsWith('~/')) target = HOME_DIR + target.slice(1);
  if (target === '-') return cwd;
  if (!target.startsWith('/')) target = cwd + '/' + target;
  const parts = target.split('/').filter(Boolean);
  const resolved = [];
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') { resolved.pop(); continue; }
    resolved.push(part);
  }
  return '/' + resolved.join('/');
}

function getDirNode(path) {
  if (FILESYSTEM[path]) return FILESYSTEM[path];
  const parts = path.split('/').filter(Boolean);
  let node = FILESYSTEM['/'];
  for (const part of parts) {
    if (!node || node.type !== 'dir' || !node.children || !node.children[part]) return null;
    node = node.children[part];
  }
  return node;
}

function formatLsEntry(name, node) {
  if (node.type === 'dir') return `drwxr-xr-x  2 admin admin  4096 Jun 10 14:32 ${name}`;
  const size = node.size || '4.0K';
  return `-rw-r--r--  1 admin admin ${size.padStart(6)} Jun 10 14:32 ${name}`;
}

function handleCommand(rawInput, cwd) {
  const input = rawInput.trim();
  if (!input) return { output: '', cwd };

  const parts = input.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  switch (cmd) {
    case 'ls': {
      const target = resolvePath(cwd, args || '.');
      const node = getDirNode(target);
      if (!node) return { output: `ls: cannot access '${args || '.'}': No such file or directory`, cwd };
      if (node.type !== 'dir') return { output: target.split('/').pop(), cwd };
      const entries = Object.entries(node.children || {}).map(([n, c]) => formatLsEntry(n, c));
      return { output: entries.join('\n'), cwd };
    }

    case 'pwd':
      return { output: cwd, cwd };

    case 'whoami':
      return { output: 'admin', cwd };

    case 'cat': {
      if (!args) return { output: 'cat: missing operand', cwd };
      const target = resolvePath(cwd, args);
      if (target === '/etc/passwd') return { output: PASSWD_CONTENT, cwd };
      return { output: `cat: ${args}: No such file or directory`, cwd };
    }

    case 'uname':
      return { output: UNAME_OUTPUT, cwd };

    case 'ps':
      return { output: PROCESS_LIST, cwd };

    case 'df':
      return { output: DISK_USAGE, cwd };

    case 'history':
      return { output: '', cwd, history: true };

    case 'help':
      return { output: HELP_TEXT, cwd };

    case 'cd': {
      const target = resolvePath(cwd, args || '~');
      const node = getDirNode(target);
      if (!node || node.type !== 'dir') {
        return { output: `bash: cd: ${args || '~'}: No such file or directory`, cwd };
      }
      return { output: '', cwd: target };
    }

    case 'sudo':
      return { output: 'Permission denied, please try again.', cwd };

    default:
      return { output: `bash: ${cmd}: command not found`, cwd };
  }
}

export function startSshHoneypot(db, config) {
  const port = config.port || 2222;

  const server = new Server({
    hostKeys: [generateHostKey()],
    banner: BANNER,
  }, (client) => {
    const clientAddr = client._sock?.remoteAddress?.replace(/^::ffff:/, '') || 'unknown';
    const sessionId = insertSession(db, clientAddr);
    let cwd = HOME_DIR;
    let inactivityTimer = null;

    function resetTimer() {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        try { client.end(); } catch {}
      }, TIMEOUT_MS);
    }

    resetTimer();

    client.on('authentication', (ctx) => {
      insertAttack(db, {
        source_ip: clientAddr,
        service: 'ssh',
        attack_type: 'auth',
        severity: 'low',
        payload: `user=${ctx.username} method=${ctx.method}`,
        response: 'accepted',
        metadata: { method: ctx.method, username: ctx.username },
      });
      ctx.accept();
    });

    client.on('session', (accept) => {
      const session = accept();

      session.on('pty', (acceptPty) => {
        acceptPty && acceptPty();
      });

      session.on('env', (setEnv) => { setEnv(); });

      session.on('window-change', () => {});

      session.on('shell', (acceptShell) => {
        const stream = acceptShell();
        const history = [];
        let lineBuffer = '';

        function writePrompt() {
          stream.write(`${buildPrompt(cwd)} `);
        }

        function executeCommand(cmd) {
          const severity = getSeverity(cmd);
          const result = handleCommand(cmd, cwd);
          cwd = result.cwd;

          insertAttack(db, {
            source_ip: clientAddr,
            service: 'ssh',
            attack_type: 'command',
            severity,
            payload: cmd,
            response: result.output,
            metadata: { cwd, command: cmd },
          });

          if (result.history) {
            const histOutput = history.map((h, i) => `  ${String(i + 1).padStart(4)}  ${h}`).join('\r\n');
            stream.write(`\r\n${histOutput}\r\n`);
          } else if (result.output) {
            stream.write(`\r\n${result.output}\r\n`);
          } else {
            stream.write('\r\n');
          }

          writePrompt();
        }

        stream.write(`${BANNER}\r\n\r\nLast login: ${new Date().toUTCString()} from 192.168.1.${Math.floor(Math.random() * 254) + 1}\r\n`);
        writePrompt();

        stream.on('data', (data) => {
          resetTimer();
          const raw = data.toString();

          if (raw === '\x03') {
            stream.write('^C\r\n');
            lineBuffer = '';
            writePrompt();
            return;
          }

          if (raw === '\x04') {
            stream.write('\r\nlogout\r\n');
            client.end();
            return;
          }

          if (raw === '\x7f' || raw === '\b') {
            if (lineBuffer.length > 0) {
              lineBuffer = lineBuffer.slice(0, -1);
              stream.write('\b \b');
            }
            return;
          }

          if (raw === '\r' || raw === '\n') {
            const cmd = lineBuffer;
            lineBuffer = '';
            if (cmd.trim()) {
              history.push(cmd);
            }
            executeCommand(cmd);
            return;
          }

          if (raw === '\x1b[A') {
            if (history.length > 0) {
              lineBuffer = history[history.length - 1];
              stream.write('\x1b[2K\r');
              writePrompt();
              stream.write(lineBuffer);
            }
            return;
          }

          if (raw === '\x1b[B') {
            lineBuffer = '';
            stream.write('\x1b[2K\r');
            writePrompt();
            return;
          }

          if (raw === '\x1b[C' || raw === '\x1b[D') return;
          if (raw === '\x1b[3~') return;
          if (raw === '\x1b[1;5C' || raw === '\x1b[1;5D') return;
          if (raw === '\x1b[H' || raw === '\x1b[F') return;
          if (raw === '\t') return;

          if (raw === '\x15') {
            lineBuffer = '';
            stream.write('\x1b[2K\r');
            writePrompt();
            return;
          }

          if (raw >= ' ') {
            lineBuffer += raw;
            stream.write(raw);
          }
        });

        stream.on('close', () => {
          if (inactivityTimer) clearTimeout(inactivityTimer);
          try { endSession(db, sessionId); } catch {}
          client.end();
        });
      });
    });

    client.on('close', () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
    });

    client.on('error', () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
    });
  });

  server.listen(port, () => {
    console.log(`[SSH] Honeypot listening on port ${port}`);
  });

  server.on('error', (err) => {
    console.error(`[SSH] Server error:`, err.message);
  });

  return server;
}
