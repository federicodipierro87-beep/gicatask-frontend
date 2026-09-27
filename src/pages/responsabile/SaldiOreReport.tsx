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
  /** Differenza di ogni mese da gennaio a quello scelto: sommate fanno il saldo. */
  differenzeMensili: number[];
}

type Vista = 'mese' | 'prospetto';

const NOMI_MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

const MESI_BREVI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

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
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [vista, setVista] = useState<Vista>('mese');

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

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(format);
    try {
      await attivitaApi.exportSaldiOre(
        format,
        mese,
        `saldi-ore-${mese}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      );
    } catch (err) {
      setError(`Errore durante l'esportazione ${format.toUpperCase()}`);
    } finally {
      setExporting(null);
    }
  };

  const totali = righe.reduce(
    (acc, r) => ({
      dovute: acc.dovute + r.oreDovuteMinuti,
      effettuate: acc.effettuate + r.oreEffettuateMinuti,
      differenza: acc.differenza + r.differenzaMinuti,
      saldo: acc.saldo + r.saldoCumulativoMinuti,
    }),
    { dovute: 0, effettuate: 0, differenza: 0, saldo: 0 }
  );

  // Il prospetto va da gennaio al mese scelto
  const mesiProspetto = MESI_BREVI.slice(0, Number(mese.slice(5, 7)));
  const totaliMensili = mesiProspetto.map((_, i) =>
    righe.reduce((tot, r) => tot + (r.differenzeMensili?.[i] ?? 0), 0)
  );

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="font-medium text-gray-900">Saldi Ore</h3>
          <p className="text-xs text-gray-500 mt-1">
            {vista === 'mese'
              ? 'Ore dovute = ore del mese a tempo pieno × percentuale di lavoro. Ore effettuate senza assenze. Il saldo cumulativo parte da gennaio.'
              : 'Differenza di ogni mese (ore effettuate − ore dovute) da gennaio al mese scelto; l\'ultima colonna è il saldo cumulativo.'}
          </p>
        </div>
        <MonthNavigator month={mese} onChange={setMese} className="sm:w-64" />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b">
        <div className="inline-flex rounded-lg border border-gray-300 p-0.5" role="group" aria-label="Vista">
          {([
            ['mese', 'Mese'],
            ['prospetto', `Prospetto gen–${MESI_BREVI[Number(mese.slice(5, 7)) - 1]?.toLowerCase()}`],
          ] as [Vista, string][]).map(([id, etichetta]) => (
            <button
              key={id}
              type="button"
              onClick={() => setVista(id)}
              aria-pressed={vista === id}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                vista === id ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {etichetta}
            </button>
          ))}
        </div>
        <div className="hidden sm:block flex-1" />
        <button
          onClick={() => handleExport('excel')}
          disabled={exporting !== null || isLoading}
          className="btn-primary flex items-center gap-2"
        >
          {exporting === 'excel' ? (
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          Esporta Excel
        </button>
        <button
          onClick={() => handleExport('pdf')}
          disabled={exporting !== null || isLoading}
          className="btn-secondary flex items-center gap-2"
        >
          {exporting === 'pdf' ? (
            <span className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full"></span>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          )}
          Esporta PDF
        </button>
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
      ) : vista === 'prospetto' ? (
        // Nome fisso a sinistra: con dodici mesi la tabella scorre in orizzontale
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="sticky left-0 z-10 bg-gray-50 text-left py-3 px-2 font-medium text-gray-600">
                  Dipendente
                </th>
                {mesiProspetto.map((m, i) => {
                  const senzaDovute = mesiSenzaOreDovute.includes(i + 1);
                  return (
                    <th
                      key={m}
                      className={`text-right py-3 px-2 font-medium whitespace-nowrap ${
                        senzaDovute ? 'text-amber-700' : 'text-gray-600'
                      }`}
                      title={senzaDovute ? 'Ore dovute non impostate: in questo mese valgono zero' : undefined}
                    >
                      {m}
                      {senzaDovute && '*'}
                    </th>
                  );
                })}
                <th className="text-right py-3 px-2 font-medium text-gray-600">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {righe.map((r) => (
                <tr key={r.utenteId} className="border-b">
                  <td className="sticky left-0 z-10 bg-white py-3 px-2 font-medium text-gray-900 whitespace-nowrap">
                    {r.utenteNome}
                    {r.percentualeLavoro !== 100 && (
                      <span className="ml-2 text-xs font-normal text-gray-500">{r.percentualeLavoro}%</span>
                    )}
                  </td>
                  {mesiProspetto.map((m, i) => {
                    const d = r.differenzeMensili?.[i] ?? 0;
                    return (
                      <td key={m} className={`py-3 px-2 text-right whitespace-nowrap ${coloreSaldo(d)}`}>
                        {formatSaldo(d)}
                      </td>
                    );
                  })}
                  <td className={`py-3 px-2 text-right whitespace-nowrap font-medium ${coloreSaldo(r.saldoCumulativoMinuti)}`}>
                    {formatSaldo(r.saldoCumulativoMinuti)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-medium">
                <td className="sticky left-0 z-10 bg-gray-50 py-3 px-2 text-gray-900">Totale</td>
                {totaliMensili.map((d, i) => (
                  <td key={i} className={`py-3 px-2 text-right whitespace-nowrap ${coloreSaldo(d)}`}>
                    {formatSaldo(d)}
                  </td>
                ))}
                <td className={`py-3 px-2 text-right whitespace-nowrap ${coloreSaldo(totali.saldo)}`}>
                  {formatSaldo(totali.saldo)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
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
