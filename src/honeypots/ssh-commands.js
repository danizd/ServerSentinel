import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const COMMANDS = {
  'ls': (ctx) => {
    if (ctx.cwd === '/home/admin' || ctx.cwd === '~') {
      return 'total 32\ndrwxr-xr-x 2 admin admin 4096 Jun 12 10:30 .\ndrwxr-xr-x 3 root  root  4096 Jun  1 00:00 ..\ndrwxr-xr-x 2 admin admin 4096 Jun 12 10:30 config\ndrwxr-xr-x 2 admin admin 4096 Jun 12 10:30 logs\ndrwxr-xr-x 3 admin admin 4096 Jun 12 10:30 public_html\ndrwxr-xr-x 2 admin admin 4096 Jun 12 10:30 backup\ndrwxr-xr-x 2 admin admin 4096 Jun 12 10:30 .ssh\n-rw-r--r-- 1 admin admin  220 Jun  1 00:00 .bashrc\n-rw-r--r-- 1 admin admin  807 Jun  1 00:00 .profile';
    }
    return 'total 16\ndrwxr-xr-x 2 admin admin 4096 Jun 12 10:30 .\ndrwxr-xr-x 3 admin admin 4096 Jun 12 10:30 ..';
  },
  'pwd': (ctx) => ctx.cwd,
  'whoami': () => 'admin',
  'uname -a': () => 'Linux server 5.4.0-42-generic #46-Ubuntu SMP Thu Apr 10 10:04:13 UTC 2025 x86_64 x86_64 x86_64 GNU/Linux',
  'cat /etc/passwd': () => 'root:x:0:0:root:/root:/bin/bash\nadmin:x:1000:1000:Admin User:/home/admin:/bin/bash\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nmysql:x:27:27:MySQL Server:/var/lib/mysql:/bin/false\nnobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin',
  'ps aux': () => 'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot         1  0.0  0.1 169432 13284 ?        Ss   Jun01   0:12 /sbin/init\nroot         2  0.0  0.0      0     0 ?        S    Jun01   0:00 [kthreadd]\nadmin     1024  0.2  0.5 214568 45120 ?        Sl   Jun01  12:34 /usr/bin/node /app/src/index.js\nadmin     1025  0.1  0.3 185432 28432 ?        Sl   Jun01   6:12 /usr/bin/node /app/src/index.js\nwww-data  1100  0.0  0.1  72304  9876 ?        S    Jun01   0:45 nginx: worker process\nroot      1200  0.0  0.0  12345  4321 ?        Ss   Jun01   0:02 /usr/sbin/cron -f',
  'df -h': () => 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        30G  8.2G   20G  30% /\ntmpfs           2.0G     0  2.0G   0% /dev/shm\n/dev/sda2       200G   45G  145G  24% /data',
  'history': (ctx) => ctx.commands.map((c, i) => `  ${i + 1}  ${c}`).join('\n') || 'No history',
  'help': () => 'Available commands: ls, pwd, whoami, cat, uname, ps, df, history, help, cd, exit',
  'clear': () => '\x1b[2J\x1b[H',
  'exit': () => '__EXIT__'
};

const SUSPICIOUS = ['wget', 'curl', 'nc', 'ncat', 'nmap', 'python', 'perl', 'ruby', 'chmod', 'chown', 'passwd', 'su', 'mount', 'umount', 'fdisk', 'dd', 'mkfs', 'rm'];

export function getCommandResponse(input, ctx) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0];

  if (cmd === 'cd') {
    const target = parts[1] || '/home/admin';
    let newDir;
    if (target === '~' || target === '') newDir = '/home/admin';
    else if (target === '..') {
      const parent = ctx.cwd.split('/').slice(0, -1).join('/') || '/';
      newDir = parent;
    }
    else if (target.startsWith('/')) newDir = target;
    else newDir = ctx.cwd === '/' ? `/${target}` : `${ctx.cwd}/${target}`;

    return { type: 'cd', newDir };
  }

  if (COMMANDS[trimmed]) {
    return { type: 'response', text: COMMANDS[trimmed](ctx) };
  }

  for (const [pattern, handler] of Object.entries(COMMANDS)) {
    if (trimmed.startsWith(pattern.split(' ')[0] + ' ') && pattern.includes(' ')) {
      return { type: 'response', text: handler(ctx) };
    }
  }

  const isSuspicious = SUSPICIOUS.some(s => cmd === s);
  return {
    type: 'response',
    text: `bash: ${cmd}: command not found`,
    severity: isSuspicious ? 'medium' : 'low'
  };
}
