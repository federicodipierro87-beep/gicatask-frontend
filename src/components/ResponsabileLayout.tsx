import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
}

const navItems = [
  { path: '/responsabile', label: 'Dashboard', exact: true },
  { path: '/responsabile/clienti', label: 'Clienti' },
  { path: '/responsabile/utenti', label: 'Utenti' },
  { path: '/responsabile/assegna', label: 'Assegna' },
  { path: '/responsabile/report', label: 'Report' },
  { path: '/responsabile/backup', label: 'Backup' },
];

export function ResponsabileLayout({ children }: Props) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-700 text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-xl font-semibold">GicaTask</h1>
              <p className="text-sm text-primary-200">Area Responsabile</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-primary-100">
                {user?.nome} {user?.cognome}
              </span>
              <button
                onClick={logout}
                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm transition-colors"
              >
                Esci
              </button>
            </div>
          </div>
          <nav className="flex gap-1 -mb-px">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  isActive(item.path, item.exact)
                    ? 'bg-white text-primary-700'
                    : 'text-primary-100 hover:text-white hover:bg-primary-600'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
