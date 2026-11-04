import path from 'node:path';
import express, { Router } from 'express';

/** Sirve la web compilada en el mismo origen: assets con hash en caché larga e `index.html` sin caché (SPA). */
export function createStaticWebMiddleware(directory: string): Router {
  const root = path.resolve(directory);
  const index = path.join(root, 'index.html');
  const router = Router();
  router.use(
    express.static(root, {
      index: false,
      setHeaders: (res, filePath) => {
        const hashed = filePath.startsWith(path.join(root, 'assets') + path.sep);
        res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
    }),
  );
  router.get(/^(?!\/api(\/|$)).*/, (req, res, next) => {
    if (!req.accepts('html')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(index);
  });
  return router;
}
