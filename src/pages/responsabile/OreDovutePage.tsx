import { useState, useEffect } from 'react';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { oreDovuteApi } from '../../api/client';
import type { OreDovuteAnno } from '../../api/client';

const NOMI_MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

/** Minuti come "172:12", il formato in cui si scrivono nei campi. */
function formatOre(minuti: number): string {
  return `${Math.floor(minuti / 60)}:${String(minuti % 60).padStart(2, '0')}`;
}

/**
 * Minuti da "172:12", "172" o "172,5"; `null` per il campo vuoto, `undefined`
 * se il testo non e' un orario valido.
 */
function parseOre(testo: string): number | null | undefined {
  const t = testo.trim();
  if (t === '') return null;

  const hhmm = /^(\d{1,4}):([0-5]\d)$/.exec(t);
  if (hhmm) return Number(hhmm[1]) * 60 + Number(hhmm[2]);

  const decimale = /^(\d{1,4})(?:[.,](\d{1,2}))?$/.exec(t);
  if (decimale) return Math.round(Number(`${decimale[1]}.${decimale[2] ?? 0}`) * 60);

  return undefined;
}

/** I testi dei campi: i dodici mesi e, in fondo, le ore annue. */
function testiDaAnno(dati: OreDovuteAnno): string[] {
  const mesi = NOMI_MESI.map((_, i) => {
    const minuti = dati.mesi.find((m) => m.mese === i + 1)?.minuti;
    return minuti == null ? '' : formatOre(minuti);
  });
  return [...mesi, dati.minutiAnnui == null ? '' : formatOre(dati.minutiAnnui)];
}

// Indice del campo ore annue in `testi`, dopo i dodici mesi
const ANNUE = 12;

