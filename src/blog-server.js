import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, extname } from 'path';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

export function startBlogServer(blogDir, port) {
  const server = createServer((req, res) => {
    let url = req.url.split('?')[0];
    if (url === '/') url = '/index.html';

    const filePath = join(blogDir, url);

    if (!existsSync(filePath) || !filePath.startsWith(blogDir)) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<html><body style="background:#0a0a0a;color:#e0e0e0;font-family:monospace"><h1>404 Not Found</h1></body></html>');
      return;
    }

    try {
      const content = readFileSync(filePath);
      const ext = extname(filePath);
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      res.end(content);
    } catch {
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(port, () => resolve(server));
    server.on('error', reject);
  });
}
