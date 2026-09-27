import { useState, useEffect } from 'react';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { oreDovuteApi } from '../../api/client';
import type { MeseOreDovute } from '../../api/client';

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

  const hhmm = /^(\d{1,3}):([0-5]\d)$/.exec(t);
  if (hhmm) return Number(hhmm[1]) * 60 + Number(hhmm[2]);

  const decimale = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(t);
  if (decimale) return Math.round(Number(`${decimale[1]}.${decimale[2] ?? 0}`) * 60);

  return undefined;
}

function testiDaMesi(mesi: MeseOreDovute[]): string[] {
  return NOMI_MESI.map((_, i) => {
    const minuti = mesi.find((m) => m.mese === i + 1)?.minuti;
    return minuti == null ? '' : formatOre(minuti);
  });
}

export function OreDovutePage() {
  const [anno, setAnno] = useState(() => new Date().getFullYear());
  const [testi, setTesti] = useState<string[]>(() => NOMI_MESI.map(() => ''));
  const [salvati, setSalvati] = useState<string[]>(() => NOMI_MESI.map(() => ''));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setMessaggio(null);
    (async () => {
      try {
        const response = await oreDovuteApi.getAnno(anno);
        if (cancelled) return;
        const valori = testiDaMesi(response.data);
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

  const minuti = testi.map(parseOre);
  const nonValidi = minuti.some((m) => m === undefined);
  const modificato = testi.some((t, i) => t.trim() !== salvati[i]);
  const totaleAnno = minuti.reduce<number>((tot, m) => tot + (m ?? 0), 0);
  const mesiImpostati = minuti.filter((m) => m != null).length;

  const handleSave = async () => {
    if (nonValidi) return;

    setIsSaving(true);
    setError(null);
    setMessaggio(null);
    try {
      const response = await oreDovuteApi.salvaAnno(
        anno,
        minuti.map((m, i) => ({ mese: i + 1, minuti: m ?? null }))
      );
      const valori = testiDaMesi(response.data);
      setTesti(valori);
      setSalvati(valori);
      setMessaggio('Ore dovute salvate');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
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
          percentuale di lavoro, impostata in Utenti.
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
                    onChange={(e) => {
                      const valore = e.target.value;
                      setMessaggio(null);
                      setTesti((prev) => prev.map((t, j) => (j === i ? valore : t)));
                    }}
                    placeholder="non impostato"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 pt-4 border-t">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Totale anno: {formatOre(totaleAnno)}</span>
                {mesiImpostati < 12 && (
                  <span className="ml-2 text-amber-700">
                    ({12 - mesiImpostati} {12 - mesiImpostati === 1 ? 'mese' : 'mesi'} non impostati)
                  </span>
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
          </>
        )}
      </div>
    </ResponsabileLayout>
  );
}
