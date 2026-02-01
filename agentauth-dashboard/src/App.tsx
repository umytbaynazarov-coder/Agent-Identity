import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoadingFallback, PageLoader } from './components/common/LoadingFallback';
import { lazyWithPreload } from './utils/lazyWithPreload';
import { usePerformanceMonitoring } from './hooks/usePerformance';

// Lazy load route components for code splitting
// Map named exports to default exports for React.lazy
const LoginPage = lazyWithPreload(() =>
  import('./features/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const ProtectedRoute = lazyWithPreload(() =>
  import('./features/auth/ProtectedRoute').then((m) => ({ default: m.ProtectedRoute }))
);
const Layout = lazyWithPreload(() =>
  import('./components/layout/Layout').then((m) => ({ default: m.Layout }))
);
const AgentsPage = lazyWithPreload(() =>
  import('./features/agents/AgentsPage').then((m) => ({ default: m.AgentsPage }))
);
const ActivityFeedPage = lazyWithPreload(() =>
  import('./features/activity/ActivityFeedPage').then((m) => ({ default: m.ActivityFeedPage }))
);
const WebhooksPage = lazyWithPreload(() =>
  import('./features/webhooks/WebhooksPage').then((m) => ({ default: m.WebhooksPage }))
);
const AnalyticsPage = lazyWithPreload(() =>
  import('./features/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
);

// Create a client with optimized caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache configuration
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - garbage collection time (formerly cacheTime)

      // Refetch configuration
      refetchOnWindowFocus: false, // Don't refetch on tab focus
      refetchOnMount: false, // Use cached data on component mount
      refetchOnReconnect: true, // Refetch when network reconnects

      // Retry configuration
      retry: 1, // Only retry failed requests once
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Performance
      structuralSharing: true, // Reduce re-renders by sharing unchanged data
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

function App() {
  // Monitor Core Web Vitals
  usePerformanceMonitoring();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Navigate to="/agents" replace />} />
                  <Route
                    path="/agents"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <AgentsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/activity"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <ActivityFeedPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/webhooks"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <WebhooksPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/analytics"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <AnalyticsPage />
                      </Suspense>
                    }
                  />
                  {/* Add more protected routes here */}
                </Route>
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>

        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1F2937',
              color: '#F3F4F6',
              border: '1px solid #374151',
            },
            success: {
              iconTheme: {
                primary: '#00E5A0',
                secondary: '#1F2937',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#1F2937',
              },
            },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
