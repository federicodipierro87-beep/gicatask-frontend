import { useState, useEffect } from 'react';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { oreDovuteApi } from '../../api/client';
import type { OreDovuteAnno, RiepilogoOreDovute, RigaProspettoOreDovute } from '../../api/client';

const NOMI_MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

/** Minuti come "172:12", il formato in cui si scrivono nei campi. */
function formatOre(minuti: number): string {
  // Il segno davanti a tutto: Math.floor su un negativo darebbe "-9:-12".
  // Un totale con le assenze puo' essere negativo, per via dei Recupero ore
  const assoluti = Math.abs(minuti);
  const testo = `${Math.floor(assoluti / 60)}:${String(assoluti % 60).padStart(2, '0')}`;
  return minuti < 0 ? `-${testo}` : testo;
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

const MESI_BREVI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

/**
 * Le percentuali dell'anno in breve, come negli export: "80%" se costanti,
 * "gen-giu 80%, lug-dic 60%" se cambiano, niente per un tempo pieno fisso.
 */
function descriviPercentuali(percentuali: number[]): string {
  const tratti: { da: number; a: number; percentuale: number }[] = [];
  percentuali.forEach((p, i) => {
    const ultimo = tratti[tratti.length - 1];
    if (ultimo && ultimo.percentuale === p) ultimo.a = i;
    else tratti.push({ da: i, a: i, percentuale: p });
  });

  const primo = tratti[0];
  if (tratti.length === 1 && primo) return primo.percentuale === 100 ? '' : `${primo.percentuale}%`;

  const mese = (i: number) => MESI_BREVI[i]?.toLowerCase();
  return tratti
    .map((t) => (t.da === t.a ? `${mese(t.da)} ${t.percentuale}%` : `${mese(t.da)}-${mese(t.a)} ${t.percentuale}%`))
    .join(', ');
}

export function OreDovutePage() {
  const [anno, setAnno] = useState(() => new Date().getFullYear());
  const [testi, setTesti] = useState<string[]>(() => Array(13).fill(''));
  const [salvati, setSalvati] = useState<string[]>(() => Array(13).fill(''));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [prospetto, setProspetto] = useState<RigaProspettoOreDovute[]>([]);
  const [isLoadingProspetto, setIsLoadingProspetto] = useState(true);
  const [erroreProspetto, setErroreProspetto] = useState(false);
  const [riepilogo, setRiepilogo] = useState<RiepilogoOreDovute | null>(null);
  // Incrementato dopo ogni salvataggio: il prospetto si calcola dai dati salvati
  const [versione, setVersione] = useState(0);
  const [vistaProspetto, setVistaProspetto] = useState<'tutti' | 'dipendente'>('tutti');
  // Per id: cambiando anno si resta sullo stesso dipendente, se c'e'
  const [dipendenteId, setDipendenteId] = useState<number | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    setIsLoadingProspetto(true);
    setErroreProspetto(false);
    (async () => {
      try {
        const response = await oreDovuteApi.getProspetto(anno);
        if (cancelled) return;
        setProspetto(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        if (cancelled) return;
        setProspetto([]);
        setErroreProspetto(true);
      } finally {
        if (!cancelled) setIsLoadingProspetto(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [anno, versione]);

  // A parte dal prospetto: se manca, la vista Dipendente resta usabile senza
  // il riepilogo in fondo
  useEffect(() => {
    let cancelled = false;
    setRiepilogo(null);
    (async () => {
      try {
        const response = await oreDovuteApi.getRiepilogo(anno);
        if (!cancelled) setRiepilogo(response.data ?? null);
      } catch (err) {
        if (!cancelled) setRiepilogo(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [anno, versione]);

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
      setVersione((v) => v + 1);
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

  // Mesi non impostati secondo i dati salvati, quelli da cui viene il prospetto
  const mesiSalvatiVuoti = salvati.slice(0, ANNUE).map((t) => t === '');
  // Ore a tempo pieno salvate, la base del prospetto e del dettaglio
  const tempoPienoSalvato = salvati.slice(0, ANNUE).map((t) => parseOre(t) ?? null);
  const dipendente = prospetto.find((r) => r.utenteId === dipendenteId) ?? prospetto[0] ?? null;

  const apriDettaglio = (utenteId: number) => {
    setDipendenteId(utenteId);
    setVistaProspetto('dipendente');
  };
  const totaliProspetto = MESI_BREVI.map((_, i) =>
    mesiSalvatiVuoti[i] ? null : prospetto.reduce((tot, r) => tot + (r.minuti[i] ?? 0), 0)
  );

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

      {/* Prospetto per dipendente: a tutta larghezza, i dodici mesi non
          starebbero nella card del modulo */}
      <div className="card mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="font-medium text-gray-900">Prospetto per dipendente {anno}</h3>
          <div className="inline-flex self-start rounded-lg border border-gray-300 p-0.5" role="group" aria-label="Vista">
            {([
              ['tutti', 'Prospetto'],
              ['dipendente', 'Dipendente'],
            ] as ['tutti' | 'dipendente', string][]).map(([id, etichetta]) => (
              <button
                key={id}
                type="button"
                onClick={() => setVistaProspetto(id)}
                aria-pressed={vistaProspetto === id}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  vistaProspetto === id ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {etichetta}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1 mb-4">
          Ore a tempo pieno del mese × percentuale di lavoro in vigore in quel mese, come nel Report
          Saldi Ore. Calcolato dai dati salvati
          {modificato && <span className="text-amber-700"> — salva per aggiornarlo</span>}.
        </p>

        {isLoadingProspetto ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : erroreProspetto ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            Errore nel caricamento del prospetto
          </div>
        ) : prospetto.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nessun dipendente da mostrare</p>
        ) : vistaProspetto === 'dipendente' && dipendente ? (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
              <label htmlFor="dipendente-ore-dovute" className="text-sm text-gray-700">
                Dipendente
              </label>
              <select
                id="dipendente-ore-dovute"
                className="select sm:w-72"
                value={dipendente.utenteId}
                onChange={(e) => setDipendenteId(Number(e.target.value))}
              >
                {prospetto.map((r) => (
                  <option key={r.utenteId} value={r.utenteId}>
                    {r.utenteNome}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto max-w-2xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Mese</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-600 whitespace-nowrap">Ore a tempo pieno</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-600 whitespace-nowrap">% lavoro</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-600 whitespace-nowrap">Ore dovute</th>
                  </tr>
                </thead>
                <tbody>
                  {NOMI_MESI.map((nome, i) => {
                    const tempoPieno = tempoPienoSalvato[i];
                    const dovuti = dipendente.minuti[i];
                    const vuoto = mesiSalvatiVuoti[i];
                    return (
                      <tr key={nome} className="border-b">
                        <td className={`py-2 px-2 ${vuoto ? 'text-amber-700' : 'text-gray-900'}`}>{nome}</td>
                        <td className={`py-2 px-2 text-right whitespace-nowrap ${vuoto ? 'text-amber-700' : ''}`}>
                          {tempoPieno == null ? 'non impostato' : formatOre(tempoPieno)}
                        </td>
                        <td className="py-2 px-2 text-right">{dipendente.percentuali[i] ?? 100}%</td>
                        <td className="py-2 px-2 text-right whitespace-nowrap">
                          {dovuti == null ? <span className="text-gray-400">–</span> : formatOre(dovuti)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-medium">
                    <td className="py-3 px-2 text-gray-900">Totale</td>
                    <td className="py-3 px-2 text-right whitespace-nowrap">
                      {formatOre(tempoPienoSalvato.reduce<number>((t, m) => t + (m ?? 0), 0))}
                    </td>
                    <td className="py-3 px-2"></td>
                    <td className="py-3 px-2 text-right whitespace-nowrap">{formatOre(dipendente.totale)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Riepilogo del periodo trascorso, come in fondo agli export: il
                totale comprende le assenze, il saldo no */}
            {(() => {
              const ore = riepilogo?.righe.find((r) => r.utenteId === dipendente.utenteId);
              if (!riepilogo || !ore) return null;
              const saldo = ore.lavoroMinuti - ore.dovutiMinuti;
              const righeRiepilogo: { etichetta: string; testo: string; colore?: string }[] = [
                { etichetta: 'Totale ore', testo: formatOre(ore.totaleMinuti) },
                { etichetta: 'Totale ore dovute', testo: formatOre(ore.dovutiMinuti) },
                ...(ore.lavoroMinuti !== ore.totaleMinuti
                  ? [{ etichetta: 'Ore di lavoro (senza assenze)', testo: formatOre(ore.lavoroMinuti) }]
                  : []),
                {
                  etichetta: 'Saldo ore',
                  testo: saldo > 0 ? `+${formatOre(saldo)}` : formatOre(saldo),
                  colore: saldo > 0 ? 'text-green-700' : saldo < 0 ? 'text-red-600' : 'text-gray-500',
                },
              ];
              return (
                <div className="mt-6 max-w-md">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Riepilogo {riepilogo.etichetta}</h4>
                  <table className="w-full text-sm border">
                    <tbody>
                      {righeRiepilogo.map(({ etichetta, testo, colore }) => (
                        <tr key={etichetta} className="border-b last:border-0">
                          <td className="py-2 px-3 font-medium text-gray-900">{etichetta}</td>
                          <td className={`py-2 px-3 text-right whitespace-nowrap font-medium ${colore ?? ''}`}>
                            {testo}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-500 mt-1">
                    Il saldo coincide con il saldo cumulativo del Report Saldi Ore.
                  </p>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="sticky left-0 z-10 bg-gray-50 text-left py-3 px-2 font-medium text-gray-600">
                    Dipendente
                  </th>
                  {MESI_BREVI.map((m, i) => (
                    <th
                      key={m}
                      className={`text-right py-3 px-2 font-medium whitespace-nowrap ${
                        mesiSalvatiVuoti[i] ? 'text-amber-700' : 'text-gray-600'
                      }`}
                      title={mesiSalvatiVuoti[i] ? 'Mese non impostato' : undefined}
                    >
                      {m}
                    </th>
                  ))}
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Totale</th>
                </tr>
              </thead>
              <tbody>
                {prospetto.map((r) => {
                  const nota = descriviPercentuali(r.percentuali);
                  return (
                    <tr key={r.utenteId} className="border-b">
                      <td className="sticky left-0 z-10 bg-white py-2 px-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => apriDettaglio(r.utenteId)}
                          className="font-medium text-gray-900 hover:text-primary-600 hover:underline"
                          title="Dettaglio mese per mese"
                        >
                          {r.utenteNome}
                        </button>
                        {nota && <span className="block text-xs text-gray-500">{nota}</span>}
                      </td>
                      {r.minuti.map((m, i) => (
                        <td key={i} className="py-2 px-2 text-right whitespace-nowrap">
                          {m === null ? <span className="text-gray-400">–</span> : formatOre(m)}
                        </td>
                      ))}
                      <td className="py-2 px-2 text-right whitespace-nowrap font-medium">
                        {formatOre(r.totale)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-medium">
                  <td className="sticky left-0 z-10 bg-gray-50 py-3 px-2 text-gray-900">Totale</td>
                  {totaliProspetto.map((m, i) => (
                    <td key={i} className="py-3 px-2 text-right whitespace-nowrap">
                      {m === null ? <span className="text-gray-400">–</span> : formatOre(m)}
                    </td>
                  ))}
                  <td className="py-3 px-2 text-right whitespace-nowrap">
                    {formatOre(prospetto.reduce((tot, r) => tot + r.totale, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </ResponsabileLayout>
  );
}
