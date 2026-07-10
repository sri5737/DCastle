import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const quickstart = fs.readFileSync(
  path.resolve(process.cwd(), 'specs/003-e2e-observability-and-test-isolation/quickstart.md'),
  'utf8',
);
const contract = fs.readFileSync(
  path.resolve(process.cwd(), 'specs/003-e2e-observability-and-test-isolation/contracts/validation-scopes.md'),
  'utf8',
);

describe('validation scope documentation', () => {
  it('marks scoped validation as iteration-only and not completion evidence', () => {
    expect(quickstart).toContain('Scoped validation is useful for iteration but is not sufficient completion evidence');
    expect(contract).toContain('Scoped commands are not completion evidence by themselves');
  });

  it('documents rerun-before-broadening workflow and exact command names', () => {
    expect(quickstart).toContain('rerun the same scoped command before broadening validation');
    for (const command of [
      'npm run test:us1',
      'npm run test:us2',
      'npm run test:us3',
      'npm run test:us4',
      'npm run test:us5',
      'npm run test:us10',
      'npm run test:us12',
      'npm run test:e2e:us1',
      'npm run test:e2e:us2',
      'npm run test:e2e:us3',
      'npm run test:e2e:us4',
      'npm run test:e2e:us5',
      'npm run test:e2e:us10',
      'npm run test:e2e:us12',
      'npm run test:e2e:us13',
      'npm run test:phase:auth-invite',
      'npm run test:phase:owner',
      'npm run test:phase:hosteler',
      'npm run test:phase:settings',
      'npm run test:phase:e2e:auth-invite',
      'npm run test:phase:e2e:owner',
      'npm run test:phase:e2e:hosteler',
      'npm run test:phase:e2e:settings',
      'npm run test:phase:e2e:mobile',
      'npm run test:complete:risk',
    ]) {
      expect(quickstart).toContain(command);
      expect(contract).toContain(command);
    }
  });

  it('documents matching unit scope references for key E2E-critical stories', () => {
    expect(quickstart).toContain('matching unit command');
    expect(contract).toContain('Food submission: `npm run test:us1`');
    expect(contract).toContain('Invite activation: `npm run test:us3`');
    expect(contract).toContain('Settings: `npm run test:us10`');
  });
});
