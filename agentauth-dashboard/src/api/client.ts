import type { ApiError, RefreshTokenResponse } from '../types/common';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class ApiClient {
  private baseURL: string;
  private getAccessToken: (() => string | null) | null = null;
  private getRefreshToken: (() => string | null) | null = null;
  private setTokens: ((accessToken: string, refreshToken: string) => void) | null = null;
  private onUnauthorized: (() => void) | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // Initialize auth handlers (called by auth store)
  initialize(handlers: {
    getAccessToken: () => string | null;
    getRefreshToken: () => string | null;
    setTokens: (accessToken: string, refreshToken: string) => void;
    onUnauthorized: () => void;
  }) {
    this.getAccessToken = handlers.getAccessToken;
    this.getRefreshToken = handlers.getRefreshToken;
    this.setTokens = handlers.setTokens;
    this.onUnauthorized = handlers.onUnauthorized;
  }

  async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const accessToken = this.getAccessToken?.();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 - try to refresh token
      if (response.status === 401 && this.getRefreshToken && this.setTokens) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry original request with new token
          const newAccessToken = this.getAccessToken?.();
          if (newAccessToken) {
            headers['Authorization'] = `Bearer ${newAccessToken}`;
            const retryResponse = await fetch(url, { ...options, headers });

            if (!retryResponse.ok) {
              throw await this.handleErrorResponse(retryResponse);
            }

            return retryResponse.json() as Promise<T>;
          }
        }

        // Refresh failed, trigger logout
        this.onUnauthorized?.();
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network request failed');
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken?.();
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${this.baseURL}/agents/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const data: RefreshTokenResponse = await response.json();
      this.setTokens?.(data.access_token, data.refresh_token);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  private async handleErrorResponse(response: Response): Promise<Error> {
    try {
      const error: ApiError = await response.json();
      return new Error(error.message || error.error || `HTTP ${response.status}`);
    } catch {
      return new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  // HTTP method helpers
  async get<T = unknown>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request<T>(`${endpoint}${query}`, { method: 'GET' });
  }

  async post<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = unknown>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
