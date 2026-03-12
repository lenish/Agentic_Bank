import { Hono } from 'hono';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LandingPage } from './landing';

export function createLandingServer() {
  const app = new Hono();

  app.get('/', (c) => {
    const html = renderToStaticMarkup(createElement(LandingPage));
    return c.html(`<!DOCTYPE html><html><body>${html}</body></html>`);
  });

  app.get('/api/pilot-apply', (c) => {
    return c.json({ status: 'ok', message: 'Pilot application received' });
  });

  return app;
}
