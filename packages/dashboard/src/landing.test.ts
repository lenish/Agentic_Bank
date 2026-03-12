import { describe, test, expect } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LandingPage } from './landing';
import { createLandingServer } from './landing-server';

describe('LandingPage', () => {
  test('renders hero title', () => {
    const html = renderToStaticMarkup(createElement(LandingPage));
    expect(html).toContain('Your agents need a bank account');
  });

  test('renders trust signals section', () => {
    const html = renderToStaticMarkup(createElement(LandingPage));
    expect(html).toContain('trust-signals');
    expect(html).toContain('MAS Regulatory Sandbox');
  });

  test('renders CTA button with default url', () => {
    const html = renderToStaticMarkup(createElement(LandingPage));
    expect(html).toContain('cta-button');
    expect(html).toContain('/api/pilot-apply');
  });

  test('renders features section with 7 layers', () => {
    const html = renderToStaticMarkup(createElement(LandingPage));
    expect(html).toContain('7-Layer');
    expect(html).toContain('KYA Identity');
  });

  test('renders pricing section with Free and Pro tiers', () => {
    const html = renderToStaticMarkup(createElement(LandingPage));
    expect(html).toContain('Free');
    expect(html).toContain('Pro');
    expect(html).toContain('100 transactions');
  });
});

describe('LandingServer', () => {
  test('GET / returns HTML with landing page', async () => {
    const app = createLandingServer();
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Your agents need a bank account');
  });

  test('GET /api/pilot-apply returns 200', async () => {
    const app = createLandingServer();
    const res = await app.request('/api/pilot-apply');
    expect(res.status).toBe(200);
  });
});
