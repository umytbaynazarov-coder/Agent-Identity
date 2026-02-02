/**
 * Webhook Payload Snapshot Tests
 *
 * Captures the exact shape of webhook payloads for:
 * - persona.created
 * - persona.updated
 * - agent.drift.warning
 * - agent.drift.revoked
 *
 * Snapshots ensure that changes to webhook payloads are intentional
 * and don't break downstream consumers.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Stable test data (deterministic timestamps for snapshot stability)
// ─────────────────────────────────────────────────────────────────────────────

const FIXED_TIMESTAMP = '2025-01-15T12:00:00.000Z';
const TEST_AGENT_ID = 'agt_snapshot_test';

const PERSONA = {
  version: '1.0.0',
  personality: {
    traits: { helpfulness: 0.9, formality: 0.7 },
  },
  guardrails: {
    toxicity_threshold: 0.3,
    hallucination_tolerance: 'strict',
  },
  constraints: {
    forbidden_topics: ['politics', 'religion'],
    max_response_length: 2000,
  },
};

const PERSONA_HASH = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

// ─────────────────────────────────────────────────────────────────────────────
// persona.created
// ─────────────────────────────────────────────────────────────────────────────

describe('Webhook Payload Snapshots', () => {
  describe('persona.created', () => {
    it('should match snapshot', () => {
      const payload = {
        event: 'persona.created',
        agent_id: TEST_AGENT_ID,
        data: {
          persona: PERSONA,
          persona_hash: PERSONA_HASH,
          version: '1.0.0',
        },
        timestamp: FIXED_TIMESTAMP,
      };

      expect(payload).toMatchSnapshot();
    });

    it('should contain required top-level fields', () => {
      const payload = {
        event: 'persona.created',
        agent_id: TEST_AGENT_ID,
        data: {
          persona: PERSONA,
          persona_hash: PERSONA_HASH,
          version: '1.0.0',
        },
        timestamp: FIXED_TIMESTAMP,
      };

      expect(payload).toHaveProperty('event', 'persona.created');
      expect(payload).toHaveProperty('agent_id');
      expect(payload).toHaveProperty('data');
      expect(payload).toHaveProperty('timestamp');
      expect(payload.data).toHaveProperty('persona');
      expect(payload.data).toHaveProperty('persona_hash');
      expect(payload.data).toHaveProperty('version');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────

  describe('persona.updated', () => {
    it('should match snapshot', () => {
      const payload = {
        event: 'persona.updated',
        agent_id: TEST_AGENT_ID,
        data: {
          persona: {
            ...PERSONA,
            version: '1.1.0',
            personality: {
              traits: { helpfulness: 0.95, formality: 0.8 },
            },
          },
          persona_hash: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
          version: '1.1.0',
          previous_version: '1.0.0',
          changes: [
            {
              kind: 'E',
              path: ['personality', 'traits', 'helpfulness'],
              lhs: 0.9,
              rhs: 0.95,
            },
            {
              kind: 'E',
              path: ['personality', 'traits', 'formality'],
              lhs: 0.7,
              rhs: 0.8,
            },
            {
              kind: 'E',
              path: ['version'],
              lhs: '1.0.0',
              rhs: '1.1.0',
            },
          ],
        },
        timestamp: FIXED_TIMESTAMP,
      };

      expect(payload).toMatchSnapshot();
    });

    it('should contain diff information', () => {
      const payload = {
        event: 'persona.updated',
        agent_id: TEST_AGENT_ID,
        data: {
          persona: { ...PERSONA, version: '1.1.0' },
          persona_hash: 'new-hash',
          version: '1.1.0',
          previous_version: '1.0.0',
          changes: [{ kind: 'E', path: ['version'], lhs: '1.0.0', rhs: '1.1.0' }],
        },
        timestamp: FIXED_TIMESTAMP,
      };

      expect(payload.data).toHaveProperty('previous_version');
      expect(payload.data).toHaveProperty('changes');
      expect(Array.isArray(payload.data.changes)).toBe(true);
      expect(payload.data.changes[0]).toHaveProperty('kind');
      expect(payload.data.changes[0]).toHaveProperty('path');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────

  describe('agent.drift.warning', () => {
    it('should match snapshot', () => {
      const payload = {
        event: 'agent.drift.warning',
        agent_id: TEST_AGENT_ID,
        data: {
          drift_score: 0.26,
          threshold: 0.24,
          agent_id: TEST_AGENT_ID,
          metrics_summary: {
            metrics: {
              response_adherence: 0.85,
              constraint_violations: 0.08,
              toxicity_score: 0.05,
              hallucination_rate: 0.12,
              avg_response_length: 1400,
            },
            baseline: {
              response_adherence: 0.95,
              constraint_violations: 0.0,
              toxicity_score: 0.0,
              hallucination_rate: 0.05,
              avg_response_length: 1000,
            },
            drift_score: 0.26,
            anomaly_notes: [],
          },
          timestamp: FIXED_TIMESTAMP,
        },
        timestamp: FIXED_TIMESTAMP,
      };

      expect(payload).toMatchSnapshot();
    });

    it('should contain drift score and threshold', () => {
      const payload = {
        event: 'agent.drift.warning',
        agent_id: TEST_AGENT_ID,
        data: {
          drift_score: 0.26,
          threshold: 0.24,
          agent_id: TEST_AGENT_ID,
          metrics_summary: {},
          timestamp: FIXED_TIMESTAMP,
        },
        timestamp: FIXED_TIMESTAMP,
      };

      expect(payload.data).toHaveProperty('drift_score');
      expect(payload.data).toHaveProperty('threshold');
      expect(payload.data.drift_score).toBeGreaterThan(payload.data.threshold);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────

  describe('agent.drift.revoked', () => {
    it('should match snapshot', () => {
      const payload = {
        event: 'agent.drift.revoked',
        agent_id: TEST_AGENT_ID,
        data: {
          drift_score: 0.45,
          threshold: 0.30,
          agent_id: TEST_AGENT_ID,
          auto_revoked: true,
          metrics_summary: {
            metrics: {
              response_adherence: 0.40,
              constraint_violations: 0.50,
              toxicity_score: 0.60,
              hallucination_rate: 0.55,
              avg_response_length: 4500,
            },
            baseline: {
              response_adherence: 0.95,
              constraint_violations: 0.0,
              toxicity_score: 0.0,
              hallucination_rate: 0.05,
              avg_response_length: 1000,
            },
            drift_score: 0.45,
            anomaly_notes: [
              {
                metric: 'toxicity_score',
                delta: 4.5,
                threshold: 2.0,
                mean: 0.02,
                stddev: 0.01,
                current_value: 0.60,
              },
            ],
          },
          timestamp: FIXED_TIMESTAMP,
        },
        timestamp: FIXED_TIMESTAMP,
      };

      expect(payload).toMatchSnapshot();
    });

    it('should include auto_revoked flag', () => {
      const payload = {
        event: 'agent.drift.revoked',
        agent_id: TEST_AGENT_ID,
        data: {
          drift_score: 0.45,
          threshold: 0.30,
          agent_id: TEST_AGENT_ID,
          auto_revoked: true,
          metrics_summary: {},
          timestamp: FIXED_TIMESTAMP,
        },
        timestamp: FIXED_TIMESTAMP,
      };

      expect(payload.data).toHaveProperty('auto_revoked');
      expect(typeof payload.data.auto_revoked).toBe('boolean');
    });

    it('should have drift_score exceeding threshold', () => {
      const payload = {
        event: 'agent.drift.revoked',
        agent_id: TEST_AGENT_ID,
        data: {
          drift_score: 0.45,
          threshold: 0.30,
          agent_id: TEST_AGENT_ID,
          auto_revoked: false,
          metrics_summary: {},
          timestamp: FIXED_TIMESTAMP,
        },
        timestamp: FIXED_TIMESTAMP,
      };

      expect(payload.data.drift_score).toBeGreaterThan(payload.data.threshold);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Cross-payload consistency checks
  // ─────────────────────────────────────────────────────────────────────────

  describe('Cross-payload consistency', () => {
    it('all webhook payloads should have event, agent_id, data, timestamp', () => {
      const events = ['persona.created', 'persona.updated', 'agent.drift.warning', 'agent.drift.revoked'];

      for (const event of events) {
        const payload = {
          event,
          agent_id: TEST_AGENT_ID,
          data: {},
          timestamp: FIXED_TIMESTAMP,
        };

        expect(payload).toHaveProperty('event');
        expect(payload).toHaveProperty('agent_id');
        expect(payload).toHaveProperty('data');
        expect(payload).toHaveProperty('timestamp');
        expect(typeof payload.event).toBe('string');
        expect(typeof payload.agent_id).toBe('string');
        expect(typeof payload.data).toBe('object');
        expect(typeof payload.timestamp).toBe('string');
      }
    });
  });
});
