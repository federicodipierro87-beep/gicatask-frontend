import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DipendenteLayout } from '../../components/DipendenteLayout';
import { SignaturePad } from '../../components/SignaturePad';
import { VociSelector, type VoceSelezionata } from '../../components/VociSelector';
import { useAuth } from '../../context/AuthContext';
import { bollettiniApi, cantieriApi, clientiApi, vociBollettinoApi } from '../../api/client';
import type { Cliente, Cantiere, VoceBollettino } from '../../types';

export function BollettinoFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [cantieri, setCantieri] = useState<Cantiere[]>([]);
  const [mezziDisponibili, setMezziDisponibili] = useState<VoceBollettino[]>([]);
  const [materialiDisponibili, setMaterialiDisponibili] = useState<VoceBollettino[]>([]);
  const [trasportiDisponibili, setTrasportiDisponibili] = useState<VoceBollettino[]>([]);

  const [dataRiferimento, setDataRiferimento] = useState(
    new Date().toISOString().split('T')[0] || ''
  );
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [cantiereId, setCantiereId] = useState<number | null>(null);
  const [attivita, setAttivita] = useState('');
  const [mezzi, setMezzi] = useState<VoceSelezionata[]>([]);
  const [materiali, setMateriali] = useState<VoceSelezionata[]>([]);
  const [trasporti, setTrasporti] = useState<VoceSelezionata[]>([]);
  const [numeroOperai, setNumeroOperai] = useState('1');
  const [ore, setOre] = useState('');

  const [firmaOperatoreNome, setFirmaOperatoreNome] = useState('');
  const [firmaOperatoreImg, setFirmaOperatoreImg] = useState<string | null>(null);
  const [firmaCommittenteNome, setFirmaCommittenteNome] = useState('');
  const [firmaCommittenteImg, setFirmaCommittenteImg] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientiRes, mezziRes, materialiRes, trasportiRes] = await Promise.all([
          clientiApi.getAll(),
          vociBollettinoApi.getAll('mezzi'),
          vociBollettinoApi.getAll('materiali'),
          vociBollettinoApi.getAll('trasporti'),
        ]);
        setClienti(clientiRes.data);
        setMezziDisponibili(mezziRes.data);
        setMaterialiDisponibili(materialiRes.data);
        setTrasportiDisponibili(trasportiRes.data);
      } catch {
        setError('Errore nel caricamento dei dati');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Il nome dell'operatore è quasi sempre il proprio: precompilarlo evita di
  // farlo scrivere in cantiere, resta comunque modificabile
  useEffect(() => {
    if (user && !firmaOperatoreNome) {
      setFirmaOperatoreNome(`${user.nome} ${user.cognome}`);
    }
  }, [user]);

  useEffect(() => {
    if (!clienteId) {
      setCantieri([]);
      setCantiereId(null);
      return;
    }

    const loadCantieri = async () => {
      setCantieri([]);
      try {
        const response = await cantieriApi.getByCliente(clienteId);
        setCantieri(response.data);

        // Con un solo cantiere la scelta è obbligata: selezionarlo da soli
        if (response.data.length === 1) {
          setCantiereId(response.data[0].id);
        } else {
          setCantiereId(null);
        }
      } catch {
        setError('Errore nel caricamento dei cantieri');
      }
    };

    loadCantieri();
  }, [clienteId]);

  const puoSalvare =
    Boolean(cantiereId) &&
    attivita.trim().length > 0 &&
    firmaOperatoreNome.trim().length > 0 &&
    firmaCommittenteNome.trim().length > 0 &&
    Boolean(firmaOperatoreImg) &&
    Boolean(firmaCommittenteImg);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cantiereId || !firmaOperatoreImg || !firmaCommittenteImg) {
      setError('Compila tutti i campi obbligatori e apponi entrambe le firme');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await bollettiniApi.create({
        cantiereId,
        dataRiferimento,
        attivita: attivita.trim(),
        numeroOperai: parseInt(numeroOperai, 10) || 0,
        ore: parseFloat(ore) || 0,
        mezzi,
        materiali,
        trasporti,
        firmaOperatoreNome: firmaOperatoreNome.trim(),
        firmaOperatoreImg,
        firmaCommittenteNome: firmaCommittenteNome.trim(),
        firmaCommittenteImg,
      });

      navigate('/dipendente/bollettini');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DipendenteLayout>
        <div className="card flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DipendenteLayout>
    );
  }

  return (
    <DipendenteLayout>
      <div className="card max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Nuovo Bollettino</h2>
        <p className="text-sm text-gray-600 mb-6">
          Una volta firmato il bollettino non è più modificabile.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="data" className="label">Data</label>
            <input
              type="date"
              id="data"
              className="input"
              value={dataRiferimento}
              onChange={(e) => setDataRiferimento(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="cliente" className="label">Cliente</label>
            <select
              id="cliente"
              className="input"
              value={clienteId ?? ''}
              onChange={(e) => setClienteId(e.target.value ? parseInt(e.target.value, 10) : null)}
            >
              <option value="">Seleziona...</option>
              {clienti.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cantiere" className="label">Cantiere</label>
            <select
              id="cantiere"
              className="input"
              value={cantiereId ?? ''}
              onChange={(e) => setCantiereId(e.target.value ? parseInt(e.target.value, 10) : null)}
              disabled={!clienteId}
            >
              <option value="">
                {clienteId ? 'Seleziona...' : 'Scegli prima un cliente'}
              </option>
              {cantieri.map((cantiere) => (
                <option key={cantiere.id} value={cantiere.id}>{cantiere.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="attivita" className="label">Attività svolte</label>
            <textarea
              id="attivita"
              className="input min-h-[8rem]"
              value={attivita}
              onChange={(e) => setAttivita(e.target.value)}
              maxLength={5000}
              placeholder="Descrivi i lavori eseguiti nella giornata"
            />
          </div>

          <VociSelector
            titolo="Mezzi"
            labelQuantita="Ore"
            voci={mezziDisponibili}
            value={mezzi}
            onChange={setMezzi}
            disabled={isSaving}
          />

          <VociSelector
            titolo="Materiali"
            labelQuantita="Quantità"
            voci={materialiDisponibili}
            value={materiali}
            onChange={setMateriali}
            disabled={isSaving}
          />

          <VociSelector
            titolo="Trasporti"
            labelQuantita="Viaggi"
            voci={trasportiDisponibili}
            value={trasporti}
            onChange={setTrasporti}
            disabled={isSaving}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="operai" className="label">Numero operai</label>
              <input
                type="number"
                id="operai"
                inputMode="numeric"
                min="0"
                max="999"
                className="input"
                value={numeroOperai}
                onChange={(e) => setNumeroOperai(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="ore" className="label">Ore (per operaio)</label>
              <input
                type="number"
                id="ore"
                inputMode="decimal"
                min="0"
                max="24"
                step="0.5"
                className="input"
                value={ore}
                onChange={(e) => setOre(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t pt-5 space-y-5">
            <div>
              <label htmlFor="nomeOperatore" className="label">Nome operatore</label>
              <input
                type="text"
                id="nomeOperatore"
                className="input"
                value={firmaOperatoreNome}
                onChange={(e) => setFirmaOperatoreNome(e.target.value)}
              />
              <div className="mt-2">
                <SignaturePad
                  label="Firma operatore"
                  value={firmaOperatoreImg}
                  onChange={setFirmaOperatoreImg}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div>
              <label htmlFor="nomeCommittente" className="label">Nome committente</label>
              <input
                type="text"
                id="nomeCommittente"
                className="input"
                value={firmaCommittenteNome}
                onChange={(e) => setFirmaCommittenteNome(e.target.value)}
              />
              <div className="mt-2">
                <SignaturePad
                  label="Firma committente"
                  value={firmaCommittenteImg}
                  onChange={setFirmaCommittenteImg}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/dipendente/bollettini')}
              className="btn-secondary"
              disabled={isSaving}
            >
              Annulla
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving || !puoSalvare}>
              {isSaving ? 'Salvataggio...' : 'Firma e salva'}
            </button>
          </div>
        </form>
      </div>
    </DipendenteLayout>
  );
}
