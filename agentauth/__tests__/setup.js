/**
 * Test setup and utilities
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-key';
process.env.FRONTEND_URL = 'http://localhost:5173';

// Increase test timeout for integration tests
jest.setTimeout(10000);

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
