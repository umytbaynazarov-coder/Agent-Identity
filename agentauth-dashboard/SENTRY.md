# Sentry Error Tracking Integration Guide

Sentry has been configured for the AgentAuth dashboard to track errors and performance issues in production.

## What's Been Set Up

1. **Sentry Configuration** (`src/config/sentry.ts`)
   - Error tracking with automatic error reporting
   - Performance monitoring (tracing)
   - Session replay for debugging
   - Sensitive data scrubbing

2. **ErrorBoundary Integration** (`src/components/common/ErrorBoundary.tsx`)
   - Automatically captures React component errors
   - Sends errors to Sentry with component stack trace

## Quick Integration

### Step 1: Get Sentry DSN

1. Go to [sentry.io](https://sentry.io) and create an account (free tier available)
2. Create a new project and select "React"
3. Copy your DSN (looks like: `https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx`)

### Step 2: Configure Environment Variables

Add to `.env`:
```bash
VITE_SENTRY_DSN=https://your-dsn-here
VITE_APP_VERSION=1.0.0
```

Add to Railway/deployment platform:
- `VITE_SENTRY_DSN`: Your Sentry DSN
- `VITE_APP_VERSION`: Current version for tracking

### Step 3: Initialize Sentry in main.tsx

Update `src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initSentry } from './config/sentry';

// Initialize Sentry before rendering app
initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### Step 4: Test Error Tracking

Create a test error in development:

```tsx
// Add a button that throws an error
<button onClick={() => {
  throw new Error('Test Sentry integration');
}}>
  Test Error
</button>
```

Check your Sentry dashboard to see the error appear!

## Usage Examples

### Manual Error Capture

```tsx
import { captureException, captureMessage } from '@/config/sentry';

// Capture exceptions
try {
  await dangerousOperation();
} catch (error) {
  captureException(error as Error, {
    operation: 'dangerousOperation',
    userId: user.id,
  });
}

// Capture messages
captureMessage('Important event occurred', 'info');
```

### Add User Context

```tsx
import { setUser } from '@/config/sentry';

// When user logs in
setUser({
  id: agent.agent_id,
  email: agent.email,
  role: agent.tier,
});

// When user logs out
setUser(null);
```

### Add Breadcrumbs

```tsx
import { addBreadcrumb } from '@/config/sentry';

// Track user actions
addBreadcrumb('Agent registered', {
  agentId: newAgent.id,
  tier: newAgent.tier,
});

addBreadcrumb('Webhook created', {
  webhookUrl: webhook.url,
});
```

### Track API Calls

```tsx
import { addBreadcrumb, captureException } from '@/config/sentry';

async function fetchAgents() {
  addBreadcrumb('Fetching agents list');

  try {
    const response = await fetch('/api/agents');
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    captureException(error as Error, {
      endpoint: '/api/agents',
      method: 'GET',
    });
    throw error;
  }
}
```

## Features

### Error Tracking

- **Automatic**: React errors caught by ErrorBoundary
- **Manual**: Use `captureException()` for try/catch blocks
- **Context**: Attach user info, tags, and custom data
- **Stack Traces**: Full JavaScript stack traces with source maps

### Performance Monitoring

- **Page Load**: Track initial load performance
- **Navigation**: Monitor route changes
- **API Calls**: Automatically track fetch/XHR requests
- **Custom Transactions**: Track specific operations

### Session Replay

- **Video-like Replay**: See what users did before errors
- **Privacy**: Text and media masked by default
- **Selective**: Only 10% of sessions, 100% of error sessions
- **Performance**: Minimal impact on app performance

## Configuration Options

### Sample Rates

Adjust in `src/config/sentry.ts`:

```ts
{
  // Error sampling (50% in production to reduce quota usage)
  sampleRate: 0.5,

  // Performance sampling (10% to avoid quota limits)
  tracesSampleRate: 0.1,

  // Session replay (10% normal, 100% on errors)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
}
```

### Ignored Errors

Common errors already ignored:
- Browser extension errors
- Network errors (failed fetch, network request failed)
- Cancelled requests (AbortError)

Add more in `ignoreErrors` array.

### Sensitive Data Filtering

Automatically scrubs:
- Cookies
- Authorization headers
- User passwords

Customize in `beforeSend` function.

## Best Practices

### 1. Use Breadcrumbs Liberally

```tsx
addBreadcrumb('User clicked register button');
addBreadcrumb('Form validated successfully');
addBreadcrumb('API request started', { endpoint: '/api/register' });
```

### 2. Add Context to Errors

```tsx
captureException(error, {
  component: 'AgentsPage',
  action: 'deleteAgent',
  agentId: selectedAgent.id,
});
```

### 3. Set User Context

```tsx
// Do this on login/authentication
setUser({
  id: agent.agent_id,
  email: agent.email,
  role: agent.tier,
});
```

### 4. Use Proper Log Levels

```tsx
captureMessage('Info: Agent created', 'info');
captureMessage('Warning: High API usage', 'warning');
captureMessage('Error: Database connection lost', 'error');
```

### 5. Test in Staging First

- Test Sentry integration in staging environment
- Verify errors appear correctly
- Check that sensitive data is scrubbed
- Ensure performance impact is acceptable

## Monitoring

### Sentry Dashboard

- **Issues**: See all errors with stack traces
- **Performance**: Track slow API calls and renders
- **Releases**: Track errors by version
- **Alerts**: Get notified of new errors

### Key Metrics

- **Error Rate**: Percentage of sessions with errors
- **Crash-Free Sessions**: Sessions without crashes
- **Affected Users**: How many users hit errors
- **TTFD (Time to First Display)**: Page load performance

## Integration Checklist

- [ ] Create Sentry project
- [ ] Copy DSN to environment variables
- [ ] Initialize Sentry in main.tsx
- [ ] Test error capture in development
- [ ] Add user context on login
- [ ] Add breadcrumbs for key actions
- [ ] Verify errors appear in Sentry dashboard
- [ ] Set up alerts for critical errors
- [ ] Configure source maps for production (optional)
- [ ] Set up releases for version tracking (optional)

## Source Maps (Optional)

To get readable stack traces in production:

1. Install Sentry Vite plugin:
```bash
npm install --save-dev @sentry/vite-plugin
```

2. Update `vite.config.ts`:
```ts
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: 'your-org',
      project: 'agentauth-dashboard',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  build: {
    sourcemap: true,
  },
});
```

3. Add to `.env`:
```bash
SENTRY_AUTH_TOKEN=your-auth-token
```

## Troubleshooting

### Errors Not Appearing

1. Check DSN is configured correctly
2. Verify `initSentry()` is called before React renders
3. Check browser console for Sentry errors
4. Ensure not in development mode (errors are logged, not sent)

### Too Many Errors

1. Reduce `sampleRate` to 0.1 (10%)
2. Add more patterns to `ignoreErrors`
3. Filter out known non-critical errors

### Performance Impact

1. Reduce `tracesSampleRate` to 0.05 (5%)
2. Reduce `replaysSessionSampleRate` to 0.01 (1%)
3. Disable session replay entirely if needed

## Next Steps

After basic integration:

1. **Alerts**: Set up email/Slack alerts for critical errors
2. **Releases**: Track errors by deployment version
3. **Ownership**: Assign errors to team members
4. **Integrations**: Connect to GitHub, Jira, etc.
5. **Custom Dashboards**: Create views for specific error types
6. **Performance Budgets**: Set thresholds for acceptable performance

## Cost Optimization

Free tier limits:
- 5,000 errors/month
- 10,000 performance transactions/month
- 50 replays/month

To stay within limits:
- Set `sampleRate: 0.1` (captures 10% of errors)
- Set `tracesSampleRate: 0.05` (tracks 5% of transactions)
- Use `ignoreErrors` to filter noise
- Consider upgrading for production apps

---

For more info, see [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
