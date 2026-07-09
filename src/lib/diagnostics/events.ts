export type DiagnosticSource = 'api' | 'ui' | 'playwright' | 'setup';
export type DiagnosticStatus = 'start' | 'success' | 'failure';

export interface DiagnosticEvent {
  timestamp: string;
  source: DiagnosticSource;
  route?: string;
  page?: string;
  method?: string;
  action: string;
  status: DiagnosticStatus | number;
  durationMs?: number;
  stableErrorCode?: string;
  correlationId: string;
  testRunId?: string;
  redactedMetadata?: Record<string, unknown>;
}

const SENSITIVE_KEY_PATTERN = /(?:pin|password|token|cookie|authorization|service[-_]?role|access[_-]?token|refresh[_-]?token|invite[_-]?token|supabase.*token|secret|key)/i;
const MAX_STRING_LENGTH = 180;

function envFlag(name: string) {
  if (typeof process === 'undefined') return false;
  return process.env[name] === '1' || process.env[name] === 'true';
}

function responseStatus(result: unknown): number | DiagnosticStatus {
  if (typeof Response !== 'undefined' && result instanceof Response) {
    return result.status;
  }
  return 'success';
}

export function diagnosticsEnabled() {
  return envFlag('E2E_DIAGNOSTICS') || envFlag('NEXT_PUBLIC_E2E_DIAGNOSTICS') || envFlag('DEBUG_DIAGNOSTICS');
}

export function createCorrelationId(prefix = 'diag') {
  const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${uuid.replace(/-/g, '').slice(0, 16)}`;
}

export function redactDiagnosticValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return '[REDACTED]';
  }

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => redactDiagnosticValue(`${key}[${index}]`, item));
  }

  if (value && typeof value === 'object') {
    return redactDiagnosticMetadata(value as Record<string, unknown>);
  }

  return value;
}

export function redactDiagnosticMetadata(metadata: Record<string, unknown> = {}) {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, redactDiagnosticValue(key, value)]),
  );
}

export function createDiagnosticEvent(input: Omit<DiagnosticEvent, 'timestamp' | 'correlationId' | 'redactedMetadata'> & {
  correlationId?: string;
  metadata?: Record<string, unknown>;
}) {
  return {
    timestamp: new Date().toISOString(),
    correlationId: input.correlationId || createCorrelationId(input.source),
    source: input.source,
    route: input.route,
    page: input.page,
    method: input.method,
    action: input.action,
    status: input.status,
    durationMs: input.durationMs,
    stableErrorCode: input.stableErrorCode,
    testRunId: input.testRunId,
    redactedMetadata: redactDiagnosticMetadata(input.metadata),
  } satisfies DiagnosticEvent;
}

export function emitDiagnosticEvent(input: Parameters<typeof createDiagnosticEvent>[0]) {
  const event = createDiagnosticEvent(input);
  if (diagnosticsEnabled()) {
    console.info(`[dcastle-diagnostic] ${JSON.stringify(event)}`);
  }
  return event;
}

export function emitUiDiagnostic(input: {
  page: string;
  action: string;
  state: 'click' | 'submit-start' | 'submit-success' | 'submit-failure' | 'navigation-intent';
  correlationId?: string;
  metadata?: Record<string, unknown>;
}) {
  return emitDiagnosticEvent({
    source: 'ui',
    page: input.page,
    action: input.action,
    status: input.state === 'submit-failure' ? 'failure' : input.state === 'submit-success' ? 'success' : 'start',
    correlationId: input.correlationId,
    metadata: { ...input.metadata, state: input.state },
  });
}

export async function withApiDiagnostic<T>(input: {
  route: string;
  method: string;
  action: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}, operation: () => Promise<T>) {
  const startedAt = Date.now();
  const correlationId = input.correlationId || createCorrelationId('api');
  emitDiagnosticEvent({ ...input, source: 'api', status: 'start', correlationId });

  try {
    const result = await operation();
    emitDiagnosticEvent({
      ...input,
      source: 'api',
      status: responseStatus(result),
      correlationId,
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    emitDiagnosticEvent({
      ...input,
      source: 'api',
      status: 'failure',
      correlationId,
      durationMs: Date.now() - startedAt,
      stableErrorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      metadata: { ...input.metadata, errorMessage: error instanceof Error ? error.message : String(error) },
    });
    throw error;
  }
}
