import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Ruolo } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Ruolo;
  /** Riservato a chi ha il flag bollettini; il responsabile passa sempre. */
  requireBollettini?: boolean;
}

export function ProtectedRoute({ children, requiredRole, requireBollettini }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

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

  if (requiredRole && user?.ruolo !== requiredRole) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = user?.ruolo === 'RESPONSABILE' ? '/responsabile' : '/dipendente/nuova';
    return <Navigate to={redirectPath} replace />;
  }

  // Questo è solo il menu: l'accesso vero è deciso dalla guardia server, che
  // rilegge il flag dal database a ogni richiesta
  if (requireBollettini && user?.ruolo !== 'RESPONSABILE' && !user?.abilitatoBollettini) {
    return <Navigate to="/dipendente/nuova" replace />;
  }

  return <>{children}</>;
}
