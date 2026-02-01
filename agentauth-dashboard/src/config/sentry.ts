import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';

/**
 * Initialize Sentry for error tracking and performance monitoring
 *
 * Set VITE_SENTRY_DSN environment variable to enable Sentry
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE || 'development';

  // Only initialize if DSN is provided
  if (!dsn) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment,

    // Set to 1.0 to capture 100% of errors
    // Reduce in production based on traffic
    sampleRate: environment === 'production' ? 0.5 : 1.0,

    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Session Replay (optional - captures user interactions)
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    integrations: [
      // Browser profiling
      Sentry.browserProfilingIntegration(),

      // Session replay
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),

      // React-specific error tracking
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],

    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',

      // Network errors
      'NetworkError',
      'Network request failed',
      'Failed to fetch',

      // Cancelled requests
      'cancelled',
      'AbortError',
    ],

    // Filter sensitive data
    beforeSend(event, hint) {
      // Don't send errors in development
      if (environment === 'development') {
        console.error('Sentry would capture:', event, hint);
        return null;
      }

      // Scrub sensitive data
      if (event.request?.cookies) {
        delete event.request.cookies;
      }

      if (event.request?.headers) {
        delete event.request.headers.Authorization;
        delete event.request.headers.Cookie;
      }

      return event;
    },

    // Set user context
    initialScope: {
      tags: {
        app_version: import.meta.env.VITE_APP_VERSION || 'unknown',
      },
    },
  });
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; role?: string } | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

/**
 * Capture message manually
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level);
}
