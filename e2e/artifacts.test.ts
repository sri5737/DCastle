import { describe, expect, it } from 'vitest';
import type { Page, TestInfo } from '@playwright/test';
import { createFailureArtifactCollector } from './artifacts';

describe('failure artifact collector', () => {
  it('captures console diagnostics and redacts sensitive request summaries', async () => {
    const handlers = new Map<string, Function[]>();
    const page = {
      on(event: string, handler: Function) {
        handlers.set(event, [...(handlers.get(event) || []), handler]);
      },
    } as unknown as Page;
    const attachments: { name: string; body: string }[] = [];
    const testInfo = {
      file: 'e2e/example.spec.ts',
      title: 'example flow',
      retry: 0,
      workerIndex: 0,
      attach: async (name: string, options: { body: string }) => attachments.push({ name, body: options.body }),
    } as unknown as TestInfo;

    const collector = createFailureArtifactCollector(page, testInfo);

    handlers.get('console')?.[0]({ type: () => 'info', text: () => '[dcastle-diagnostic] {"token":"raw"}' });
    handlers.get('requestfailed')?.[0]({
      url: () => 'http://localhost:3000/api/invite/activate?token=raw-token',
      method: () => 'POST',
      resourceType: () => 'xhr',
      failure: () => ({ errorText: 'authorization=Bearer raw' }),
    });
    handlers.get('response')?.[0]({
      url: () => 'http://localhost:3000/api/food/submit',
      status: () => 500,
      statusText: () => 'Internal Server Error',
      request: () => ({ method: () => 'POST', resourceType: () => 'xhr' }),
    });

    await collector.flush();

    expect(collector.appFlowLogs).toHaveLength(1);
    expect(collector.requestSummaries).toHaveLength(2);
    expect(attachments[0].name).toBe('dcastle-e2e-artifacts.json');
    expect(attachments[0].body).not.toContain('raw-token');
    expect(attachments[0].body).not.toContain('Bearer raw');
  });
});
