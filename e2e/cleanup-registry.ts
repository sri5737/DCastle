import fs from 'fs/promises';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getTestRunId } from './test-run';

export type CleanupTable = 'invite_tokens' | 'food_preferences' | 'hostelers' | 'settings';
export type CleanupResource = CleanupTable | 'auth.users';

export interface CleanupRecord {
  testRunId: string;
  testCaseId: string;
  resource: CleanupResource;
  recordId: string;
  marker: string;
  deleteOrder: number;
  cleanupStrategy: 'delete' | 'restore';
  restoreValue?: Record<string, string>;
  createdAt: string;
}

const DEFAULT_REGISTRY_PATH = path.resolve(process.cwd(), 'test-results', 'e2e-cleanup-registry.json');

export function getCleanupRegistryPath() {
  return process.env.E2E_CLEANUP_REGISTRY_PATH || DEFAULT_REGISTRY_PATH;
}

export function createCleanupRecord(input: Omit<CleanupRecord, 'testRunId' | 'createdAt'> & { testRunId?: string }) {
  return {
    ...input,
    testRunId: input.testRunId || getTestRunId(),
    createdAt: new Date().toISOString(),
  } satisfies CleanupRecord;
}

export async function readCleanupRegistry(registryPath = getCleanupRegistryPath()) {
  try {
    const file = await fs.readFile(registryPath, 'utf8');
    return JSON.parse(file) as CleanupRecord[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function writeCleanupRegistry(records: CleanupRecord[], registryPath = getCleanupRegistryPath()) {
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  await fs.writeFile(registryPath, JSON.stringify(records, null, 2), 'utf8');
}

export async function registerCleanupRecord(record: CleanupRecord, registryPath = getCleanupRegistryPath()) {
  const records = await readCleanupRegistry(registryPath);
  const exists = records.some(
    item => item.resource === record.resource && item.recordId === record.recordId && item.testRunId === record.testRunId,
  );
  if (!exists) {
    records.push(record);
    await writeCleanupRegistry(records, registryPath);
  }
}

export async function registerCleanupRecords(recordsToAdd: CleanupRecord[], registryPath = getCleanupRegistryPath()) {
  for (const record of recordsToAdd) {
    await registerCleanupRecord(record, registryPath);
  }
}

export function sortCleanupRecords(records: CleanupRecord[]) {
  return [...records].sort((left, right) => left.deleteOrder - right.deleteOrder);
}

export async function cleanupRegisteredRecords(supabase: SupabaseClient, registryPath = getCleanupRegistryPath()) {
  const records = sortCleanupRecords(await readCleanupRegistry(registryPath));
  const failures: string[] = [];

  for (const record of records) {
    try {
      if (record.cleanupStrategy === 'restore' && record.resource === 'settings' && record.restoreValue) {
        for (const [key, value] of Object.entries(record.restoreValue)) {
          const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
          if (error) throw error;
        }
        continue;
      }

      if (record.resource === 'auth.users') {
        const { error } = await supabase.auth.admin.deleteUser(record.recordId);
        if (error) throw error;
        continue;
      }

      const { error } = await supabase.from(record.resource).delete().eq('id', record.recordId);
      if (error) throw error;
    } catch (error) {
      failures.push(`${record.resource}:${record.recordId}:${(error as Error).message}`);
    }
  }

  if (records.length > 0) {
    await writeCleanupRegistry([], registryPath);
  }

  return { attempted: records.length, failures };
}
