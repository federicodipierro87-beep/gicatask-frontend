import { useAuth } from '../context/AuthContext';

export function InactivityWarning() {
  const { showInactivityWarning, dismissInactivityWarning, logout } = useAuth();

  if (!showInactivityWarning) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Sessione in scadenza</h3>
        </div>

        <p className="text-gray-600 mb-6">
          La tua sessione sta per scadere per inattivita. Vuoi continuare a lavorare?
        </p>

        <div className="flex gap-3">
          <button
            onClick={logout}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Esci
          </button>
          <button
            onClick={dismissInactivityWarning}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Continua
          </button>
        </div>
      </div>
    </div>
  );
}
