import { describe, expect, it, vi } from 'vitest';
import {
  createDiagnosticEvent,
  diagnosticsEnabled,
  emitDiagnosticEvent,
  emitUiDiagnostic,
  redactDiagnosticMetadata,
  withApiDiagnostic,
} from './events';

describe('diagnostic event redaction', () => {
  it('redacts sensitive top-level and nested fields', () => {
    const redacted = redactDiagnosticMetadata({
      pin: '1234',
      password: 'secret',
      token: 'raw-token',
      cookie: 'session-cookie',
      authorization: 'Bearer abc',
      serviceRole: 'service-role-key',
      access_token: 'access',
      refresh_token: 'refresh',
      inviteToken: 'invite-raw',
      nested: { service_role_key: 'nested-key', safeId: 'hosteler-1' },
      safeRoute: '/api/food/submit',
    });

    expect(redacted).toMatchObject({
      pin: '[REDACTED]',
      password: '[REDACTED]',
      token: '[REDACTED]',
      cookie: '[REDACTED]',
      authorization: '[REDACTED]',
      serviceRole: '[REDACTED]',
      access_token: '[REDACTED]',
      refresh_token: '[REDACTED]',
      inviteToken: '[REDACTED]',
      nested: { service_role_key: '[REDACTED]', safeId: 'hosteler-1' },
      safeRoute: '/api/food/submit',
    });
  });

  it('creates structured API diagnostic events without raw secrets', () => {
    const event = createDiagnosticEvent({
      source: 'api',
      route: '/api/invite/activate',
      method: 'POST',
      action: 'invite.activate',
      status: 400,
      durationMs: 12,
      stableErrorCode: 'INVITE_EXPIRED',
      correlationId: 'test-correlation',
      metadata: { invite_token: 'raw-invite-token', hostelerId: 'h1' },
    });

    expect(event).toMatchObject({
      source: 'api',
      route: '/api/invite/activate',
      method: 'POST',
      action: 'invite.activate',
      status: 400,
      durationMs: 12,
      stableErrorCode: 'INVITE_EXPIRED',
      correlationId: 'test-correlation',
      redactedMetadata: { invite_token: '[REDACTED]', hostelerId: 'h1' },
    });
    expect(JSON.stringify(event)).not.toContain('raw-invite-token');
  });

  it('emits only when diagnostics are gated on', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const original = process.env.E2E_DIAGNOSTICS;
    delete process.env.E2E_DIAGNOSTICS;

    expect(diagnosticsEnabled()).toBe(false);
    emitDiagnosticEvent({ source: 'ui', page: '/login', action: 'login.submit', status: 'start' });
    expect(infoSpy).not.toHaveBeenCalled();

    process.env.E2E_DIAGNOSTICS = '1';
    expect(diagnosticsEnabled()).toBe(true);
    emitDiagnosticEvent({ source: 'ui', page: '/login', action: 'login.submit', status: 'success' });
    expect(infoSpy).toHaveBeenCalledTimes(1);

    process.env.E2E_DIAGNOSTICS = original;
    infoSpy.mockRestore();
  });

  it('records duration, status, and stable error code for API operations', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    process.env.E2E_DIAGNOSTICS = '1';

    await expect(
      withApiDiagnostic(
        { route: '/api/auth/pin/verify', method: 'POST', action: 'auth.pin.verify' },
        async () => {
          const error = new Error('Bad PIN');
          error.name = 'INVALID_PIN';
          throw error;
        },
      ),
    ).rejects.toThrow('Bad PIN');

    const logs = infoSpy.mock.calls.map(call => String(call[0]));
    expect(logs.some(log => log.includes('"status":"start"'))).toBe(true);
    expect(logs.some(log => log.includes('"status":"failure"') && log.includes('INVALID_PIN'))).toBe(true);

    delete process.env.E2E_DIAGNOSTICS;
    infoSpy.mockRestore();
  });

  it('records HTTP response status for successful API operations', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    process.env.E2E_DIAGNOSTICS = '1';

    await withApiDiagnostic(
      { route: '/api/settings', method: 'GET', action: 'settings.read' },
      async () => new Response('{}', { status: 201 }),
    );

    const logs = infoSpy.mock.calls.map(call => String(call[0]));
    expect(logs.some(log => log.includes('"status":201'))).toBe(true);

    delete process.env.E2E_DIAGNOSTICS;
    infoSpy.mockRestore();
  });

  it('emits UI action diagnostics with redacted metadata', () => {
    const event = emitUiDiagnostic({
      page: '/join/[token]',
      action: 'invite.activate',
      state: 'submit-start',
      metadata: { pin: '1234', hostelerId: 'h1' },
    });

    expect(event).toMatchObject({
      source: 'ui',
      page: '/join/[token]',
      action: 'invite.activate',
      status: 'start',
      redactedMetadata: { pin: '[REDACTED]', hostelerId: 'h1', state: 'submit-start' },
    });
  });
});
