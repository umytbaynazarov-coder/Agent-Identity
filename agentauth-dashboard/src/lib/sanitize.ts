/**
 * Input sanitization utilities to prevent XSS attacks
 *
 * These functions escape HTML special characters that could be used
 * for cross-site scripting attacks.
 */

/**
 * Sanitize a single string input by escaping HTML special characters
 * @param input - The string to sanitize
 * @returns Sanitized string safe for display
 */
export function sanitizeInput(input: string): string {
  if (!input) return input;

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize all string values in an object recursively
 * @param obj - The object to sanitize
 * @returns New object with sanitized string values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  const result = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key as keyof T] = sanitizeInput(value) as any;
    } else if (Array.isArray(value)) {
      result[key as keyof T] = value.map(item =>
        typeof item === 'string' ? sanitizeInput(item) : item
      ) as any;
    } else if (typeof value === 'object' && value !== null) {
      result[key as keyof T] = sanitizeObject(value);
    } else {
      result[key as keyof T] = value;
    }
  }

  return result;
}

/**
 * Sanitize array of strings
 * @param arr - Array of strings to sanitize
 * @returns New array with sanitized strings
 */
export function sanitizeArray(arr: string[]): string[] {
  if (!Array.isArray(arr)) return arr;
  return arr.map(item => sanitizeInput(item));
}

/**
 * Check if a string contains potential XSS patterns
 * @param input - The string to check
 * @returns true if suspicious patterns found
 */
export function containsXSS(input: string): boolean {
  if (!input) return false;

  const xssPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onerror, etc.
    /<iframe/gi,
    /eval\(/gi,
    /expression\(/gi,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Validate and sanitize URL input
 * @param url - URL to validate
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeURL(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}
