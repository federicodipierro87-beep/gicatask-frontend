import { useAuth } from '../context/AuthContext';

export function DipendenteDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
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
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Benvenuto, {user?.nome}!
          </h2>
          <p className="text-gray-600">
            Questa è l'area dedicata ai dipendenti. Qui potrai registrare le tue
            attività lavorative e visualizzare lo storico.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900">Nuova Attività</h3>
              <p className="text-sm text-gray-500 mt-1">
                Registra una nuova attività lavorativa
              </p>
              <button className="btn-primary mt-4 w-full" disabled>
                Prossimamente
              </button>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900">Le Mie Attività</h3>
              <p className="text-sm text-gray-500 mt-1">
                Visualizza e modifica le tue attività
              </p>
              <button className="btn-secondary mt-4 w-full" disabled>
                Prossimamente
              </button>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900">Riepilogo Settimanale</h3>
              <p className="text-sm text-gray-500 mt-1">
                Visualizza il riepilogo della settimana
              </p>
              <button className="btn-secondary mt-4 w-full" disabled>
                Prossimamente
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
