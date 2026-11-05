import http from 'node:http';
import handler from './api/index.js';

const PORT = parseInt(process.env.PORT || '8000', 10);

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || `localhost:${PORT}`;
    const fullUrl = `http://${host}${req.url}`;
    const webReq = new Request(fullUrl, {
      method: req.method || 'GET',
    });

    const webRes = await handler(webReq);

    res.writeHead(webRes.status, Object.fromEntries(webRes.headers.entries()));
    const body = await webRes.text();
    res.end(body);
  } catch (err) {
    console.error('Server error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: 'Server Error', message: err?.message || String(err) }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Dhun Production Server listening on http://0.0.0.0:${PORT}`);
});
