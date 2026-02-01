import { describe, it, expect } from 'vitest';
import {
  sanitizeInput,
  sanitizeObject,
  sanitizeArray,
  containsXSS,
  sanitizeURL,
} from '../sanitize';

describe('sanitizeInput', () => {
  it('should escape HTML special characters', () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitizeInput(input);

    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('should escape ampersands', () => {
    expect(sanitizeInput('foo & bar')).toBe('foo &amp; bar');
  });

  it('should escape quotes', () => {
    expect(sanitizeInput('foo "bar" \'baz\'')).toContain('&quot;');
    expect(sanitizeInput('foo "bar" \'baz\'')).toContain('&#x27;');
  });

  it('should escape forward slashes', () => {
    expect(sanitizeInput('foo/bar')).toBe('foo&#x2F;bar');
  });

  it('should handle empty strings', () => {
    expect(sanitizeInput('')).toBe('');
  });

  it('should handle null/undefined', () => {
    expect(sanitizeInput(null as any)).toBe(null);
    expect(sanitizeInput(undefined as any)).toBe(undefined);
  });
});

describe('sanitizeObject', () => {
  it('should sanitize all string values in object', () => {
    const obj = {
      name: '<script>alert("xss")</script>',
      email: 'test@example.com',
      role: 'admin',
    };

    const result = sanitizeObject(obj);

    expect(result.name).not.toContain('<script>');
    expect(result.name).toContain('&lt;script&gt;');
    expect(result.email).toBe('test@example.com');
  });

  it('should sanitize nested objects', () => {
    const obj = {
      user: {
        name: '<b>John</b>',
        profile: {
          bio: '<i>Developer</i>',
        },
      },
    };

    const result = sanitizeObject(obj);

    expect(result.user.name).toContain('&lt;b&gt;');
    expect(result.user.profile.bio).toContain('&lt;i&gt;');
  });

  it('should sanitize arrays within objects', () => {
    const obj = {
      tags: ['<script>', '<div>', 'normal'],
    };

    const result = sanitizeObject(obj);

    expect(result.tags[0]).toContain('&lt;script&gt;');
    expect(result.tags[2]).toBe('normal');
  });

  it('should preserve non-string values', () => {
    const obj = {
      name: 'John',
      age: 30,
      active: true,
      score: null,
    };

    const result = sanitizeObject(obj);

    expect(result.age).toBe(30);
    expect(result.active).toBe(true);
    expect(result.score).toBe(null);
  });
});

describe('sanitizeArray', () => {
  it('should sanitize all strings in array', () => {
    const arr = ['<script>', 'normal', '<b>bold</b>'];
    const result = sanitizeArray(arr);

    expect(result[0]).toContain('&lt;script&gt;');
    expect(result[1]).toBe('normal');
    expect(result[2]).toContain('&lt;b&gt;');
  });

  it('should handle empty arrays', () => {
    expect(sanitizeArray([])).toEqual([]);
  });

  it('should handle non-array inputs', () => {
    expect(sanitizeArray(null as any)).toBe(null);
  });
});

describe('containsXSS', () => {
  it('should detect script tags', () => {
    expect(containsXSS('<script>alert(1)</script>')).toBe(true);
    expect(containsXSS('<SCRIPT>alert(1)</SCRIPT>')).toBe(true);
  });

  it('should detect javascript: protocol', () => {
    expect(containsXSS('javascript:alert(1)')).toBe(true);
    expect(containsXSS('JAVASCRIPT:alert(1)')).toBe(true);
  });

  it('should detect event handlers', () => {
    expect(containsXSS('onclick=alert(1)')).toBe(true);
    expect(containsXSS('onerror=alert(1)')).toBe(true);
    expect(containsXSS('onload=alert(1)')).toBe(true);
  });

  it('should detect iframe tags', () => {
    expect(containsXSS('<iframe src="evil.com"></iframe>')).toBe(true);
  });

  it('should detect eval calls', () => {
    expect(containsXSS('eval(malicious)')).toBe(true);
  });

  it('should not flag safe strings', () => {
    expect(containsXSS('This is a normal string')).toBe(false);
    expect(containsXSS('Email: test@example.com')).toBe(false);
  });

  it('should handle empty/null strings', () => {
    expect(containsXSS('')).toBe(false);
    expect(containsXSS(null as any)).toBe(false);
  });
});

describe('sanitizeURL', () => {
  it('should accept valid HTTP URLs', () => {
    const url = 'http://example.com';
    const result = sanitizeURL(url);

    expect(result).toBe(url + '/');
  });

  it('should accept valid HTTPS URLs', () => {
    const url = 'https://example.com';
    const result = sanitizeURL(url);

    expect(result).toBe(url + '/');
  });

  it('should reject javascript: protocol', () => {
    expect(sanitizeURL('javascript:alert(1)')).toBe(null);
  });

  it('should reject data: protocol', () => {
    expect(sanitizeURL('data:text/html,<script>alert(1)</script>')).toBe(null);
  });

  it('should reject file: protocol', () => {
    expect(sanitizeURL('file:///etc/passwd')).toBe(null);
  });

  it('should reject invalid URLs', () => {
    expect(sanitizeURL('not a url')).toBe(null);
    expect(sanitizeURL('')).toBe(null);
  });

  it('should normalize URLs', () => {
    const result = sanitizeURL('https://example.com/path?query=value');
    expect(result).toBeTruthy();
    expect(result).toContain('https://');
  });
});
