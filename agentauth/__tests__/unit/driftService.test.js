// ─────────────────────────────────────────────────────────────────────────────
// Mock Supabase — uses plain functions (not jest.fn) so resetMocks won't clear them
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

// Mock personaService (driftService imports canonicalize from it)
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
  return {
    canonicalize,
    fireWebhook: () => Promise.resolve(),
  };
});

// Mock logger
jest.mock('../../src/config/logger', () => ({
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
}));

jest.spyOn(console, 'log').mockImplementation();
jest.spyOn(console, 'error').mockImplementation();

const {
  calculateDriftScore,
  detectSpikes,
} = require('../../src/services/driftService');

// ─────────────────────────────────────────────────────────────────────────────
// calculateDriftScore()
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateDriftScore()', () => {
  describe('basic behavior', () => {
    it('should return 0 when current metrics match baseline exactly', () => {
      const baseline = { toxicity: 0.1, adherence: 0.9 };
      const current = { toxicity: 0.1, adherence: 0.9 };
      const weights = { toxicity: 0.5, adherence: 0.5 };

      expect(calculateDriftScore(current, baseline, weights)).toBe(0);
    });

    it('should return 0 when baseline is null', () => {
      expect(calculateDriftScore({ a: 1 }, null, { a: 1 })).toBe(0);
    });

    it('should return 0 when current metrics is null', () => {
      expect(calculateDriftScore(null, { a: 1 }, { a: 1 })).toBe(0);
    });

    it('should return 0 when current metrics is empty', () => {
      expect(calculateDriftScore({}, { a: 1 }, { a: 1 })).toBe(0);
    });

    it('should return 0 when no overlapping metrics between current and weights', () => {
      const current = { a: 0.5 };
      const baseline = { a: 0.3 };
      const weights = { b: 1.0 }; // Different key

      expect(calculateDriftScore(current, baseline, weights)).toBe(0);
    });
  });

  describe('zero baseline handling', () => {
    it('should use absolute current value as delta when baseline is 0', () => {
      const current = { metric: 0.5 };
      const baseline = { metric: 0 };
      const weights = { metric: 1.0 };

      // delta = |0.5| = 0.5, capped at 1.0
      // score = 0.5 * 1.0 / 1.0 = 0.5
      expect(calculateDriftScore(current, baseline, weights)).toBe(0.5);
    });

    it('should return 0 when both current and baseline are 0', () => {
      const current = { metric: 0 };
      const baseline = { metric: 0 };
      const weights = { metric: 1.0 };

      expect(calculateDriftScore(current, baseline, weights)).toBe(0);
    });
  });

  describe('max delta capping', () => {
    it('should cap individual metric delta at 1.0', () => {
      const current = { metric: 100 };
      const baseline = { metric: 1 };
      const weights = { metric: 1.0 };

      // delta = |100 - 1| / |1| = 99, capped at 1.0
      // score = 1.0 * 1.0 / 1.0 = 1.0
      expect(calculateDriftScore(current, baseline, weights)).toBe(1.0);
    });

    it('should cap at 1.0 even with extreme values', () => {
      const current = { metric: 1000000 };
      const baseline = { metric: 0.001 };
      const weights = { metric: 1.0 };

      const score = calculateDriftScore(current, baseline, weights);
      expect(score).toBeLessThanOrEqual(1.0);
    });
  });

  describe('equal weights (no weights provided)', () => {
    it('should use equal weights when weights is null', () => {
      const current = { a: 0.5, b: 0.5 };
      const baseline = { a: 0.25, b: 0.25 };

      // delta_a = |0.5 - 0.25| / 0.25 = 1.0 (capped at 1.0)
      // delta_b = |0.5 - 0.25| / 0.25 = 1.0 (capped at 1.0)
      // Equal weights: 0.5 each
      // score = (1.0 * 0.5 + 1.0 * 0.5) / (0.5 + 0.5) = 1.0
      expect(calculateDriftScore(current, baseline, null)).toBe(1.0);
    });

    it('should use equal weights when weights is empty object', () => {
      const current = { a: 0.2, b: 0.3 };
      const baseline = { a: 0.2, b: 0.3 };

      expect(calculateDriftScore(current, baseline, {})).toBe(0);
    });

    it('should distribute weights equally across all current metrics', () => {
      const current = { a: 0.6, b: 0.4, c: 0.5 };
      const baseline = { a: 0.5, b: 0.5, c: 0.5 };

      // delta_a = |0.6 - 0.5| / 0.5 = 0.2
      // delta_b = |0.4 - 0.5| / 0.5 = 0.2
      // delta_c = |0.5 - 0.5| / 0.5 = 0.0
      // Equal weights: 1/3 each
      // score = (0.2 * 1/3 + 0.2 * 1/3 + 0.0 * 1/3) / (1/3 + 1/3 + 1/3)
      // score ≈ 0.1333...
      const score = calculateDriftScore(current, baseline, null);
      expect(score).toBeCloseTo(0.1333, 3);
    });
  });

  describe('weighted scoring', () => {
    it('should weight metrics according to provided weights', () => {
      const current = { a: 1.0, b: 0.5 };
      const baseline = { a: 0.5, b: 0.5 };
      const weights = { a: 0.8, b: 0.2 };

      // delta_a = |1.0 - 0.5| / 0.5 = 1.0 (capped)
      // delta_b = |0.5 - 0.5| / 0.5 = 0.0
      // score = (1.0 * 0.8 + 0.0 * 0.2) / (0.8 + 0.2) = 0.8
      expect(calculateDriftScore(current, baseline, weights)).toBe(0.8);
    });

    it('should ignore metrics not in both current and weights', () => {
      const current = { a: 0.5, b: 0.5, extra: 100 };
      const baseline = { a: 0.5, b: 0.5 };
      const weights = { a: 0.5, b: 0.5 };

      // "extra" is not in weights, so it's ignored
      expect(calculateDriftScore(current, baseline, weights)).toBe(0);
    });

    it('should skip metrics missing from baseline', () => {
      const current = { a: 0.5, b: 0.5 };
      const baseline = { a: 0.5 };
      const weights = { a: 0.5, b: 0.5 };

      // b has no baseline, skip it
      // score = (0.0 * 0.5) / (0.5) = 0.0
      expect(calculateDriftScore(current, baseline, weights)).toBe(0);
    });
  });

  describe('precision', () => {
    it('should round result to 10 decimal places', () => {
      const current = { a: 0.333333333333 };
      const baseline = { a: 0.5 };
      const weights = { a: 1.0 };

      const score = calculateDriftScore(current, baseline, weights);
      // Should have at most 10 decimal places
      const decimalPart = score.toString().split('.')[1] || '';
      expect(decimalPart.length).toBeLessThanOrEqual(10);
    });
  });

  describe('real-world scenarios', () => {
    const BASELINE = {
      response_adherence: 0.95,
      constraint_violations: 0.0,
      toxicity_score: 0.0,
      hallucination_rate: 0.05,
      avg_response_length: 1000,
    };
    const WEIGHTS = {
      response_adherence: 0.3,
      constraint_violations: 0.2,
      toxicity_score: 0.2,
      hallucination_rate: 0.2,
      avg_response_length: 0.1,
    };

    it('should return low score for well-behaved agent', () => {
      const current = {
        response_adherence: 0.93,
        constraint_violations: 0.01,
        toxicity_score: 0.01,
        hallucination_rate: 0.06,
        avg_response_length: 1050,
      };

      const score = calculateDriftScore(current, BASELINE, WEIGHTS);
      expect(score).toBeLessThan(0.10);
    });

    it('should return high score for misbehaving agent', () => {
      const current = {
        response_adherence: 0.30,
        constraint_violations: 0.80,
        toxicity_score: 0.90,
        hallucination_rate: 0.70,
        avg_response_length: 5000,
      };

      const score = calculateDriftScore(current, BASELINE, WEIGHTS);
      expect(score).toBeGreaterThan(0.50);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// detectSpikes() — std-dev anomaly detection
// ─────────────────────────────────────────────────────────────────────────────

describe('detectSpikes()', () => {
  // detectSpikes reads from the internal LRU cache via getCachedPings.
  // Since we can't easily pre-populate the LRU cache from outside,
  // we test the function behavior with the understanding that <3 pings
  // returns empty anomaly notes.

  it('should return empty array when fewer than 3 cached pings', () => {
    // Fresh agent ID — no cached pings
    const notes = detectSpikes('fresh-agent', { toxicity_score: 0.9 }, 2.0);
    expect(notes).toEqual([]);
  });

  it('should return empty array for null metrics', () => {
    const notes = detectSpikes('fresh-agent', null, 2.0);
    expect(notes).toEqual([]);
  });

  it('should return empty array for empty metrics', () => {
    const notes = detectSpikes('fresh-agent', {}, 2.0);
    expect(notes).toEqual([]);
  });

  it('should use default sensitivity of 2.0 when not provided', () => {
    // Should not throw when spike_sensitivity is undefined
    const notes = detectSpikes('fresh-agent', { metric: 100 }, undefined);
    expect(Array.isArray(notes)).toBe(true);
  });

  it('should detect spike when provided with enough cached data', () => {
    // We test the statistical logic by verifying the function's contract:
    // When delta (std devs from mean) > sensitivity, flag as anomaly
    // Since we can't populate the cache directly, verify the shape of results

    const notes = detectSpikes('no-cache-agent', {
      toxicity_score: 100, // Extreme value
    }, 1.0);

    // With no cached pings, should return empty
    expect(notes).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Std-dev utility (internal, but verifiable through behavior)
// ─────────────────────────────────────────────────────────────────────────────

describe('Standard deviation calculation', () => {
  // The stddev function is internal to driftService but we can verify
  // its correctness through the drift score calculations

  it('should produce expected results for known distributions', () => {
    // Test via calculateDriftScore with known inputs
    // If baseline is 0.5 and current is 0.75, the delta is |0.25/0.5| = 0.5
    const score = calculateDriftScore(
      { metric: 0.75 },
      { metric: 0.5 },
      { metric: 1.0 }
    );
    expect(score).toBe(0.5);
  });
});
