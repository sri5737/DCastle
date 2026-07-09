import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

describe('validation scope scripts', () => {
  it('defines story-scoped Playwright commands for each existing E2E spec', () => {
    expect(packageJson.scripts).toMatchObject({
      'test:e2e:us1': 'playwright test e2e/us1-food-submission.spec.ts',
      'test:e2e:us2': 'playwright test e2e/us2-owner-dashboard.spec.ts',
      'test:e2e:us3': 'playwright test e2e/us3-invite-activation.spec.ts',
      'test:e2e:us4': 'playwright test e2e/us4-hosteler-login.spec.ts',
      'test:e2e:us5': 'playwright test e2e/us5-hosteler-management.spec.ts',
      'test:e2e:us10': 'playwright test e2e/us10-settings.spec.ts',
      'test:e2e:us12': 'playwright test e2e/us12-auth-proxy.spec.ts',
      'test:e2e:us13': 'playwright test e2e/us13-mobile-viewport.spec.ts',
    });
  });

  it('defines matching story-scoped Vitest commands for targeted API and UI surfaces', () => {
    expect(packageJson.scripts).toMatchObject({
      'test:us1': 'vitest run src/app/api/food/ src/lib/deadline.test.ts',
      'test:us2': 'vitest run src/app/admin/dashboard/',
      'test:us3': 'vitest run src/app/api/invite/',
      'test:us4': 'vitest run src/app/api/auth/',
      'test:us5': 'vitest run src/app/api/hostelers/',
      'test:us10': 'vitest run src/app/api/settings/ src/components/owner-settings-page.tsx',
    });

    // Auth proxy scope keeps middleware coverage tied to auth routes.
    expect(packageJson.scripts['test:us12']).toBe('vitest run src/app/api/auth/ src/middleware.ts');
  });

  it('keeps headed and inspector mode explicit', () => {
    expect(packageJson.scripts['test:e2e:headed']).toBe('playwright test --headed');
    expect(packageJson.scripts['test:e2e:debug']).toBe('playwright test --debug');
    expect(packageJson.scripts['test:e2e']).not.toContain('--headed');
    expect(packageJson.scripts['test:e2e']).not.toContain('--debug');
  });

  it('defines phase-level command groups and risk-based completion guidance scripts', () => {
    expect(packageJson.scripts).toMatchObject({
      'test:phase:auth-invite': 'vitest run src/app/api/auth/ src/app/api/invite/',
      'test:phase:owner': 'vitest run src/app/admin/dashboard/ src/app/api/settings/ src/app/api/hostelers/',
      'test:phase:hosteler': 'vitest run src/app/api/auth/ src/app/api/food/ src/lib/deadline.test.ts',
      'test:phase:settings': 'vitest run src/app/api/settings/ src/components/owner-settings-page.tsx',
      'test:phase:e2e:auth-invite':
        'playwright test e2e/us3-invite-activation.spec.ts e2e/us4-hosteler-login.spec.ts e2e/us12-auth-proxy.spec.ts',
      'test:phase:e2e:owner':
        'playwright test e2e/us2-owner-dashboard.spec.ts e2e/us5-hosteler-management.spec.ts e2e/us10-settings.spec.ts',
      'test:phase:e2e:hosteler': 'playwright test e2e/us1-food-submission.spec.ts e2e/us4-hosteler-login.spec.ts',
      'test:phase:e2e:settings': 'playwright test e2e/us10-settings.spec.ts',
      'test:phase:e2e:mobile': 'playwright test e2e/us13-mobile-viewport.spec.ts',
      'test:complete:risk': 'npm run test:run',
      'test:complete:risk:us1': 'npm run test:us1 && npm run test:e2e:us1 && npm run test:run',
      'test:complete:risk:us3': 'npm run test:us3 && npm run test:e2e:us3 && npm run test:run',
    });

    expect(packageJson.scripts['build:cloudflare']).toBe('node scripts/cloudflare-build-parity.mjs');
    expect(packageJson.scripts['test:e2e']).toBe('playwright test');
  });
});
