import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { Modal } from '../../components/Modal';
import { hrApi } from '../../api/client';
import type { CampoHr, SchedaHr } from '../../types';

type Sezione = 'attivi' | 'uscenti';

const CAMPI_KEY = 'gicatask_hr_campi_riepilogo';
const CAMPI_DEFAULT = ['numeroPersonale', 'cognomeNome', 'telefono', 'dataAssunzione'];

function formatData(valore: string | null): string {
  return valore ? new Date(valore).toLocaleDateString('it-IT', { timeZone: 'UTC' }) : '-';
}

function campiSalvati(): string[] {
  try {
    const salvati = JSON.parse(localStorage.getItem(CAMPI_KEY) ?? 'null');
    return Array.isArray(salvati) ? salvati : CAMPI_DEFAULT;
  } catch {
    return CAMPI_DEFAULT;
  }
}

/**
 * Elenco delle schede HR. Un dipendente e' uscente appena ha una data di
 * cessazione, anche futura: la scelta della sezione e' tutta qui.
 */
export function HrPage() {
  const navigate = useNavigate();
  const [schede, setSchede] = useState<SchedaHr[]>([]);
  const [campi, setCampi] = useState<CampoHr[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sezione, setSezione] = useState<Sezione>('attivi');
  const [cerca, setCerca] = useState('');
  const [selezionati, setSelezionati] = useState<Set<number>>(new Set());
  const [stampando, setStampando] = useState(false);

  const [showRiepilogo, setShowRiepilogo] = useState(false);
  const [campiScelti, setCampiScelti] = useState<string[]>(campiSalvati);
  const [titolo, setTitolo] = useState('');

  useEffect(() => {
    Promise.all([hrApi.getAll(), hrApi.getCampi()])
      .then(([s, c]) => {
        setSchede(s.data);
        setCampi(c.data);
      })
      .catch(() => setError('Errore nel caricamento delle schede'))
      .finally(() => setIsLoading(false));
  }, []);

  const attivi = useMemo(() => schede.filter((s) => !s.dataCessazione), [schede]);
  const uscenti = useMemo(() => schede.filter((s) => s.dataCessazione), [schede]);

  const visibili = useMemo(() => {
    const elenco = sezione === 'attivi' ? attivi : uscenti;
    const q = cerca.trim().toLowerCase();
    if (!q) return elenco;
    return elenco.filter(
      (s) => s.cognomeNome.toLowerCase().includes(q) || (s.numeroPersonale ?? '').toLowerCase().includes(q)
    );
  }, [sezione, attivi, uscenti, cerca]);

  // Si stampa solo cio' che e' spuntato e visibile: una spunta rimasta su un
  // dipendente filtrato via finirebbe in stampa senza che nessuno la veda
  const idStampa = visibili.filter((s) => selezionati.has(s.id)).map((s) => s.id);
  const tuttiSpuntati = visibili.length > 0 && idStampa.length === visibili.length;

  const cambiaSezione = (nuova: Sezione) => {
    setSezione(nuova);
    setSelezionati(new Set());
  };

  const toggle = (id: number) =>
    setSelezionati((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleTutti = () =>
    setSelezionati(tuttiSpuntati ? new Set() : new Set(visibili.map((s) => s.id)));

  const stampa = async (azione: () => Promise<void>) => {
    setStampando(true);
    setError(null);
    try {
      await azione();
    } catch {
      setError('Errore durante la generazione del PDF');
    } finally {
      setStampando(false);
    }
  };

  const toggleCampo = (chiave: string) =>
    setCampiScelti((prev) => (prev.includes(chiave) ? prev.filter((c) => c !== chiave) : [...prev, chiave]));

  const handleStampaRiepilogo = async () => {
    // Nell'ordine del catalogo, non in quello dei clic
    const ordinati = campi.map((c) => c.chiave).filter((c) => campiScelti.includes(c));
    try {
      localStorage.setItem(CAMPI_KEY, JSON.stringify(ordinati));
    } catch {
      // Solo una comodita': senza, la prossima volta si riparte dai default
    }
    await stampa(() => hrApi.stampaRiepilogo(idStampa, ordinati, titolo));
    setShowRiepilogo(false);
  };

  const sezioniCampi = useMemo(() => {
    const gruppi = new Map<string, CampoHr[]>();
    for (const c of campi) gruppi.set(c.sezione, [...(gruppi.get(c.sezione) ?? []), c]);
    return [...gruppi.entries()];
  }, [campi]);

  return (
    <ResponsabileLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">HR - Schede dipendenti</h2>
          <p className="text-sm text-gray-600 mt-1">
            {attivi.length} attivi, {uscenti.length} uscenti
          </p>
        </div>
        <Link to="/responsabile/hr/nuova" className="btn-primary">
          + Nuova scheda
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Chiudi</button>
        </div>
      )}

      <div className="card">
        <div className="flex gap-1 border-b border-gray-200 mb-4">
          {(['attivi', 'uscenti'] as Sezione[]).map((s) => (
            <button
              key={s}
              onClick={() => cambiaSezione(s)}
              className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
                sezione === s
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === 'attivi' ? `Attivi (${attivi.length})` : `Uscenti (${uscenti.length})`}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <input
            type="search"
            className="input md:max-w-xs"
            placeholder="Cerca per nome o numero..."
            value={cerca}
            onChange={(e) => setCerca(e.target.value)}
          />
          <div className="flex flex-wrap gap-3 md:ml-auto">
            <button
              className="btn-secondary"
              disabled={idStampa.length === 0 || stampando}
              onClick={() => stampa(() => hrApi.stampaSchede(idStampa))}
            >
              Stampa schede ({idStampa.length})
            </button>
            <button
              className="btn-secondary"
              disabled={idStampa.length === 0 || stampando}
              onClick={() => setShowRiepilogo(true)}
            >
              Stampa riepilogo ({idStampa.length})
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : visibili.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {sezione === 'attivi' ? 'Nessun dipendente attivo' : 'Nessun dipendente uscente'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="py-3 px-2 w-8">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={tuttiSpuntati}
                      onChange={toggleTutti}
                      aria-label="Seleziona tutti"
                    />
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">N.</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Cognome e nome</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Telefono</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Assunzione</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">
                    {sezione === 'attivi' ? 'Scad. permesso' : 'Cessazione'}
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {visibili.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/responsabile/hr/${s.id}`)}
                  >
                    <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={selezionati.has(s.id)}
                        onChange={() => toggle(s.id)}
                        aria-label={`Seleziona ${s.cognomeNome}`}
                      />
                    </td>
                    <td className="py-3 px-2 text-gray-600">{s.numeroPersonale || '-'}</td>
                    <td className="py-3 px-2 font-medium">{s.cognomeNome}</td>
                    <td className="py-3 px-2">{s.telefono || '-'}</td>
                    <td className="py-3 px-2">{formatData(s.dataAssunzione)}</td>
                    <td className="py-3 px-2">
                      {formatData(sezione === 'attivi' ? s.scadenzaPermesso : s.dataCessazione)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Link
                        to={`/responsabile/hr/${s.id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Apri
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showRiepilogo} onClose={() => setShowRiepilogo(false)} title="Stampa riepilogo">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {idStampa.length} dipendenti selezionati. Scegli le voci da stampare:
          </p>
          <div className="flex gap-3 text-sm">
            <button type="button" className="text-primary-600 underline" onClick={() => setCampiScelti(campi.map((c) => c.chiave))}>
              Tutte
            </button>
            <button type="button" className="text-primary-600 underline" onClick={() => setCampiScelti([])}>
              Nessuna
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-4 pr-1">
            {sezioniCampi.map(([nome, campiSezione]) => (
              <div key={nome}>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{nome}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {campiSezione.map((c) => (
                    <label key={c.chiave} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={campiScelti.includes(c.chiave)}
                        onChange={() => toggleCampo(c.chiave)}
                      />
                      {c.etichetta}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div>
            <label htmlFor="titoloRiepilogo" className="label">Titolo (facoltativo)</label>
            <input
              id="titoloRiepilogo"
              className="input"
              placeholder="Riepilogo dipendenti"
              value={titolo}
              onChange={(e) => setTitolo(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setShowRiepilogo(false)}>
              Annulla
            </button>
            <button
              className="btn-primary"
              disabled={campiScelti.length === 0 || stampando}
              onClick={handleStampaRiepilogo}
            >
              {stampando ? 'Generazione...' : 'Stampa'}
            </button>
          </div>
        </div>
      </Modal>
    </ResponsabileLayout>
  );
}
