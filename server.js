import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const distDir = resolve(process.cwd(), 'dist');
const port = Number(process.env.PORT || 8080);
const host = '0.0.0.0';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function getSafePath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0] || '/');
  const normalizedPath = normalize(decodedPath).replace(/^\.\.(\/|\\|$)/, '');
  return join(distDir, normalizedPath === '/' ? 'index.html' : normalizedPath);
}

const server = createServer(async (req, res) => {
  try {
    const requestedPath = getSafePath(req.url || '/');
    const safeRequestedPath = resolve(requestedPath);
    const filePath = safeRequestedPath.startsWith(distDir) && existsSync(safeRequestedPath)
      ? safeRequestedPath
      : join(distDir, 'index.html');

    const statMethod = req.method === 'HEAD';
    const contentType = mimeTypes[extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });

    if (statMethod) {
      res.end();
      return;
    }

    createReadStream(filePath).pipe(res);
  } catch (error) {
    try {
      const fallback = await readFile(join(distDir, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fallback);
    } catch (_) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server error');
    }
  }
});

server.listen(port, host, () => {
  console.log(`InvestoFarms admin dashboard listening on ${host}:${port}`);
});
