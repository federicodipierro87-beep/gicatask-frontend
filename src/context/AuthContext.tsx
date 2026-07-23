import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { authApi, tokenStorage } from '../api/client';
import type { User, Ruolo } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (utenteId: number, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  isResponsabile: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Skip if no token stored
      const token = tokenStorage.get();
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
        });
      } catch {
        // Token invalid, remove it
        tokenStorage.remove();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (utenteId: number, password?: string) => {
    const response = await authApi.login(utenteId, password);
    // Save token to localStorage
    tokenStorage.set(response.data.token);
    setUser({
      id: response.data.user.id,
      nome: response.data.user.nome,
      cognome: response.data.user.cognome,
      ruolo: response.data.user.ruolo as Ruolo,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    }
    // Always remove token and clear user
    tokenStorage.remove();
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    logout,
    isResponsabile: user?.ruolo === 'RESPONSABILE',
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
