export interface PersonaTraits {
  [key: string]: number | string | boolean;
}

export interface PersonaConstraints {
  max_response_length?: number;
  forbidden_topics?: string[];
  required_disclaimers?: string[];
  allowed_actions?: string[];
  blocked_actions?: string[];
}

export interface PersonaGuardrails {
  toxicity_threshold?: number;
  hallucination_tolerance?: 'strict' | 'moderate' | 'lenient';
  source_citation_required?: boolean;
}

export interface PersonaPersonality {
  traits?: PersonaTraits;
  assistant_axis?: string[];
  neural_vectors?: Record<string, number>;
}

export interface Persona {
  version: string;
  personality?: PersonaPersonality;
  constraints?: PersonaConstraints;
  guardrails?: PersonaGuardrails;
  prompt_template?: string;
}

export interface PersonaResponse {
  agent_id: string;
  persona: Record<string, any>;
  persona_hash: string;
  persona_version: string;
  prompt?: string;
  etag?: string;
}

export interface PersonaVerifyResponse {
  valid: boolean;
  agent_id: string;
  persona_hash: string;
  reason: string;
}

export interface PersonaHistoryEntry {
  id: string;
  agent_id: string;
  persona: Record<string, any>;
  persona_hash: string;
  persona_version: string;
  changed_at: string;
}

export interface PersonaHistoryResponse {
  history: PersonaHistoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface PersonaUpdateResponse {
  agent_id: string;
  persona: Record<string, any>;
  persona_hash: string;
  persona_version: string;
  diff?: Record<string, any>;
}
