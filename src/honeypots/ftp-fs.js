export const VIRTUAL_FS = {
  '/': {
    type: 'dir',
    children: ['home'],
    size: 4096,
    date: 'Jun 01 00:00'
  },
  '/home': {
    type: 'dir',
    children: ['admin'],
    size: 4096,
    date: 'Jun 01 00:00'
  },
  '/home/admin': {
    type: 'dir',
    children: ['public_html', 'logs', 'config', 'backup', 'secrets'],
    size: 4096,
    date: 'Jun 12 10:30'
  },
  '/home/admin/public_html': {
    type: 'dir',
    children: ['index.html', 'style.css', 'script.js'],
    size: 4096,
    date: 'Jun 12 10:30'
  },
  '/home/admin/public_html/index.html': {
    type: 'file', size: 4096, date: 'Jun 12 10:30',
    content: '<!DOCTYPE html><html><head><title>My Website</title></head><body><h1>Welcome</h1></body></html>'
  },
  '/home/admin/public_html/style.css': {
    type: 'file', size: 2048, date: 'Jun 12 10:30',
    content: 'body { margin: 0; font-family: sans-serif; }'
  },
  '/home/admin/public_html/script.js': {
    type: 'file', size: 1024, date: 'Jun 12 10:30',
    content: 'console.log("Hello World");'
  },
  '/home/admin/logs': {
    type: 'dir',
    children: ['access.log', 'error.log'],
    size: 4096,
    date: 'Jun 12 10:30'
  },
  '/home/admin/logs/access.log': {
    type: 'file', size: 8192, date: 'Jun 12 10:30',
    content: '192.168.1.100 - - [12/Jun/2026:10:30:01] "GET / HTTP/1.1" 200 1234\n10.0.0.5 - - [12/Jun/2026:10:31:15] "POST /login HTTP/1.1" 200 567'
  },
  '/home/admin/logs/error.log': {
    type: 'file', size: 4096, date: 'Jun 12 10:30',
    content: '[error] Connection refused to upstream\n[warn] Rate limit exceeded for 203.0.113.50'
  },
  '/home/admin/config': {
    type: 'dir',
    children: ['nginx.conf', 'database.yml'],
    size: 4096,
    date: 'Jun 12 10:30'
  },
  '/home/admin/config/nginx.conf': {
    type: 'file', size: 1024, date: 'Jun 12 10:30',
    content: 'server {\n  listen 80;\n  server_name localhost;\n  location / {\n    proxy_pass http://127.0.0.1:3000;\n  }\n}'
  },
  '/home/admin/config/database.yml': {
    type: 'file', size: 512, date: 'Jun 12 10:30',
    content: 'production:\n  adapter: postgresql\n  database: myapp_prod\n  host: localhost\n  pool: 5'
  },
  '/home/admin/backup': {
    type: 'dir',
    children: ['db_backup_2026-06-01.sql.gz', 'www_backup.tar.gz'],
    size: 4096,
    date: 'Jun 12 10:30'
  },
  '/home/admin/backup/db_backup_2026-06-01.sql.gz': {
    type: 'file', size: 1048576, date: 'Jun 01 02:00',
    content: null
  },
  '/home/admin/backup/www_backup.tar.gz': {
    type: 'file', size: 524288, date: 'Jun 01 02:05',
    content: null
  },
  '/home/admin/secrets': {
    type: 'dir',
    children: ['.htpasswd'],
    size: 4096,
    date: 'Jun 12 10:30'
  },
  '/home/admin/secrets/.htpasswd': {
    type: 'file', size: 256, date: 'Jun 12 10:30',
    content: 'admin:$apr1$xyz$hashedpasswordhere\nroot:$apr1$abc$rootpasswordhash'
  }
};

export function resolvePath(cwd, target) {
  if (target === '~' || target === '') return '/home/admin';
  if (target === '/') return '/';
  if (target.startsWith('~/')) return '/home/admin' + target.slice(1);
  if (target.startsWith('/')) return target;

  const parts = cwd === '/' ? [''] : cwd.split('/');
  const targetParts = target.split('/');

  for (const part of targetParts) {
    if (part === '..') {
      parts.pop();
    } else if (part !== '.') {
      parts.push(part);
    }
  }

  return parts.join('/') || '/';
}

export function listDir(path) {
  const entry = VIRTUAL_FS[path];
  if (!entry || entry.type !== 'dir') return null;
  return entry.children;
}

export function getFileInfo(path) {
  return VIRTUAL_FS[path] || null;
}
