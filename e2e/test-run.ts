export type E2ERecordType =
  | 'hosteler'
  | 'authUser'
  | 'inviteToken'
  | 'foodPreference'
  | 'settingsSnapshot';

export type E2ECleanupStrategy = 'delete' | 'restore' | 'manual-serial-exception';

export interface E2ETestRecord {
  recordType: E2ERecordType;
  recordId: string;
  testRunId: string;
  testCaseId: string;
  marker: string;
  createdAt: string;
  cleanupStrategy: E2ECleanupStrategy;
  sensitiveFields: string[];
}

const DEFAULT_TEST_RUN_ID = createShortId('run');

function randomId() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createShortId(prefix: string) {
  return `${prefix}-${randomId().replace(/-/g, '').slice(0, 12)}`;
}

export function getTestRunId() {
  return process.env.E2E_TEST_RUN_ID || DEFAULT_TEST_RUN_ID;
}

export function createTestCaseId(specPath: string, testTitle: string) {
  return `${specPath}::${testTitle}`
    .replace(/[^a-zA-Z0-9._:-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

export function createStableMarker(scope: string, testRunId = getTestRunId()) {
  const safeScope = scope.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `E2E ${safeScope} ${testRunId}`;
}

export function createArtifactMetadata(specPath: string, testTitle: string, retry = 0, workerIndex = 0) {
  const testRunId = getTestRunId();
  const testCaseId = createTestCaseId(specPath, testTitle);

  return {
    specPath,
    testTitle,
    testRunId,
    testCaseId,
    retry,
    workerIndex,
    createdAt: new Date().toISOString(),
  };
}