export function OreDovutePage() {
  const [anno, setAnno] = useState(() => new Date().getFullYear());
  const [testi, setTesti] = useState<string[]>(() => Array(13).fill(''));
  const [salvati, setSalvati] = useState<string[]>(() => Array(13).fill(''));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setMessaggio(null);
    (async () => {
      try {
        const response = await oreDovuteApi.getAnno(anno);
        if (cancelled) return;
        const valori = testiDaAnno(response.data);
        setTesti(valori);
        setSalvati(valori);
      } catch (err) {
        if (cancelled) return;
        setError('Errore nel caricamento delle ore dovute');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [anno]);

  const valori = testi.map(parseOre);
  const minuti = valori.slice(0, ANNUE);
  const minutiAnnui = valori[ANNUE];
  const nonValidi = valori.some((m) => m === undefined);
  const modificato = testi.some((t, i) => t.trim() !== salvati[i]);
  const totaleAnno = minuti.reduce<number>((tot, m) => tot + (m ?? 0), 0);
  const mesiImpostati = minuti.filter((m) => m != null).length;
  // Positiva se i mesi non arrivano ancora alle ore annue
  const scarto = minutiAnnui != null ? minutiAnnui - totaleAnno : null;

  const aggiornaTesto = (indice: number, valore: string) => {
    setMessaggio(null);
    setTesti((prev) => prev.map((t, j) => (j === indice ? valore : t)));
  };

  const handleSave = async () => {
    if (nonValidi) return;

    setIsSaving(true);
    setError(null);
    setMessaggio(null);
    try {
      const response = await oreDovuteApi.salvaAnno(
        anno,
        minuti.map((m, i) => ({ mese: i + 1, minuti: m ?? null })),
        minutiAnnui ?? null
      );
      const valori = testiDaAnno(response.data);
      setTesti(valori);
      setSalvati(valori);
      setMessaggio('Ore dovute salvate');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(format);
    setError(null);
    try {
      await oreDovuteApi.exportAnno(
        format,
        anno,
        `ore-dovute-${anno}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      );
    } catch (err) {
      setError(`Errore durante l'esportazione ${format.toUpperCase()}`);
    } finally {
      setExporting(null);
    }
  };

  const cambiaAnno = (delta: number) => {
    if (modificato && !window.confirm('Ci sono modifiche non salvate. Cambiare anno?')) return;
    setAnno((a) => a + delta);
  };

  return (
    <ResponsabileLayout>
      <div className="card max-w-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <h2 className="text-xl font-semibold text-gray-900">Ore Dovute</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => cambiaAnno(-1)}
              aria-label="Anno precedente"
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="w-16 text-center font-medium text-gray-900">{anno}</span>
            <button
              type="button"
              onClick={() => cambiaAnno(1)}
              aria-label="Anno successivo"
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Ore dovute di ogni mese per un <strong>tempo pieno (100%)</strong>, nel formato ore:minuti
          (es. 172:12). Per ciascun dipendente il Report Saldi Ore le moltiplica per la sua
          percentuale di lavoro, impostata in Utenti. Le <strong>ore annue</strong> servono da
          controllo: la somma dei mesi deve tornare con quelle.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {messaggio && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {messaggio}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {/* Stessa griglia dei mesi, cosi' il campo si allinea alla prima colonna */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 mb-6 pb-6 border-b">
              <div className="flex items-center gap-3">
                <label htmlFor="ore-annue" className="w-24 text-sm font-medium text-gray-900">
                  Ore annue
                </label>
                <input
                  id="ore-annue"
                  type="text"
                  inputMode="decimal"
                  className={`input text-right ${
                    minutiAnnui === undefined ? 'border-red-400 focus:ring-red-500' : ''
                  }`}
                  value={testi[ANNUE]}
                  onChange={(e) => aggiornaTesto(ANNUE, e.target.value)}
                  placeholder="non impostate"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {NOMI_MESI.map((nome, i) => (
                <div key={nome} className="flex items-center gap-3">
                  <label htmlFor={`mese-${i + 1}`} className="w-24 text-sm text-gray-700">
                    {nome}
                  </label>
                  <input
                    id={`mese-${i + 1}`}
                    type="text"
                    inputMode="decimal"
                    className={`input text-right ${
                      minuti[i] === undefined ? 'border-red-400 focus:ring-red-500' : ''
                    }`}
                    value={testi[i]}
                    onChange={(e) => aggiornaTesto(i, e.target.value)}
                    placeholder="non impostato"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 pt-4 border-t">
              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  <span className="font-medium">Somma dei mesi: {formatOre(totaleAnno)}</span>
                  {mesiImpostati < 12 && (
                    <span className="ml-2 text-amber-700">
                      ({12 - mesiImpostati} {12 - mesiImpostati === 1 ? 'mese' : 'mesi'} non impostati)
                    </span>
                  )}
                </p>
                {scarto === null ? (
                  <p className="text-gray-500">Inserisci le ore annue per il controllo incrociato.</p>
                ) : scarto === 0 ? (
                  <p className="text-green-700">✓ La somma dei mesi corrisponde alle ore annue.</p>
                ) : (
                  <p className="text-amber-700">
                    {scarto > 0
                      ? `Mancano ${formatOre(scarto)} per arrivare alle ore annue (${formatOre(minutiAnnui!)}).`
                      : `La somma dei mesi supera le ore annue (${formatOre(minutiAnnui!)}) di ${formatOre(-scarto)}.`}
                  </p>
                )}
                {nonValidi && (
                  <p className="text-red-600 mt-1">Correggi i campi in rosso: usa ore:minuti, es. 172:12</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleSave}
                className="btn-primary"
                disabled={isSaving || nonValidi || !modificato}
              >
                {isSaving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>

            {/* L'export legge i dati salvati: con modifiche in sospeso il file non
                corrisponderebbe a quello che si vede */}
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t">
              <button
                type="button"
                onClick={() => handleExport('excel')}
                disabled={exporting !== null || modificato}
                className="btn-secondary flex items-center gap-2"
              >
                {exporting === 'excel' ? (
                  <span className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full"></span>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                Esporta Excel
              </button>
              <button
                type="button"
                onClick={() => handleExport('pdf')}
                disabled={exporting !== null || modificato}
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
              {modificato && (
                <span className="text-sm text-gray-500">Salva le modifiche per esportare</span>
              )}
            </div>
          </>
        )}
      </div>
    </ResponsabileLayout>
  );
}
