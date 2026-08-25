import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { authApi, tokenStorage } from '../api/client';
import type { User, Ruolo } from '../types';

// Inactivity timeout in milliseconds
const INACTIVITY_TIMEOUT_DIPENDENTE = 10 * 60 * 1000; // 10 minutes
const INACTIVITY_TIMEOUT_RESPONSABILE = 60 * 60 * 1000; // 1 hour
const WARNING_BEFORE_LOGOUT = 60 * 1000; // Show warning 1 minute before logout

// Session marker key - used to detect browser close
const SESSION_MARKER_KEY = 'gicatask_session_active';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (utenteId: number, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  isResponsabile: boolean;
  showInactivityWarning: boolean;
  dismissInactivityWarning: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);

  const inactivityTimerRef = useRef<number | null>(null);
  const warningTimerRef = useRef<number | null>(null);
  const isLoggingOutRef = useRef(false);
  const showInactivityWarningRef = useRef(false);

  // Sync ref with state to avoid re-renders in useEffect
  useEffect(() => {
    showInactivityWarningRef.current = showInactivityWarning;
  }, [showInactivityWarning]);

  // Get inactivity timeout based on user role
  const getInactivityTimeout = useCallback(() => {
    if (!user) return INACTIVITY_TIMEOUT_DIPENDENTE;
    return user.ruolo === 'RESPONSABILE'
      ? INACTIVITY_TIMEOUT_RESPONSABILE
      : INACTIVITY_TIMEOUT_DIPENDENTE;
  }, [user]);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      window.clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    setShowInactivityWarning(false);
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    clearTimers();

    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    }

    // Clear session marker and token
    sessionStorage.removeItem(SESSION_MARKER_KEY);
    tokenStorage.remove();
    setUser(null);
    isLoggingOutRef.current = false;
  }, [clearTimers]);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (!user || isLoggingOutRef.current) return;

    // Don't reset if warning is already shown
    if (showInactivityWarningRef.current) return;

    clearTimers();

    const timeout = getInactivityTimeout();

    // Set warning timer (1 minute before logout)
    warningTimerRef.current = window.setTimeout(() => {
      setShowInactivityWarning(true);
    }, timeout - WARNING_BEFORE_LOGOUT);

    // Set logout timer
    inactivityTimerRef.current = window.setTimeout(() => {
      console.log('Inactivity timeout - logging out');
      logout();
    }, timeout);
  }, [user, getInactivityTimeout, clearTimers, logout]);

  // Dismiss warning and reset timer
  const dismissInactivityWarning = useCallback(() => {
    setShowInactivityWarning(false);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // Set up activity listeners
  useEffect(() => {
    if (!user) return;

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    const handleActivity = () => {
      // Use ref to avoid re-running effect when warning state changes
      if (!showInactivityWarningRef.current) {
        resetInactivityTimer();
      }
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Start initial timer
    resetInactivityTimer();

    return () => {
      // Remove event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearTimers();
    };
  }, [user, resetInactivityTimer, clearTimers]);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = tokenStorage.get();
      const sessionMarker = sessionStorage.getItem(SESSION_MARKER_KEY);

      // If there's a token but no session marker, browser was closed - clear session
      if (token && !sessionMarker) {
        console.log('Browser was closed - clearing session');
        tokenStorage.remove();
        setIsLoading(false);
        return;
      }

      // No token, not authenticated
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await authApi.getMe();
        setUser({
          id: response.data.user.id,
          nome: response.data.user.nome,
          cognome: response.data.user.cognome,
          ruolo: response.data.user.ruolo as Ruolo,
          abilitatoBollettini: response.data.user.abilitatoBollettini,
        });
        // Refresh session marker
        sessionStorage.setItem(SESSION_MARKER_KEY, 'true');
      } catch {
        // Token invalid, remove it
        tokenStorage.remove();
        sessionStorage.removeItem(SESSION_MARKER_KEY);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Handle page visibility change (for mobile browser minimize)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only reset timer if page becomes visible and warning is not shown
      if (document.visibilityState === 'visible' && user && !showInactivityWarningRef.current) {
        resetInactivityTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, resetInactivityTimer]);

  // Handle beforeunload - mark session as potentially ending
  useEffect(() => {
    const handleBeforeUnload = () => {
      // We don't remove the session marker here because this also fires on refresh
      // The session marker in sessionStorage will be cleared automatically on browser close
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const login = useCallback(async (utenteId: number, password?: string) => {
    // Clear any existing session before login
    tokenStorage.remove();
    sessionStorage.removeItem(SESSION_MARKER_KEY);
    setUser(null);
    clearTimers();

    const response = await authApi.login(utenteId, password);

    // Save token to localStorage
    tokenStorage.set(response.data.token);

    // Set session marker in sessionStorage (cleared on browser close)
    sessionStorage.setItem(SESSION_MARKER_KEY, 'true');

    setUser({
      id: response.data.user.id,
      nome: response.data.user.nome,
      cognome: response.data.user.cognome,
      ruolo: response.data.user.ruolo as Ruolo,
      abilitatoBollettini: response.data.user.abilitatoBollettini,
    });
  }, [clearTimers]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    logout,
    isResponsabile: user?.ruolo === 'RESPONSABILE',
    showInactivityWarning,
    dismissInactivityWarning,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
