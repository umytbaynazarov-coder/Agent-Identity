import type { RetryConfig } from './types';

/**
 * Exponential backoff retry utility
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  attempt = 0
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (attempt >= config.maxRetries) {
      throw error;
    }

    // Check if error is retryable (network errors, 5xx, 429)
    if (!isRetryableError(error)) {
      throw error;
    }

    // Calculate exponential backoff delay
    const delay = Math.min(
      config.baseDelay * Math.pow(2, attempt),
      config.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;
    const totalDelay = delay + jitter;

    await sleep(totalDelay);

    return retryWithBackoff(fn, config, attempt + 1);
  }
}

/**
 * Check if an error should be retried
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // Network errors (fetch failures)
    return true;
  }

  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: number }).status;
    // Retry on 5xx server errors and 429 rate limit
    return status >= 500 || status === 429;
  }

  return false;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a fetch error with status code
 */
export class FetchError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'FetchError';
  }
}

/**
 * Parse error response from API
 */
export async function parseErrorResponse(response: Response): Promise<never> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }

  throw new FetchError(response.status, response.statusText, body);
}

/**
 * Build query string from object
 */
export function buildQueryString(params: Record<string, string | number | boolean>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    searchParams.append(key, String(value));
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Validate base URL format
 */
export function validateBaseURL(url: string): void {
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid baseURL: ${url}. Must be a valid URL (e.g., https://auth.yourcompany.com)`);
  }
}
