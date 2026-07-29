import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Ruolo } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Ruolo;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.ruolo !== requiredRole) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = user?.ruolo === 'RESPONSABILE' ? '/responsabile' : '/dipendente';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}
