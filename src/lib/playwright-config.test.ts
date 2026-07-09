import { describe, expect, it } from 'vitest';
import config from '../../playwright.config';

describe('Playwright automation defaults', () => {
  it('runs headless by default with non-blocking reports and failure artifacts', () => {
    expect(config.use?.headless).toBe(true);
    expect(config.use?.trace).toBe('retain-on-failure');
    expect(config.use?.screenshot).toBe('only-on-failure');
    expect(config.use?.video).toBe('retain-on-failure');
    expect(config.reporter).toEqual([['list'], ['html', { open: 'never' }]]);
    expect(config.workers).toBe(1);
  });
});
