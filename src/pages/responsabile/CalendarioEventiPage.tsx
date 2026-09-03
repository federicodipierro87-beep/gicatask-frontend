import { useEffect, useRef, useState } from 'react';
import { ResponsabileLayout } from '../../components/ResponsabileLayout';
import { Modal } from '../../components/Modal';
import { CalendarioEventiGrid } from '../../components/CalendarioEventiGrid';
import { calendarioEventiApi, clientiApi } from '../../api/client';
import type { CalendarioEvento, CalendarioEventoInput, Cliente } from '../../types';

interface FormState {
  clienteId: string;
  nome: string;
  dataInizio: string;
  dataFine: string;
  dataConsegna: string;
  dataSmontaggio: string;
  importo: string;
}

const FORM_VUOTO: FormState = {
  clienteId: '',
  nome: '',
  dataInizio: '',
  dataFine: '',
  dataConsegna: '',
  dataSmontaggio: '',
  importo: '',
};

/**
 * Le date del backend sono ISO complete ma valgono come giorni: passarle a
 * `new Date()` e poi a `toLocaleDateString()` le sposterebbe al giorno prima
 * in tutti i fusi a est di Greenwich.
 */
function formatData(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10).split('-').reverse().join('/');
}

function formatImporto(importo: number | null): string {
  if (importo === null) return '';
  return importo.toLocaleString('it-CH', { maximumFractionDigits: 0 });
}

function nomeEvento(evento: CalendarioEvento): string {
  return evento.nome?.trim() || evento.cliente.nome;
}

interface CampoDataProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

/**
 * Campo data che si lascia sia digitare sia scegliere dal calendario.
 *
 * `index.css` nasconde l'icona nativa su tutti gli input date, quindi senza
 * un'icona propria il calendario non sarebbe raggiungibile col mouse. Il
 * picker si apre solo dal bottone e non da un onClick sull'input: aprirlo a
 * ogni click sul campo, come fa DateTimeInput, impedirebbe di posizionare il
 * cursore per scrivere la data a mano.
 */
