/**
 * server.ts — Express dev/production server
 *
 * All /api/* requests are proxied to the SmartEVCharging .NET backend
 * at http://localhost:5225, EXCEPT /api/bottles/analyze-image which is
 * handled here (needs the GEMINI_API_KEY secret).
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 3000;

// ── Proxy /api/* → .NET backend (mounted on / so /api prefix is preserved) ────
const dotnetProxy = createProxyMiddleware({
  target: 'http://localhost:5225',
  changeOrigin: true,
  on: {
    error: (err: any, _req: any, res: any) => {
      console.error('[Proxy Error]', err.message);
      (res as express.Response)
        .status(502)
        .json({ error: 'Backend unavailable. Ensure the .NET API is running on port 5225.' });
    }
  }
});

// Must be before express.json() so the raw body stream is forwarded untouched
app.use((req, res, next) => {
  const isApiCall = req.path.startsWith('/api/');
  // These two bottle endpoints are now handled by the .NET backend (which
  // proxies them to the YOLO Python server on port 8000).
  // Everything else → .NET backend as usual.
  if (isApiCall) {
    return dotnetProxy(req, res, next);
  }
  next();
});

// ── JSON body parsing (only for non-proxied local routes below) ──────────────
app.use(express.json({ limit: '10mb' }));

// NOTE: /api/bottles/analyze-image is now handled by the .NET backend,
// which forwards it to the YOLO Python server on port 8000.
// Gemini AI is no longer used for bottle detection.

// ── Dev: Vite middleware / Prod: static files ─────────────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EcoCharge Server] Running on http://0.0.0.0:${PORT}`);
    console.log('[Proxy] /api/* → http://localhost:5225 (.NET backend)');
  });
}

startServer();
