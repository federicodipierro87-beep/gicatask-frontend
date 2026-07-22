import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
}

const navItems = [
  { path: '/dipendente', label: 'Le Mie Attività', exact: true },
  { path: '/dipendente/nuova', label: 'Nuova Attività' },
];

export function DipendenteLayout({ children }: Props) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">GicaTask</h1>
              <p className="text-sm text-gray-600">Area Dipendente</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user?.nome} {user?.cognome}
              </span>
              <button onClick={logout} className="btn-secondary text-sm">
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
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:text-primary-600 hover:bg-gray-100'
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
