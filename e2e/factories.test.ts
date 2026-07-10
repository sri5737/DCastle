import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { createCleanupRecord, readCleanupRegistry, registerCleanupRecords } from './cleanup-registry';
import { createStableMarker, createTestCaseId } from './test-run';
import { redactDiagnosticMetadata } from '../src/lib/diagnostics/events';

describe('E2E factory support', () => {
  it('creates stable test identifiers and markers without unsafe characters', () => {
    const testCaseId = createTestCaseId('e2e/us3-invite-activation.spec.ts', 'activates invite through UI');
    const marker = createStableMarker(testCaseId, 'run-abc123');

    expect(testCaseId).toContain('us3-invite-activation.spec.ts');
    expect(marker).toMatch(/^E2E /);
    expect(marker).toContain('run-abc123');
  });

  it('registers cleanup metadata for tracked records', async () => {
    const registryPath = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'dcastle-e2e-')), 'cleanup.json');
    await registerCleanupRecords([
      createCleanupRecord({
        testRunId: 'run-test',
        testCaseId: 'case-test',
        marker: 'E2E case run-test',
        resource: 'invite_tokens',
        recordId: 'invite-1',
        deleteOrder: 10,
        cleanupStrategy: 'delete',
      }),
    ], registryPath);

    const records = await readCleanupRegistry(registryPath);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ resource: 'invite_tokens', recordId: 'invite-1', testRunId: 'run-test' });
  });

  it('redacts factory credentials before diagnostic output', () => {
    const redacted = redactDiagnosticMetadata({ pin: '1234', inviteUrl: '/join/raw-token', phone: '9799999999' });

    expect(redacted.pin).toBe('[REDACTED]');
    expect(redacted.inviteUrl).toBe('/join/raw-token');
    expect(redacted.phone).toBe('9799999999');
  });
});
