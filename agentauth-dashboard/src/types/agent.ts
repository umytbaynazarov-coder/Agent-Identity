export interface Agent {
  id: number;
  agent_id: string;
  name: string;
  description?: string;
  owner_email: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended' | 'revoked';
  tier: 'free' | 'pro' | 'enterprise';
  created_at: string;
  last_verified_at?: string;
  webhook_count?: number;
  metadata?: Record<string, any>;
  persona?: Record<string, any>;
  persona_hash?: string;
  persona_version?: string;
  zkp_commitment?: string;
}

export interface VerificationLog {
  id: number;
  agent_id: string;
  agent_name?: string;
  success: boolean;
  reason?: string;
  timestamp: string;
  ip_address?: string;
}

export interface AgentWithActivity extends Agent {
  activity?: VerificationLog[];
}

export interface AgentFilters {
  status?: Agent['status'];
  search?: string;
  tier?: Agent['tier'];
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    offset: number;
    limit: number;
    count: number;
    total: number;
    has_more: boolean;
  };
}