function CampoData({ id, label, value, onChange, required = false, className }: CampoDataProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const apriCalendario = () => {
    inputRef.current?.focus();
    // showPicker manca sui browser piu' vecchi: li' resta la digitazione
    inputRef.current?.showPicker?.();
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="date"
          className="input pr-10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
        <button
          type="button"
          onClick={apriCalendario}
          // Fuori dal giro di TAB: si tabula fra i campi, non fra le icone
          tabIndex={-1}
          aria-label={`Apri il calendario: ${label}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function CalendarioEventiPage() {
  const annoCorrente = new Date().getFullYear();

  const [anno, setAnno] = useState(annoCorrente);
  const [anni, setAnni] = useState<number[]>([annoCorrente, annoCorrente + 1]);
  const [eventi, setEventi] = useState<CalendarioEvento[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
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
        const [clientiRes, anniRes] = await Promise.all([
          clientiApi.getAll(),
          calendarioEventiApi.getAnni(),
        ]);
        setClienti(Array.isArray(clientiRes.data) ? clientiRes.data : []);
        if (Array.isArray(anniRes.data) && anniRes.data.length > 0) {
          setAnni(anniRes.data);
        }
      } catch {
        setError('Errore nel caricamento di clienti e anni');
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const response = await calendarioEventiApi.getAll(anno);
        if (cancelled) return;
        setEventi(Array.isArray(response.data) ? response.data : []);
      } catch {
        if (cancelled) return;
        setEventi([]);
        setError('Errore nel caricamento degli eventi');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [anno, refreshToken]);

  const resetForm = () => {
    setForm(FORM_VUOTO);
    setEditId(null);
  };

  const handleEdit = (evento: CalendarioEvento) => {
    setEditId(evento.id);
    setForm({
      clienteId: String(evento.clienteId),
      nome: evento.nome ?? '',
      dataInizio: evento.dataInizio.slice(0, 10),
      dataFine: evento.dataFine.slice(0, 10),
      dataConsegna: evento.dataConsegna?.slice(0, 10) ?? '',
      dataSmontaggio: evento.dataSmontaggio?.slice(0, 10) ?? '',
      importo: evento.importo !== null ? String(evento.importo) : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.clienteId || !form.dataInizio || !form.dataFine) {
      setError('Cliente, data di inizio e data di fine sono obbligatori');
      return;
    }

    // Stesso controllo del backend, ma qui evita un giro di rete inutile
    if (form.dataFine < form.dataInizio) {
      setError('La data di fine non può precedere la data di inizio');
      return;
    }

    const payload: CalendarioEventoInput = {
      clienteId: parseInt(form.clienteId, 10),
      nome: form.nome.trim() || null,
      dataInizio: form.dataInizio,
      dataFine: form.dataFine,
      dataConsegna: form.dataConsegna || null,
      dataSmontaggio: form.dataSmontaggio || null,
      importo: form.importo ? parseFloat(form.importo) : null,
    };

    setIsSaving(true);
    try {
      if (editId !== null) await calendarioEventiApi.update(editId, payload);
      else await calendarioEventiApi.create(payload);

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
      await calendarioEventiApi.delete(deleteId);
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
      await calendarioEventiApi.exportExcel(anno);
    } catch {
      setError('Errore durante l\'esportazione del report');
    } finally {
      setIsExporting(false);
    }
  };

  // Un cliente disattivato dopo la creazione dell'evento non torna dalla lista
  // dei clienti attivi: senza questa aggiunta la select si svuoterebbe in modifica
  const eventoInModifica = eventi.find((ev) => ev.id === editId);
  const opzioniClienti =
    eventoInModifica && !clienti.some((c) => c.id === eventoInModifica.clienteId)
      ? [...clienti, { ...eventoInModifica.cliente, attivo: false }]
      : clienti;

  return (
    <ResponsabileLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Calendari Eventi</h2>
          <p className="text-sm text-gray-600 mt-1">
            Pianifica gli eventi dell'anno ed esporta il calendario in Excel
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label htmlFor="anno" className="label">Anno</label>
            <select
              id="anno"
              className="select"
              value={anno}
              onChange={(e) => setAnno(parseInt(e.target.value, 10))}
            >
              {anni.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting || eventi.length === 0}
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
        </div>
      )}

      {/* Il form sta in una card e non in un Modal: sette campi in max-w-md
          starebbero tutti incolonnati */}
      <form onSubmit={handleSubmit} className="card mb-6">
        <h3 className="font-medium text-gray-900 mb-4">
          {editId !== null ? 'Modifica evento' : 'Nuovo evento'}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="cliente" className="label">Cliente *</label>
            <select
              id="cliente"
              className="select"
              value={form.clienteId}
              onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
              required
            >
              <option value="">Seleziona cliente</option>
              {opzioniClienti.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="nome" className="label">Nome evento</label>
            <input
              id="nome"
              type="text"
              className="input"
              placeholder="Se vuoto usa il nome del cliente"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="importo" className="label">Importo</label>
            <input
              id="importo"
              type="number"
              step="0.01"
              className="input"
              value={form.importo}
              onChange={(e) => setForm({ ...form, importo: e.target.value })}
            />
          </div>
          <CampoData
            id="dataInizio"
            label="Dal *"
            value={form.dataInizio}
            onChange={(dataInizio) => setForm({ ...form, dataInizio })}
            required
          />
          <CampoData
            id="dataFine"
            label="Al *"
            value={form.dataFine}
            onChange={(dataFine) => setForm({ ...form, dataFine })}
            required
          />
          {/* col-start-1: consegna apre una riga nuova, cosi' restano
              affiancate a smontaggio sia a 2 sia a 3 colonne */}
          <CampoData
            id="dataConsegna"
            label="Data consegna"
            className="sm:col-start-1"
            value={form.dataConsegna}
            onChange={(dataConsegna) => setForm({ ...form, dataConsegna })}
          />
          <CampoData
            id="dataSmontaggio"
            label="Data smontaggio"
            value={form.dataSmontaggio}
            onChange={(dataSmontaggio) => setForm({ ...form, dataSmontaggio })}
          />
        </div>

        <div className="flex gap-3 mt-4 pt-4 border-t">
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Salvataggio...' : editId !== null ? 'Salva modifiche' : 'Aggiungi evento'}
          </button>
          {editId !== null && (
            <button type="button" onClick={resetForm} className="btn-secondary" disabled={isSaving}>
              Annulla
            </button>
          )}
        </div>
      </form>

      <div className="card mb-6">
        <h3 className="font-medium text-gray-900 mb-4">
          Eventi {anno}
          {!isLoading && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({eventi.length} {eventi.length === 1 ? 'evento' : 'eventi'})
            </span>
          )}
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : eventi.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nessun evento per il {anno}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Evento</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Cliente</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Dal</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Al</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Consegna</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Smontaggio</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Importo</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {eventi.map((evento) => (
                  <tr key={evento.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">{nomeEvento(evento)}</td>
                    <td className="py-3 px-2 text-gray-600">{evento.cliente.nome}</td>
                    <td className="py-3 px-2 whitespace-nowrap">{formatData(evento.dataInizio)}</td>
                    <td className="py-3 px-2 whitespace-nowrap">{formatData(evento.dataFine)}</td>
                    <td className="py-3 px-2 whitespace-nowrap">{formatData(evento.dataConsegna)}</td>
                    <td className="py-3 px-2 whitespace-nowrap">{formatData(evento.dataSmontaggio)}</td>
                    <td className="py-3 px-2 text-right whitespace-nowrap">{formatImporto(evento.importo)}</td>
                    <td className="py-3 px-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(evento)}
                        className="text-primary-600 hover:text-primary-700 mr-3"
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => setDeleteId(evento.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <h3 className="font-medium text-gray-900">Calendario {anno}</h3>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="w-[8px] h-[8px] rounded-full bg-black" /> giorni evento
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-[8px] h-[8px] rounded-full bg-red-600" /> consegna
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-[8px] h-[8px] rounded-full bg-green-600" /> smontaggio
            </span>
          </div>
        </div>

        <CalendarioEventiGrid anno={anno} eventi={eventi} />
      </div>

      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Conferma eliminazione"
      >
        <p className="text-gray-600 mb-6">
          Sei sicuro di voler eliminare questo evento? L'operazione non può essere annullata.
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
