export interface AnomalyNote {
  metric: string;
  delta: number;
  threshold: number;
  mean: number;
  stddev: number;
  current_value: number;
}

export interface HealthPingRequest {
  metrics: Record<string, number>;
  request_count?: number;
  period_start?: string;
  period_end?: string;
  signature?: string;
}

export interface HealthPingResponse {
  ping_id: string;
  drift_score: number;
  status: 'ok' | 'warning' | 'revoked';
  warning?: Record<string, any>;
  anomaly_notes?: AnomalyNote[];
}

export interface DriftTrend {
  drift_score: number;
  created_at: string;
}

export interface DriftScoreResponse {
  agent_id: string;
  drift_score: number | null;
  thresholds?: {
    warning: number;
    drift: number;
  };
  trend?: DriftTrend[];
  spike_warnings?: AnomalyNote[];
  message?: string;
}

export interface DriftHistoryEntry {
  id: string;
  agent_id: string;
  drift_score: number;
  created_at: string;
  metrics?: Record<string, number>;
  request_count?: number;
  period_start?: string;
  period_end?: string;
}

export interface DriftHistoryResponse {
  history: DriftHistoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface DriftConfig {
  agent_id: string;
  drift_threshold: number;
  warning_threshold: number;
  auto_revoke: boolean;
  metric_weights?: Record<string, number>;
  baseline_metrics?: Record<string, number>;
  spike_sensitivity: number;
}
