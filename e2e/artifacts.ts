import type { Page, TestInfo } from '@playwright/test';
import { createArtifactMetadata } from './test-run';

export interface RequestResponseSummary {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  resourceType?: string;
  failureText?: string;
}

export interface FailureArtifactCollector {
  consoleLogs: string[];
  requestSummaries: RequestResponseSummary[];
  appFlowLogs: string[];
  flush: () => Promise<void>;
}

function safeText(value: string) {
  return value
    .replace(/(pin|password|token|cookie|authorization|service[-_]?role|access[_-]?token|refresh[_-]?token)=([^&\s]+)/gi, '$1=[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
}

export function createFailureArtifactCollector(page: Page, testInfo: TestInfo): FailureArtifactCollector {
  const consoleLogs: string[] = [];
  const requestSummaries: RequestResponseSummary[] = [];
  const appFlowLogs: string[] = [];

  page.on('console', message => {
    const text = safeText(message.text());
    consoleLogs.push(`[${message.type()}] ${text}`);
    if (text.includes('[dcastle-diagnostic]')) {
      appFlowLogs.push(text);
    }
  });

  page.on('requestfailed', request => {
    requestSummaries.push({
      url: safeText(request.url()),
      method: request.method(),
      resourceType: request.resourceType(),
      failureText: safeText(request.failure()?.errorText || 'unknown'),
    });
  });

  page.on('response', response => {
    const url = response.url();
    if (!url.includes('/api/')) return;
    requestSummaries.push({
      url: safeText(url),
      method: response.request().method(),
      status: response.status(),
      statusText: response.statusText(),
      resourceType: response.request().resourceType(),
    });
  });

  return {
    consoleLogs,
    requestSummaries,
    appFlowLogs,
    async flush() {
      const metadata = createArtifactMetadata(testInfo.file, testInfo.title, testInfo.retry, testInfo.workerIndex);
      await testInfo.attach('dcastle-e2e-artifacts.json', {
        body: JSON.stringify({ metadata, consoleLogs, requestSummaries, appFlowLogs }, null, 2),
        contentType: 'application/json',
      });
    },
  };
}
