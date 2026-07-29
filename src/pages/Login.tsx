import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';
import type { UserListItem } from '../types';
import { AxiosError } from 'axios';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      const defaultPath = user.ruolo === 'RESPONSABILE' ? '/responsabile' : '/dipendente';
      navigate(from ?? defaultPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location.state]);

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await authApi.getUsers();
        // Ensure we always set an array
        setUsers(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Impossibile caricare la lista degli utenti');
        setUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // Check if selected user needs password
  useEffect(() => {
    if (selectedUserId === null) {
      setNeedsPassword(false);
      setPassword('');
      return;
    }

    const checkPassword = async () => {
      try {
        const response = await authApi.checkPassword(selectedUserId);
        setNeedsPassword(response.data.hasPassword);
        if (!response.data.hasPassword) {
          setPassword('');
        }
      } catch (err) {
        setError('Errore durante la verifica dell\'utente');
      }
    };

    checkPassword();
  }, [selectedUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserId === null) return;

    setIsLoading(true);
    setError(null);

    try {
      await login(selectedUserId, needsPassword ? password : undefined);
      // Navigation is handled by the useEffect above
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Errore durante il login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectedUser = Array.isArray(users) ? users.find((u) => u.id === selectedUserId) : undefined;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primary-50 to-gray-100">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">GicaTask</h1>
            <p className="text-gray-600 mt-2">Portale Gestione Attività</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="user" className="label">
                Seleziona utente
              </label>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <select
                  id="user"
                  className="select"
                  value={selectedUserId ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedUserId(value ? parseInt(value, 10) : null);
                    setError(null);
                  }}
                  disabled={isLoading}
                >
                  <option value="">Seleziona...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.cognome} {user.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {needsPassword && (
              <div>
                <label htmlFor="password" className="label">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Inserisci la password"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={
                isLoading ||
                selectedUserId === null ||
                (needsPassword && !password)
              }
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Accesso in corso...
                </span>
              ) : (
                'Accedi'
              )}
            </button>

            {selectedUser && !needsPassword && (
              <p className="text-sm text-gray-500 text-center">
                Questo utente non richiede password
              </p>
            )}
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          © {new Date().getFullYear()} GicaTask
        </p>
      </div>
    </div>
  );
}
