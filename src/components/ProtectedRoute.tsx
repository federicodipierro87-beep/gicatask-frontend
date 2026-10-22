import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Ruolo } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Ruolo;
  /** Riservato a chi ha il flag bollettini, responsabile compreso. */
  requireBollettini?: boolean;
  /** Riservato a chi ha il flag della sezione "Bollettini Nuovi". */
  requireBollettini2?: boolean;
  /** Riservato a chi ha il flag della sezione "Noleggi". */
  requireNoleggi?: boolean;
  /** Riservato a chi ha il flag del modulo "Nuova Attività 2". */
  requireAttivita2?: boolean;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requireBollettini,
  requireBollettini2,
  requireNoleggi,
  requireAttivita2,
}: ProtectedRouteProps) {
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
  if (
    (requireBollettini && !user?.abilitatoBollettini) ||
    (requireBollettini2 && !user?.abilitatoBollettini2) ||
    (requireNoleggi && !user?.abilitatoNoleggi) ||
    (requireAttivita2 && !user?.abilitatoAttivita2)
  ) {
    // Rimandare un responsabile all'area dipendente lo sbalzerebbe fuori
    // dalla sezione in cui stava lavorando
    const redirectPath = user?.ruolo === 'RESPONSABILE' ? '/responsabile' : '/dipendente/nuova';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}
