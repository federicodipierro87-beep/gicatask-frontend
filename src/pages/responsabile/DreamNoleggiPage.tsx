import { useEffect, useMemo, useState } from 'react';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { Modal } from '../../components/Modal';
import { CampoData } from '../../components/CampoData';
import { dreamNoleggiApi, dreamVeicoliApi } from '../../api/client';
import type { DreamNoleggio, DreamNoleggioInput, DreamVeicolo, QuotaNoleggio } from '../../types';

interface FormState {
  data: string;
  veicoloId: string;
  osservazioni: string;
  importo: string;
  quota: QuotaNoleggio;
}

const FORM_VUOTO: FormState = {
  data: '',
  veicoloId: '',
  osservazioni: '',
  importo: '',
  quota: 'SETTANTA_TRENTA',
};

function isoLocale(anno: number, mese: number, giorno: number): string {
  return `${anno}-${String(mese + 1).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`;
}

/** Il periodo di default e' il mese corrente, letto in ora locale. */
function meseCorrente(): { dal: string; al: string } {
  const oggi = new Date();
  const anno = oggi.getFullYear();
  const mese = oggi.getMonth();
  // Giorno 0 del mese successivo: l'ultimo del mese corrente
  const ultimo = new Date(anno, mese + 1, 0).getDate();

  return { dal: isoLocale(anno, mese, 1), al: isoLocale(anno, mese, ultimo) };
}

/**
 * Le date del backend sono ISO complete ma valgono come giorni: passarle a
 * `new Date()` le sposterebbe al giorno prima nei fusi a est di Greenwich.
 */
function formatData(iso: string): string {
  return iso.slice(0, 10).split('-').reverse().join('/');
}

// Stessa formattazione del PDF, cosi' i due si leggono allo stesso modo
function formatImporto(importo: number): string {
  return importo.toFixed(2).replace('.', ',');
}

function etichettaQuota(quota: QuotaNoleggio): string {
  return quota === 'SETTANTA_TRENTA' ? '70/30' : '100';
}

/**
 * Anteprima dell'importo trattenuto. Il valore salvato e' comunque quello
 * ricalcolato dal server: qui serve solo a far vedere l'effetto della quota
 * prima di premere Salva.
 */
function calcolaImporto(importo: number, quota: QuotaNoleggio): number {
  const lordo = quota === 'SETTANTA_TRENTA' ? importo * 0.7 : importo;
  return Math.round(lordo * 100) / 100;
}

