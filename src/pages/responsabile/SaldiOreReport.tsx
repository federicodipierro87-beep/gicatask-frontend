import { useState, useEffect } from 'react';
import { attivitaApi } from '../../api/client';
import { MonthNavigator, currentMonth } from '../../components/MonthNavigator';
import type { MonthKey } from '../../components/MonthNavigator';
import { formatDuration } from '../../utils/durata';

interface RigaSaldoOre {
  utenteId: number;
  utenteNome: string;
  percentualeLavoro: number;
  oreDovuteMinuti: number;
  oreEffettuateMinuti: number;
  differenzaMinuti: number;
  saldoCumulativoMinuti: number;
}

const NOMI_MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

// Verde il credito del dipendente, rosso il debito
function coloreSaldo(minuti: number): string {
  if (minuti > 0) return 'text-green-700';
  if (minuti < 0) return 'text-red-600';
  return 'text-gray-500';
}

function formatSaldo(minuti: number): string {
  return minuti > 0 ? `+${formatDuration(minuti)}` : formatDuration(minuti);
}

export function SaldiOreReport() {
  const [mese, setMese] = useState<MonthKey>(currentMonth());
  const [righe, setRighe] = useState<RigaSaldoOre[]>([]);
  const [mesiSenzaOreDovute, setMesiSenzaOreDovute] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    (async () => {
      try {
        const response = await attivitaApi.getSaldiOre(mese);
        if (cancelled) return;
        setRighe(Array.isArray(response.data?.righe) ? response.data.righe : []);
        setMesiSenzaOreDovute(response.data?.mesiSenzaOreDovute ?? []);
      } catch (err) {
        if (cancelled) return;
        setRighe([]);
        setMesiSenzaOreDovute([]);
        setError('Errore nel caricamento dei saldi ore');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mese]);

  const totali = righe.reduce(
    (acc, r) => ({
      dovute: acc.dovute + r.oreDovuteMinuti,
      effettuate: acc.effettuate + r.oreEffettuateMinuti,
      differenza: acc.differenza + r.differenzaMinuti,
      saldo: acc.saldo + r.saldoCumulativoMinuti,
    }),
    { dovute: 0, effettuate: 0, differenza: 0, saldo: 0 }
  );

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="font-medium text-gray-900">Saldi Ore</h3>
          <p className="text-xs text-gray-500 mt-1">
            Ore dovute = ore del mese a tempo pieno × percentuale di lavoro. Ore effettuate
            senza assenze. Il saldo cumulativo parte da gennaio.
          </p>
        </div>
        <MonthNavigator month={mese} onChange={setMese} className="sm:w-64" />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {!isLoading && mesiSenzaOreDovute.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          Ore dovute non impostate per {mesiSenzaOreDovute.map((m) => NOMI_MESI[m - 1]).join(', ')}{' '}
          {mese.slice(0, 4)}: in quei mesi valgono zero. Impostale in Impostazioni → Ore dovute.
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : righe.length === 0 ? (
        <p className="text-center text-gray-500 py-8">Nessun dipendente da mostrare</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-2 font-medium text-gray-600">Dipendente</th>
                <th className="text-right py-3 px-2 font-medium text-gray-600 whitespace-nowrap">Ore dovute</th>
                <th className="text-right py-3 px-2 font-medium text-gray-600 whitespace-nowrap">Ore effettuate</th>
                <th className="text-right py-3 px-2 font-medium text-gray-600">Differenza</th>
                <th className="text-right py-3 px-2 font-medium text-gray-600 whitespace-nowrap">Saldo cumulativo</th>
              </tr>
            </thead>
            <tbody>
              {righe.map((r) => (
                <tr key={r.utenteId} className="border-b">
                  <td className="py-3 px-2 font-medium text-gray-900">
                    {r.utenteNome}
                    {r.percentualeLavoro !== 100 && (
                      <span className="ml-2 text-xs font-normal text-gray-500">{r.percentualeLavoro}%</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-right whitespace-nowrap">{formatDuration(r.oreDovuteMinuti)}</td>
                  <td className="py-3 px-2 text-right whitespace-nowrap">{formatDuration(r.oreEffettuateMinuti)}</td>
                  <td className={`py-3 px-2 text-right whitespace-nowrap ${coloreSaldo(r.differenzaMinuti)}`}>
                    {formatSaldo(r.differenzaMinuti)}
                  </td>
                  <td className={`py-3 px-2 text-right whitespace-nowrap font-medium ${coloreSaldo(r.saldoCumulativoMinuti)}`}>
                    {formatSaldo(r.saldoCumulativoMinuti)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-medium">
                <td className="py-3 px-2 text-gray-900">Totale</td>
                <td className="py-3 px-2 text-right whitespace-nowrap">{formatDuration(totali.dovute)}</td>
                <td className="py-3 px-2 text-right whitespace-nowrap">{formatDuration(totali.effettuate)}</td>
                <td className={`py-3 px-2 text-right whitespace-nowrap ${coloreSaldo(totali.differenza)}`}>
                  {formatSaldo(totali.differenza)}
                </td>
                <td className={`py-3 px-2 text-right whitespace-nowrap ${coloreSaldo(totali.saldo)}`}>
                  {formatSaldo(totali.saldo)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
