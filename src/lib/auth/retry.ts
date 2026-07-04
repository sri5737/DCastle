import { AuthError } from '@supabase/supabase-js';

type Operation<T> = () => Promise<T>;

const MAX_RETRIES = 1;
const INITIAL_BACKOFF = 500; // 500ms

function isTransientError(error: unknown): boolean {
	if (error instanceof AuthError) {
		// 5xx errors are considered transient
		return error.status >= 500 && error.status <= 599;
	}
	// Also consider generic network errors, which may not have a status
	if (error instanceof Error && error.message.toLowerCase().includes('network')) {
		return true;
	}
	return false;
}

export async function withRetry<T>(operation: Operation<T>): Promise<T> {
	let attempts = 0;
	while (attempts <= MAX_RETRIES) {
		try {
			return await operation();
		} catch (error) {
			if (attempts < MAX_RETRIES && isTransientError(error)) {
				const backoff = INITIAL_BACKOFF * Math.pow(2, attempts);
				console.warn(`Transient auth error detected. Retrying in ${backoff}ms...`, error);
				await new Promise(resolve => setTimeout(resolve, backoff));
				attempts++;
			} else {
				// Non-transient error or max retries reached
				throw error;
			}
		}
	}
	// This should be unreachable, but typescript needs a return path.
	throw new Error('Max retries exceeded. This should not be reached.');
}
