import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { LoginPage } from './features/auth/LoginPage';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { AgentsPage } from './features/agents/AgentsPage';
import { ActivityFeedPage } from './features/activity/ActivityFeedPage';
import { WebhooksPage } from './features/webhooks/WebhooksPage';
import { AnalyticsPage } from './features/analytics/AnalyticsPage';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/agents" replace />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/activity" element={<ActivityFeedPage />} />
              <Route path="/webhooks" element={<WebhooksPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              {/* Add more protected routes here */}
            </Route>
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
  );
}

export default App;
