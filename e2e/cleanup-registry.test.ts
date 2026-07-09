import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { cleanupRegisteredRecords, createCleanupRecord, registerCleanupRecords, sortCleanupRecords } from './cleanup-registry';

describe('cleanup registry', () => {
  it('sorts dependent cleanup before parent cleanup', () => {
    const records = sortCleanupRecords([
      createCleanupRecord({ testCaseId: 'case', marker: 'E2E case', resource: 'hostelers', recordId: 'h1', deleteOrder: 30, cleanupStrategy: 'delete' }),
      createCleanupRecord({ testCaseId: 'case', marker: 'E2E case', resource: 'invite_tokens', recordId: 'i1', deleteOrder: 10, cleanupStrategy: 'delete' }),
    ]);

    expect(records.map(record => record.resource)).toEqual(['invite_tokens', 'hostelers']);
  });

  it('cleans tracked IDs and restores settings while tolerating partial failures', async () => {
    const registryPath = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'dcastle-cleanup-')), 'cleanup.json');
    const deleted: string[] = [];
    const restored: Record<string, string>[] = [];
    const supabase = {
      from(resource: string) {
        return {
          delete: () => ({ eq: async (_field: string, id: string) => { deleted.push(`${resource}:${id}`); return { error: null }; } }),
          upsert: async (value: Record<string, string>) => { restored.push(value); return { error: null }; },
        };
      },
      auth: { admin: { deleteUser: async (id: string) => { deleted.push(`auth.users:${id}`); return { error: null }; } } },
    };

    await registerCleanupRecords([
      createCleanupRecord({ testRunId: 'run', testCaseId: 'case', marker: 'E2E case', resource: 'settings', recordId: 'snapshot', deleteOrder: 1, cleanupStrategy: 'restore', restoreValue: { deadline_time: '21:00' } }),
      createCleanupRecord({ testRunId: 'run', testCaseId: 'case', marker: 'E2E case', resource: 'hostelers', recordId: 'h1', deleteOrder: 30, cleanupStrategy: 'delete' }),
      createCleanupRecord({ testRunId: 'run', testCaseId: 'case', marker: 'E2E case', resource: 'auth.users', recordId: 'u1', deleteOrder: 40, cleanupStrategy: 'delete' }),
    ], registryPath);

    const result = await cleanupRegisteredRecords(supabase as never, registryPath);

    expect(result).toEqual({ attempted: 3, failures: [] });
    expect(restored).toContainEqual({ key: 'deadline_time', value: '21:00' });
    expect(deleted).toEqual(['hostelers:h1', 'auth.users:u1']);
  });
});
