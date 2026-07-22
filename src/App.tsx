import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/Login';
import { AttivitaListPage } from './pages/dipendente/AttivitaListPage';
import { AttivitaFormPage } from './pages/dipendente/AttivitaFormPage';
import { ResponsabileDashboard } from './pages/ResponsabileDashboard';
import { ClientiPage } from './pages/responsabile/ClientiPage';
import { ClienteDetailPage } from './pages/responsabile/ClienteDetailPage';
import { UtentiPage } from './pages/responsabile/UtentiPage';

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

      {/* Dipendente routes */}
      <Route
        path="/dipendente"
        element={
          <ProtectedRoute>
            <AttivitaListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dipendente/nuova"
        element={
          <ProtectedRoute>
            <AttivitaFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dipendente/modifica/:id"
        element={
          <ProtectedRoute>
            <AttivitaFormPage />
          </ProtectedRoute>
        }
      />

      {/* Responsabile routes */}
      <Route
        path="/responsabile"
        element={
          <ProtectedRoute requiredRole="RESPONSABILE">
            <ResponsabileDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/responsabile/clienti"
        element={
          <ProtectedRoute requiredRole="RESPONSABILE">
            <ClientiPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/responsabile/clienti/:id"
        element={
          <ProtectedRoute requiredRole="RESPONSABILE">
            <ClienteDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/responsabile/utenti"
        element={
          <ProtectedRoute requiredRole="RESPONSABILE">
            <UtentiPage />
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