export function DreamNoleggiPage() {
  const periodoIniziale = meseCorrente();

  const [dal, setDal] = useState(periodoIniziale.dal);
  const [al, setAl] = useState(periodoIniziale.al);

  const [noleggi, setNoleggi] = useState<DreamNoleggio[]>([]);
  const [veicoli, setVeicoli] = useState<DreamVeicolo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(FORM_VUOTO);
  const [editId, setEditId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const response = await dreamVeicoliApi.getAll();
        setVeicoli(Array.isArray(response.data) ? response.data : []);
      } catch {
        setError('Errore nel caricamento dei veicoli');
      }
    })();
  }, [refreshToken]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const response = await dreamNoleggiApi.getAll(dal, al);
        if (cancelled) return;
        setNoleggi(Array.isArray(response.data) ? response.data : []);
      } catch {
        if (cancelled) return;
        setNoleggi([]);
        setError('Errore nel caricamento dei noleggi');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dal, al, refreshToken]);

  const importoCalcolato = useMemo(() => {
    const importo = parseFloat(form.importo);
    if (Number.isNaN(importo)) return '';
    return formatImporto(calcolaImporto(importo, form.quota));
  }, [form.importo, form.quota]);

  const totali = useMemo(
    () =>
      noleggi.reduce(
        (acc, n) => ({
          importo: acc.importo + n.importo,
          calcolato: acc.calcolato + n.importoCalcolato,
        }),
        { importo: 0, calcolato: 0 }
      ),
    [noleggi]
  );

  const resetForm = () => {
    setForm(FORM_VUOTO);
    setEditId(null);
  };

  const handleEdit = (noleggio: DreamNoleggio) => {
    setEditId(noleggio.id);
    setForm({
      data: noleggio.data.slice(0, 10),
      veicoloId: String(noleggio.veicoloId),
      osservazioni: noleggio.osservazioni ?? '',
      importo: String(noleggio.importo),
      quota: noleggio.quota,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.data || !form.veicoloId || !form.importo) {
      setError('Data, veicolo e importo sono obbligatori');
      return;
    }

    const payload: DreamNoleggioInput = {
      veicoloId: parseInt(form.veicoloId, 10),
      data: form.data,
      osservazioni: form.osservazioni.trim() || null,
      importo: parseFloat(form.importo),
      quota: form.quota,
    };

    setIsSaving(true);
    try {
      if (editId !== null) await dreamNoleggiApi.update(editId, payload);
      else await dreamNoleggiApi.create(payload);

      resetForm();
      setRefreshToken((n) => n + 1);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;

    setIsDeleting(true);
    try {
      await dreamNoleggiApi.delete(deleteId);
      if (editId === deleteId) resetForm();
      setDeleteId(null);
      setRefreshToken((n) => n + 1);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante l\'eliminazione');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await dreamNoleggiApi.exportPdf(dal, al);
    } catch {
      setError('Errore durante l\'esportazione del report');
    } finally {
      setIsExporting(false);
    }
  };

  // Un veicolo disattivato dopo la registrazione del noleggio non torna dalla
  // lista degli attivi: senza questa aggiunta la select si svuoterebbe in modifica
  const noleggioInModifica = noleggi.find((n) => n.id === editId);
  const opzioniVeicoli =
    noleggioInModifica && !veicoli.some((v) => v.id === noleggioInModifica.veicoloId)
      ? [...veicoli, { ...noleggioInModifica.veicolo, attivo: false }]
      : veicoli;

  return (
    <ResponsabileLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Dream Noleggio</h2>
          <p className="text-sm text-gray-600 mt-1">
            Registra i noleggi ed esporta il report del periodo in PDF
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <CampoData id="periodoDal" label="Dal" value={dal} onChange={setDal} />
          <CampoData id="periodoAl" label="Al" value={al} onChange={setAl} />
          <button
            onClick={handleExport}
            disabled={isExporting || noleggi.length === 0}
            className="btn-primary flex items-center gap-2"
          >
            {isExporting ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            Esporta report
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Chiudi</button>
        </div>
      )}

      {/* Il form sta in una card e non in un Modal: sei campi in max-w-md
          starebbero tutti incolonnati */}
      <form onSubmit={handleSubmit} className="card mb-6">
        <h3 className="font-medium text-gray-900 mb-4">
          {editId !== null ? 'Modifica noleggio' : 'Nuovo noleggio'}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <CampoData
            id="data"
            label="Data *"
            value={form.data}
            onChange={(data) => setForm({ ...form, data })}
            required
          />
          <div>
            <label htmlFor="veicolo" className="label">Veicolo *</label>
            <select
              id="veicolo"
              className="select"
              value={form.veicoloId}
              onChange={(e) => setForm({ ...form, veicoloId: e.target.value })}
              required
            >
              <option value="">Seleziona veicolo</option>
              {opzioniVeicoli.map((v) => (
                <option key={v.id} value={v.id}>{v.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="importo" className="label">Importo *</label>
            <input
              id="importo"
              type="number"
              step="0.01"
              className="input"
              value={form.importo}
              onChange={(e) => setForm({ ...form, importo: e.target.value })}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="osservazioni" className="label">Osservazioni</label>
            <textarea
              id="osservazioni"
              rows={3}
              className="input"
              value={form.osservazioni}
              onChange={(e) => setForm({ ...form, osservazioni: e.target.value })}
            />
          </div>
          <div className="space-y-4">
            <div>
              <span className="label">Quota *</span>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="quota"
                    checked={form.quota === 'SETTANTA_TRENTA'}
                    onChange={() => setForm({ ...form, quota: 'SETTANTA_TRENTA' })}
                  />
                  70/30
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="quota"
                    checked={form.quota === 'CENTO'}
                    onChange={() => setForm({ ...form, quota: 'CENTO' })}
                  />
                  100
                </label>
              </div>
            </div>
            <div>
              <label htmlFor="importoCalcolato" className="label">Importo calcolato</label>
              <input
                id="importoCalcolato"
                type="text"
                className="input disabled:bg-gray-50"
                value={importoCalcolato}
                readOnly
                disabled
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-4 pt-4 border-t">
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Salvataggio...' : editId !== null ? 'Salva modifiche' : 'Aggiungi noleggio'}
          </button>
          {editId !== null && (
            <button type="button" onClick={resetForm} className="btn-secondary" disabled={isSaving}>
              Annulla
            </button>
          )}
        </div>
      </form>

      <div className="card">
        <h3 className="font-medium text-gray-900 mb-4">
          Noleggi del periodo
          {!isLoading && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({noleggi.length} {noleggi.length === 1 ? 'noleggio' : 'noleggi'})
            </span>
          )}
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : noleggi.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nessun noleggio nel periodo selezionato</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Data</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Veicolo</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Osservazioni</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Importo</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Quota</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Importo calcolato</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {noleggi.map((noleggio) => (
                  <tr key={noleggio.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 whitespace-nowrap">{formatData(noleggio.data)}</td>
                    <td className="py-3 px-2 font-medium">{noleggio.veicolo.nome}</td>
                    <td className="py-3 px-2 text-gray-600">{noleggio.osservazioni}</td>
                    <td className="py-3 px-2 text-right whitespace-nowrap">{formatImporto(noleggio.importo)}</td>
                    <td className="py-3 px-2 whitespace-nowrap">{etichettaQuota(noleggio.quota)}</td>
                    <td className="py-3 px-2 text-right whitespace-nowrap">{formatImporto(noleggio.importoCalcolato)}</td>
                    <td className="py-3 px-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(noleggio)}
                        className="text-primary-600 hover:text-primary-700 mr-3"
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => setDeleteId(noleggio.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-medium bg-gray-50">
                  <td className="py-3 px-2" colSpan={3}>Totale periodo</td>
                  <td className="py-3 px-2 text-right whitespace-nowrap">{formatImporto(totali.importo)}</td>
                  <td className="py-3 px-2">-</td>
                  <td className="py-3 px-2 text-right whitespace-nowrap">{formatImporto(totali.calcolato)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Conferma eliminazione"
      >
        <p className="text-gray-600 mb-6">
          Sei sicuro di voler eliminare questo noleggio? L'operazione non può essere annullata.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteId(null)} className="btn-secondary" disabled={isDeleting}>
            Annulla
          </button>
          <button onClick={handleDelete} className="btn-danger" disabled={isDeleting}>
            {isDeleting ? 'Eliminazione...' : 'Elimina'}
          </button>
        </div>
      </Modal>
    </ResponsabileLayout>
  );
}
