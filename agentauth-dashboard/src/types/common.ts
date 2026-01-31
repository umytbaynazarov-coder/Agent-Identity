export interface ApiError {
  error: string;
  message?: string;
  details?: unknown;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface VerifyResponse {
  verified: boolean;
  agent: {
    agent_id: string;
    name: string;
    permissions: string[];
    tier: string;
  };
  token: AuthTokens;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}
