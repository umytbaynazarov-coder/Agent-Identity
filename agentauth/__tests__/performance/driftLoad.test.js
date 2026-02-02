/**
 * Drift Score Calculation Under Load
 *
 * Tests the computational performance of drift score calculation
 * with varying numbers of metrics, weights, and edge cases.
 * DB round-trips are mocked — this tests pure compute only.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Mocks — uses plain functions (not jest.fn) so resetMocks won't clear them
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  }),
}));

jest.mock('../../src/services/personaService', () => {
  function canonicalize(obj) {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(canonicalize);
    if (typeof obj === 'number') return Math.round(obj * 1e10) / 1e10;
    if (typeof obj !== 'object') return obj;
    const sorted = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = canonicalize(obj[key]);
    }
    return sorted;
  }
  return { canonicalize, fireWebhook: () => Promise.resolve() };
});

jest.mock('../../src/config/logger', () => ({
  info: () => {}, warn: () => {}, error: () => {}, debug: () => {},
}));

jest.spyOn(console, 'log').mockImplementation();
jest.spyOn(console, 'error').mockImplementation();

const { calculateDriftScore } = require('../../src/services/driftService');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function generateMetrics(count) {
  const metrics = {};
  for (let i = 0; i < count; i++) {
    metrics[`metric_${i}`] = Math.random();
  }
  return metrics;
}

function generateWeights(count) {
  const weights = {};
  const w = 1 / count;
  for (let i = 0; i < count; i++) {
    weights[`metric_${i}`] = w;
  }
  return weights;
}

// ─────────────────────────────────────────────────────────────────────────────
// Benchmarks
// ─────────────────────────────────────────────────────────────────────────────

describe('Drift Score Calculation Under Load', () => {
  describe('Throughput with standard metric count (5 metrics)', () => {
    const ITERATIONS = 10000;

    it(`should compute ${ITERATIONS} drift scores in <1000ms`, () => {
      const baseline = generateMetrics(5);
      const weights = generateWeights(5);

      const start = performance.now();

      for (let i = 0; i < ITERATIONS; i++) {
        const current = generateMetrics(5);
        calculateDriftScore(current, baseline, weights);
      }

      const elapsed = performance.now() - start;
      const avgUs = (elapsed / ITERATIONS) * 1000;

      console.info(`Drift score (5 metrics): ${ITERATIONS} iterations in ${elapsed.toFixed(1)}ms (avg ${avgUs.toFixed(1)}µs)`);

      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('Throughput with many metrics (50 metrics)', () => {
    const ITERATIONS = 5000;

    it(`should compute ${ITERATIONS} drift scores with 50 metrics in <2000ms`, () => {
      const baseline = generateMetrics(50);
      const weights = generateWeights(50);

      const start = performance.now();

      for (let i = 0; i < ITERATIONS; i++) {
        const current = generateMetrics(50);
        calculateDriftScore(current, baseline, weights);
      }

      const elapsed = performance.now() - start;
      const avgUs = (elapsed / ITERATIONS) * 1000;

      console.info(`Drift score (50 metrics): ${ITERATIONS} iterations in ${elapsed.toFixed(1)}ms (avg ${avgUs.toFixed(1)}µs)`);

      expect(elapsed).toBeLessThan(2000);
    });
  });

  describe('Throughput with large metric count (200 metrics)', () => {
    const ITERATIONS = 1000;

    it(`should compute ${ITERATIONS} drift scores with 200 metrics in <2000ms`, () => {
      const baseline = generateMetrics(200);
      const weights = generateWeights(200);

      const start = performance.now();

      for (let i = 0; i < ITERATIONS; i++) {
        const current = generateMetrics(200);
        calculateDriftScore(current, baseline, weights);
      }

      const elapsed = performance.now() - start;
      const avgUs = (elapsed / ITERATIONS) * 1000;

      console.info(`Drift score (200 metrics): ${ITERATIONS} iterations in ${elapsed.toFixed(1)}ms (avg ${avgUs.toFixed(1)}µs)`);

      expect(elapsed).toBeLessThan(2000);
    });
  });

  describe('Edge case: null/empty handling performance', () => {
    const ITERATIONS = 100000;

    it(`should handle ${ITERATIONS} null-baseline calls in <500ms`, () => {
      const start = performance.now();

      for (let i = 0; i < ITERATIONS; i++) {
        calculateDriftScore({ a: Math.random() }, null, { a: 1 });
      }

      const elapsed = performance.now() - start;

      console.info(`Null baseline: ${ITERATIONS} iterations in ${elapsed.toFixed(1)}ms`);

      expect(elapsed).toBeLessThan(500);
    });

    it(`should handle ${ITERATIONS} empty-metrics calls in <500ms`, () => {
      const start = performance.now();

      for (let i = 0; i < ITERATIONS; i++) {
        calculateDriftScore({}, { a: 0.5 }, { a: 1 });
      }

      const elapsed = performance.now() - start;

      console.info(`Empty metrics: ${ITERATIONS} iterations in ${elapsed.toFixed(1)}ms`);

      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('Score correctness under load', () => {
    it('should produce consistent results across iterations', () => {
      const baseline = { a: 0.5, b: 0.3, c: 0.7 };
      const current = { a: 0.8, b: 0.1, c: 0.9 };
      const weights = { a: 0.4, b: 0.3, c: 0.3 };

      const scores = new Set();
      for (let i = 0; i < 1000; i++) {
        scores.add(calculateDriftScore(current, baseline, weights));
      }

      // Should produce exactly one unique score (deterministic)
      expect(scores.size).toBe(1);
    });
  });
});
