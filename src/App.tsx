import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/Login';
import { DipendenteDashboard } from './pages/DipendenteDashboard';
import { ResponsabileDashboard } from './pages/ResponsabileDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function RootRedirect() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={user?.ruolo === 'RESPONSABILE' ? '/responsabile' : '/dipendente'}
      replace
    />
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dipendente/*"
        element={
          <ProtectedRoute>
            <DipendenteDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/responsabile/*"
        element={
          <ProtectedRoute requiredRole="RESPONSABILE">
            <ResponsabileDashboard />
          </ProtectedRoute>
        }
      />
      {/* Catch all - redirect to root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
