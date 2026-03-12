import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PricePage } from './price-page';

describe('PricePage component', () => {
  it('renders Free and Pro tier cards', () => {
    const html = renderToStaticMarkup(createElement(PricePage));

    expect(html).toContain('class="price-tier price-tier-free"');
    expect(html).toContain('class="price-tier price-tier-pro"');
    expect(html).toContain('>Free<');
    expect(html).toContain('>Pro<');
  });

  it('renders comparison table with all feature rows', () => {
    const html = renderToStaticMarkup(createElement(PricePage));

    expect(html).toContain('<table class="price-comparison"');
    expect(html).toContain('Monthly Transactions');
    expect(html).toContain('Transaction Cost');
    expect(html).toContain('Risk Models');
    expect(html).toContain('API Access');
    expect(html).toContain('Decision Records');
    expect(html).toContain('Settlement Rail');
    expect(html).toContain('Support');
    expect(html).toContain('SLA');
  });

  it('displays correct free tier limits and pro tier pricing', () => {
    const html = renderToStaticMarkup(createElement(PricePage));

    expect(html).toContain('>100<');
    expect(html).toContain('>Unlimited<');
    expect(html).toContain('>Basic<');
    expect(html).toContain('>Premium (SGD 0.05 / decision)<');
    expect(html).toContain('>SGD 0.01 / tx<');
    expect(html).toContain('100 transactions / month');
  });

  it('renders pricing page title and subtitle', () => {
    const html = renderToStaticMarkup(createElement(PricePage));

    expect(html).toContain('class="price-page-title">Pricing<');
    expect(html).toContain('Start free. Scale with token-based billing.');
  });
});
