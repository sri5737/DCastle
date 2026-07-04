import { getRequestContext } from '@cloudflare/next-on-pages';

/**
 * Get an environment variable that works on both Node.js (local dev) and Cloudflare Workers (production).
 * On Cloudflare, runtime vars/secrets are accessed via getRequestContext().env, not process.env.
 */
export function getEnvVar(key: string): string {
  // Try Cloudflare request context first (production)
  try {
    const { env } = getRequestContext();
    const value = (env as Record<string, string | undefined>)[key];
    if (value) return value;
  } catch {
    // Not in a Cloudflare request context (local dev) — fall through to process.env
  }

  return process.env[key] || '';
}
