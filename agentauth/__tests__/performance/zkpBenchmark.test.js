const crypto = require('crypto');

/**
 * ZKP Verify Latency Benchmark
 *
 * Target: <500ms per verification (hash mode + ZKP mode).
 * Uses jest-circus (default Jest 30+ runner) for accurate timing.
 *
 * These benchmarks test the computational overhead of:
 * - SHA-256 commitment generation
 * - HMAC signature verification
 * - snarkjs Groth16 proof verification (mocked, measures overhead)
 * - Database round-trip is excluded (mocked) — this tests compute only
 */

// ─────────────────────────────────────────────────────────────────────────────
// Mocks — uses plain functions (not jest.fn) so resetMocks won't clear them
// ─────────────────────────────────────────────────────────────────────────────

let mockRecord = null;

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: mockRecord,
            error: mockRecord ? null : { code: 'PGRST116' },
          }),
          eq: () => ({
            single: () => Promise.resolve({
              data: mockRecord,
              error: mockRecord ? null : { code: 'PGRST116' },
            }),
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 1 }, error: null }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  }),
}));

// Simulated snarkjs verification with realistic timing
jest.mock('snarkjs', () => ({
  groth16: {
    verify: async () => {
      // Simulate ~10ms crypto work (real Groth16 on bn128 is 50-200ms)
      await new Promise(r => setTimeout(r, 10));
      return true;
    },
  },
}));

jest.mock('../../zkp/verification_key.json', () => ({
  protocol: 'groth16',
  curve: 'bn128',
  nPublic: 1,
  vk_alpha_1: ['mock'],
  vk_beta_2: [['mock']],
  vk_gamma_2: [['mock']],
  vk_delta_2: [['mock']],
  IC: [['mock']],
}), { virtual: true });

jest.mock('../../src/config/logger', () => ({
  info: () => {}, warn: () => {}, error: () => {}, debug: () => {},
}));

jest.spyOn(console, 'log').mockImplementation();
jest.spyOn(console, 'error').mockImplementation();

const {
  generateCommitment,
  verifyAnonymous,
} = require('../../src/services/zkpService');

// ─────────────────────────────────────────────────────────────────────────────
// Benchmarks
// ─────────────────────────────────────────────────────────────────────────────

describe('ZKP Performance Benchmarks', () => {
  const TARGET_LATENCY_MS = 500;
  const ITERATIONS = 100;

  describe('Commitment generation', () => {
    it(`should generate ${ITERATIONS} commitments in <${TARGET_LATENCY_MS}ms`, () => {
      const start = performance.now();

      for (let i = 0; i < ITERATIONS; i++) {
        generateCommitment(`agt_bench_${i}`, 'sk_bench_key');
      }

      const elapsed = performance.now() - start;
      const avgMs = elapsed / ITERATIONS;

      // Log performance data
      console.info(`Commitment generation: ${ITERATIONS} iterations in ${elapsed.toFixed(1)}ms (avg ${avgMs.toFixed(2)}ms)`);

      expect(avgMs).toBeLessThan(TARGET_LATENCY_MS);
    });
  });

  describe('Hash-mode verification latency', () => {
    it(`should verify hash commitment in <${TARGET_LATENCY_MS}ms average`, async () => {
      const latencies = [];

      for (let i = 0; i < 50; i++) {
        const commitment = crypto.createHash('sha256')
          .update(`test-preimage-${i}`)
          .digest('hex');

        mockRecord = {
          commitment,
          status: 'active',
          permissions: ['read'],
          tier: 'pro',
          expires_at: null,
        };

        const start = performance.now();
        await verifyAnonymous(commitment, { preimage_hash: commitment }, 'hash');
        const elapsed = performance.now() - start;

        latencies.push(elapsed);
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

      console.info(`Hash verification: avg=${avgLatency.toFixed(2)}ms, p95=${p95.toFixed(2)}ms, max=${maxLatency.toFixed(2)}ms`);

      expect(avgLatency).toBeLessThan(TARGET_LATENCY_MS);
      expect(p95).toBeLessThan(TARGET_LATENCY_MS);
    });
  });

  describe('ZKP-mode verification latency', () => {
    it(`should verify ZKP proof in <${TARGET_LATENCY_MS}ms average`, async () => {
      const latencies = [];

      for (let i = 0; i < 50; i++) {
        const commitment = crypto.createHash('sha256')
          .update(`zkp-preimage-${i}`)
          .digest('hex');

        mockRecord = {
          commitment,
          status: 'active',
          permissions: ['read', 'write'],
          tier: 'enterprise',
          expires_at: null,
        };

        const mockProof = {
          pi_a: ['1', '2', '3'],
          pi_b: [['1', '2'], ['3', '4'], ['5', '6']],
          pi_c: ['7', '8', '9'],
        };

        const start = performance.now();
        await verifyAnonymous(commitment, { proof: mockProof, publicSignals: [commitment] }, 'zkp');
        const elapsed = performance.now() - start;

        latencies.push(elapsed);
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

      console.info(`ZKP verification: avg=${avgLatency.toFixed(2)}ms, p95=${p95.toFixed(2)}ms, max=${maxLatency.toFixed(2)}ms`);

      expect(avgLatency).toBeLessThan(TARGET_LATENCY_MS);
      expect(p95).toBeLessThan(TARGET_LATENCY_MS);
    });
  });

  describe('SHA-256 hashing throughput', () => {
    it('should hash 10,000 preimages in <1000ms', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        crypto.createHash('sha256')
          .update(`agent-${i}:key-${i}:salt-${i}`)
          .digest('hex');
      }

      const elapsed = performance.now() - start;
      console.info(`SHA-256 throughput: 10,000 hashes in ${elapsed.toFixed(1)}ms`);

      expect(elapsed).toBeLessThan(1000);
    });
  });
});
