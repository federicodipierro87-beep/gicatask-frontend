import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
}

// Main navigation items (always visible)
const mainNavItems = [
  { path: '/responsabile', label: 'Dashboard', exact: true },
  { path: '/responsabile/assegna', label: 'Assegna' },
  { path: '/responsabile/report', label: 'Report' },
];

// Settings items (in dropdown on mobile, visible on desktop)
const settingsNavItems = [
  { path: '/responsabile/clienti', label: 'Clienti' },
  { path: '/responsabile/cantieri', label: 'Cantieri' },
  { path: '/responsabile/tipi-attivita', label: 'Tipi Attività' },
  { path: '/responsabile/utenti', label: 'Utenti' },
  { path: '/responsabile/import', label: 'Import' },
  { path: '/responsabile/backup', label: 'Backup' },
];

export function ResponsabileLayout({ children }: Props) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);

  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const isSettingsActive = settingsNavItems.some(item => isActive(item.path));

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <header className="bg-primary-700 text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-xl font-semibold">GicaTask</h1>
              <p className="text-sm text-primary-200">Area Responsabile</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-sm text-primary-100 hidden sm:inline">
                {user?.nome} {user?.cognome}
              </span>

              {/* Settings button (mobile) */}
              <div className="relative sm:hidden">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-lg transition-colors ${
                    showSettings || isSettingsActive
                      ? 'bg-white text-primary-700'
                      : 'bg-primary-600 hover:bg-primary-500'
                  }`}
                  aria-label="Impostazioni"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {/* Settings dropdown */}
                {showSettings && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowSettings(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-20 py-2">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Impostazioni</p>
                      </div>
                      {settingsNavItems.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setShowSettings(false)}
                          className={`block px-4 py-2 text-sm ${
                            isActive(item.path)
                              ? 'bg-primary-50 text-primary-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={logout}
                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm transition-colors"
              >
                Esci
              </button>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {/* Main nav items (always visible) */}
            {mainNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                  isActive(item.path, item.exact)
                    ? 'bg-white text-primary-700'
                    : 'text-primary-100 hover:text-white hover:bg-primary-600'
                }`}
              >
                {item.label}
              </Link>
            ))}

            {/* Settings nav items (only visible on desktop) */}
            {settingsNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`hidden sm:block px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                  isActive(item.path)
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
