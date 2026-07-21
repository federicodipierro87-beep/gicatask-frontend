import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { authApi } from '../api/client';
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
      try {
        const response = await authApi.getMe();
        setUser({
          id: response.data.user.id,
          nome: response.data.user.nome,
          cognome: response.data.user.cognome,
          ruolo: response.data.user.ruolo as Ruolo,
        });
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (utenteId: number, password?: string) => {
    const response = await authApi.login(utenteId, password);
    setUser({
      id: response.data.user.id,
      nome: response.data.user.nome,
      cognome: response.data.user.cognome,
      ruolo: response.data.user.ruolo as Ruolo,
    });
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
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
