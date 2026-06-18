import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

// Old→new water-slug 301 map (de-russification migration). Generated into
// public/slug-redirects.json, copied to the browser dist at build time.
let slugRedirects: Record<string, string> = {};
try {
  slugRedirects = JSON.parse(readFileSync(join(browserDistFolder, 'slug-redirects.json'), 'utf8'));
} catch {
  // no redirect map present — fine
}

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * 301-redirect renamed water URLs to their new (Ukrainian) slug, preserving SEO.
 * uk: /vodoymy/:region/:slug   ·   en: /en/waters/:region/:slug
 */
app.use((req, res, next) => {
  const segs = req.path.split('/').filter(Boolean);
  let i = -1;
  if (segs[0] === 'vodoymy' && segs.length === 3) i = 2;
  else if (segs[0] === 'en' && segs[1] === 'waters' && segs.length === 4) i = 3;
  if (i >= 0) {
    const to = slugRedirects[decodeURIComponent(segs[i])];
    if (to) {
      segs[i] = to;
      const q = req.originalUrl.indexOf('?');
      return res.redirect(301, '/' + segs.join('/') + (q >= 0 ? req.originalUrl.slice(q) : ''));
    }
  }
  next();
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
