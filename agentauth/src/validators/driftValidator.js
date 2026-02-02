/**
 * Validation functions for drift / health-ping inputs.
 */

/**
 * Validate a single health ping submission.
 * Enforced metric types; validate keys against config;
 * request_count positive int; ISO dates with end > start.
 */
function validateHealthPing(data) {
  const errors = [];

  if (!data.agent_id) {
    errors.push({ field: 'agent_id', message: 'Agent ID is required' });
  } else if (typeof data.agent_id !== 'string') {
    errors.push({ field: 'agent_id', message: 'Agent ID must be a string' });
  }

  // metrics object
  if (!data.metrics) {
    errors.push({ field: 'metrics', message: 'Metrics object is required' });
  } else if (typeof data.metrics !== 'object' || Array.isArray(data.metrics)) {
    errors.push({ field: 'metrics', message: 'Metrics must be a plain object' });
  } else {
    for (const [key, val] of Object.entries(data.metrics)) {
      if (typeof val !== 'number' || !isFinite(val)) {
        errors.push({ field: `metrics.${key}`, message: `Metric "${key}" must be a finite number` });
      }
    }
  }

  // request_count — positive integer
  if (data.request_count !== undefined) {
    if (!Number.isInteger(data.request_count) || data.request_count <= 0) {
      errors.push({ field: 'request_count', message: 'request_count must be a positive integer' });
    }
  }

  // period_start / period_end — ISO dates, end > start
  if (data.period_start !== undefined || data.period_end !== undefined) {
    const start = data.period_start ? new Date(data.period_start) : null;
    const end = data.period_end ? new Date(data.period_end) : null;

    if (data.period_start && isNaN(start)) {
      errors.push({ field: 'period_start', message: 'period_start must be a valid ISO date' });
    }
    if (data.period_end && isNaN(end)) {
      errors.push({ field: 'period_end', message: 'period_end must be a valid ISO date' });
    }
    if (start && end && !isNaN(start) && !isNaN(end) && end <= start) {
      errors.push({ field: 'period_end', message: 'period_end must be after period_start' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a batch of health pings.
 */
function validateBatchHealthPings(data) {
  const errors = [];

  if (!data.pings) {
    errors.push({ field: 'pings', message: 'pings array is required' });
  } else if (!Array.isArray(data.pings)) {
    errors.push({ field: 'pings', message: 'pings must be an array' });
  } else if (data.pings.length === 0) {
    errors.push({ field: 'pings', message: 'pings array must not be empty' });
  } else if (data.pings.length > 100) {
    errors.push({ field: 'pings', message: 'Maximum 100 pings per batch' });
  } else {
    for (let i = 0; i < data.pings.length; i++) {
      const pingResult = validateHealthPing({ ...data.pings[i], agent_id: data.agent_id || data.pings[i].agent_id });
      for (const err of pingResult.errors) {
        errors.push({ field: `pings[${i}].${err.field}`, message: err.message });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate drift configuration.
 * threshold 0-1, warning_threshold < drift_threshold,
 * auto_revoke bool, metric_weights with number values,
 * spike_sensitivity positive number (default 2.0).
 */
function validateDriftConfig(data) {
  const errors = [];

  // drift_threshold 0-1
  if (data.drift_threshold !== undefined) {
    if (typeof data.drift_threshold !== 'number' || data.drift_threshold < 0 || data.drift_threshold > 1) {
      errors.push({ field: 'drift_threshold', message: 'drift_threshold must be a number between 0 and 1' });
    }
  }

  // warning_threshold 0-1
  if (data.warning_threshold !== undefined) {
    if (typeof data.warning_threshold !== 'number' || data.warning_threshold < 0 || data.warning_threshold > 1) {
      errors.push({ field: 'warning_threshold', message: 'warning_threshold must be a number between 0 and 1' });
    }
  }

  // warning_threshold < drift_threshold
  const warnT = data.warning_threshold;
  const driftT = data.drift_threshold;
  if (typeof warnT === 'number' && typeof driftT === 'number' && warnT >= driftT) {
    errors.push({ field: 'warning_threshold', message: 'warning_threshold must be less than drift_threshold' });
  }

  // auto_revoke
  if (data.auto_revoke !== undefined && typeof data.auto_revoke !== 'boolean') {
    errors.push({ field: 'auto_revoke', message: 'auto_revoke must be a boolean' });
  }

  // metric_weights
  if (data.metric_weights !== undefined) {
    if (typeof data.metric_weights !== 'object' || Array.isArray(data.metric_weights) || data.metric_weights === null) {
      errors.push({ field: 'metric_weights', message: 'metric_weights must be a plain object' });
    } else {
      for (const [key, val] of Object.entries(data.metric_weights)) {
        if (typeof val !== 'number' || !isFinite(val) || val < 0) {
          errors.push({ field: `metric_weights.${key}`, message: `Weight for "${key}" must be a non-negative number` });
        }
      }
    }
  }

  // spike_sensitivity — positive number
  if (data.spike_sensitivity !== undefined) {
    if (typeof data.spike_sensitivity !== 'number' || data.spike_sensitivity <= 0) {
      errors.push({ field: 'spike_sensitivity', message: 'spike_sensitivity must be a positive number' });
    }
  }

  // baseline_metrics
  if (data.baseline_metrics !== undefined) {
    if (typeof data.baseline_metrics !== 'object' || Array.isArray(data.baseline_metrics) || data.baseline_metrics === null) {
      errors.push({ field: 'baseline_metrics', message: 'baseline_metrics must be a plain object' });
    } else {
      for (const [key, val] of Object.entries(data.baseline_metrics)) {
        if (typeof val !== 'number' || !isFinite(val)) {
          errors.push({ field: `baseline_metrics.${key}`, message: `Baseline for "${key}" must be a finite number` });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateHealthPing,
  validateBatchHealthPings,
  validateDriftConfig,
};
