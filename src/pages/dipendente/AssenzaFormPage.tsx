import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DipendenteLayout } from '../../components/DipendenteLayout';
import { DateTimeInput } from '../../components/DateTimeInput';
import { SceltaOpzioni } from '../../components/SceltaOpzioni';
import { tipiAssenzaApi, attivitaApi } from '../../api/client';
import { formatDuration, isAssenzaNegativa } from '../../utils/durata';
import { MAX_GIORNI_PERIODO, periodoLavorativo } from '../../utils/festivita';

interface TipoAssenza {
  id: number;
  nome: string;
}

/** Durata standard di una giornata di assenza, come in `backend/src/utils/assenze.ts`. */
const DURATA_GIORNATA = 8 * 60 + 12;

const GIORNI_SETTIMANA = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

/** `2026-11-03` -> `lun 03.11.2026` */
function giornoLeggibile(iso: string): string {
  const [anno, mese, giorno] = iso.split('-');
  const settimana = GIORNI_SETTIMANA[new Date(`${iso}T00:00:00Z`).getUTCDay()];
  return `${settimana} ${giorno}.${mese}.${anno}`;
}

const OPZIONI_PERIODO = [
  { valore: false, etichetta: 'Un giorno' },
  { valore: true, etichetta: 'Più giorni' },
];

export function AssenzaFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tipiAssenza, setTipiAssenza] = useState<TipoAssenza[]>([]);

  const oggi = new Date().toISOString().split('T')[0] || '';
  const [dataRiferimento, setDataRiferimento] = useState(oggi);
  const [assenzaId, setAssenzaId] = useState<number | null>(null);
  const [note, setNote] = useState('');

  // Più giorni: un'assenza per ogni giorno lavorativo del periodo
  const [piuGiorni, setPiuGiorni] = useState(false);
  const [dal, setDal] = useState(oggi);
  const [al, setAl] = useState(oggi);
  /** Giorni del periodo che hanno già un'assenza registrata, da non duplicare. */
  const [giaRegistrati, setGiaRegistrati] = useState<Set<string>>(new Set());
  const [ricarica, setRicarica] = useState(0);

  const tipoSelezionato = tipiAssenza.find((a) => a.id === assenzaId);
  const assenzaNegativa = tipoSelezionato
    ? isAssenzaNegativa(tipoSelezionato.nome)
    : false;

  const periodo = piuGiorni ? periodoLavorativo(dal, al) : null;
  const giorniDaRegistrare = periodo
    ? periodo.lavorativi.filter((g) => !giaRegistrati.has(g))
    : [];
  const giorniSaltati = periodo
    ? periodo.lavorativi.filter((g) => giaRegistrati.has(g))
    : [];

  useEffect(() => {
    const loadData = async () => {
      try {
        const assenzeRes = await tipiAssenzaApi.getAll();
        setTipiAssenza(assenzeRes.data);

        if (id) {
          const attivitaRes = await attivitaApi.getById(parseInt(id));
          const att = attivitaRes.data;

          // Not an absence: this belongs to the activity form
          if (!att.assenzaId) {
            navigate(`/dipendente/modifica/${id}`, { replace: true });
            return;
          }

          setDataRiferimento(att.dataRiferimento.split('T')[0]);
          setAssenzaId(att.assenzaId);
          setNote(att.note || '');
        }
      } catch (err) {
        setError('Errore nel caricamento dei dati');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  // Le assenze già presenti nel periodo, per non registrare due volte lo stesso giorno
  const periodoValido = piuGiorni && periodoLavorativo(dal, al) !== null;
  useEffect(() => {
    if (!periodoValido) {
      setGiaRegistrati(new Set());
      return;
    }

    // Una risposta arrivata dopo un cambio di date non deve sovrascrivere la nuova
    let attuale = true;
    attivitaApi
      .getMine(dal, al)
      .then((res) => {
        if (!attuale) return;
        const giorni = new Set<string>(
          (res.data as { assenzaId: number | null; dataRiferimento: string }[])
            .filter((a) => a.assenzaId)
            .map((a) => a.dataRiferimento.split('T')[0] ?? '')
        );
        setGiaRegistrati(giorni);
      })
      .catch(() => {
        if (attuale) setGiaRegistrati(new Set());
      });

    return () => {
      attuale = false;
    };
  }, [periodoValido, dal, al, ricarica]);

  const registraPeriodo = async () => {
    let registrati = 0;
    for (const giorno of giorniDaRegistrare) {
      try {
        await attivitaApi.create({
          dataRiferimento: giorno,
          assenzaId,
          clienteId: null,
          cantiereId: null,
          tipoAttivitaId: null,
          note: note.trim() || undefined,
        });
        registrati++;
      } catch (err: any) {
        const motivo = err.response?.data?.error || 'errore durante il salvataggio';
        setError(
          `Registrati ${registrati} giorni su ${giorniDaRegistrare.length}. ` +
          `Errore su ${giornoLeggibile(giorno)}: ${motivo}. ` +
          'Premendo di nuovo il pulsante si registrano solo i giorni mancanti.'
        );
        setRicarica((n) => n + 1);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assenzaId) {
      setError('Seleziona un tipo di assenza');
      return;
    }

    if (!isEditing && piuGiorni && giorniDaRegistrare.length === 0) {
      setError('Nel periodo scelto non c\'è nessun giorno lavorativo da registrare');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (isEditing && id) {
        // Omitting cliente, cantiere and orari keeps any historical value intact
        await attivitaApi.update(parseInt(id), {
          dataRiferimento,
          assenzaId,
          note: note.trim(),
        });
      } else if (piuGiorni) {
        if (!(await registraPeriodo())) return;
      } else {
        await attivitaApi.create({
          dataRiferimento,
          assenzaId,
          clienteId: null,
          cantiereId: null,
          tipoAttivitaId: null,
          note: note.trim() || undefined,
        });
      }

      navigate('/dipendente');
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

  const totalePeriodo = giorniDaRegistrare.length * DURATA_GIORNATA * (assenzaNegativa ? -1 : 1);

  return (
    <DipendenteLayout>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {isEditing ? 'Modifica Assenza' : 'Registra Assenza'}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {isEditing ? 'Modifica i dettagli dell\'assenza' : 'Registra una o più giornate di assenza'}
        </p>
      </div>

      <div className="card max-w-2xl">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Un giorno / più giorni: solo in creazione, la modifica tocca un giorno solo */}
          {!isEditing && (
            <SceltaOpzioni
              label="Durata"
              name="periodo"
              opzioni={OPZIONI_PERIODO}
              value={piuGiorni}
              onChange={(v) => {
                setPiuGiorni(v);
                setError(null);
              }}
            />
          )}

          {!piuGiorni ? (
            <div>
              <label htmlFor="data" className="label">Data</label>
              <DateTimeInput
                type="date"
                id="data"
                className="input"
                value={dataRiferimento}
                onChange={setDataRiferimento}
                required
              />
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dal" className="label">Dal</label>
                  <DateTimeInput
                    type="date"
                    id="dal"
                    className="input"
                    value={dal}
                    onChange={(v) => {
                      setDal(v);
                      // Un "al" rimasto prima del nuovo "dal" lo segue
                      if (v && al && al < v) setAl(v);
                    }}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="al" className="label">Al</label>
                  <DateTimeInput
                    type="date"
                    id="al"
                    className="input"
                    value={al}
                    onChange={setAl}
                    required
                  />
                </div>
              </div>

              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                {!periodo ? (
                  <p className="text-red-600">
                    {al < dal
                      ? 'La data "Al" non può precedere la data "Dal".'
                      : `Scegli un periodo valido (al massimo ${MAX_GIORNI_PERIODO} giorni).`}
                  </p>
                ) : (
                  <>
                    <p className="font-medium text-gray-900">
                      {giorniDaRegistrare.length === 0
                        ? 'Nessun giorno da registrare'
                        : giorniDaRegistrare.length === 1
                          ? 'Verrà registrato 1 giorno'
                          : `Verranno registrati ${giorniDaRegistrare.length} giorni`}
                      {giorniDaRegistrare.length > 0 && ` (totale ${formatDuration(totalePeriodo)})`}
                    </p>
                    <p className="text-gray-500 mt-1">
                      Ogni giorno vale 8h 12m. Sabati e domeniche
                      {periodo.weekend > 0 && ` (${periodo.weekend})`} vengono saltati
                      {periodo.festivi.length > 0
                        ? `, così come i festivi: ${periodo.festivi.map(giornoLeggibile).join(', ')}`
                        : ', così come i festivi'}
                      .
                    </p>
                    {giorniSaltati.length > 0 && (
                      <p className="text-amber-700 mt-1">
                        Già con un'assenza, quindi saltati: {giorniSaltati.map(giornoLeggibile).join(', ')}.
                      </p>
                    )}
                    {giorniDaRegistrare.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {giorniDaRegistrare.map((g) => (
                          <span
                            key={g}
                            className="px-2 py-0.5 rounded bg-white border border-gray-300 text-xs text-gray-700"
                          >
                            {giornoLeggibile(g)}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Tipo di assenza */}
          <div>
            <label htmlFor="assenza" className="label">Tipo di assenza</label>
            <select
              id="assenza"
              className="select"
              value={assenzaId ?? ''}
              onChange={(e) => setAssenzaId(e.target.value ? parseInt(e.target.value) : null)}
              required
            >
              <option value="">Seleziona assenza...</option>
              {tipiAssenza.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              {piuGiorni
                ? assenzaNegativa
                  ? 'Ogni giornata sottrae 8h 12m dal montante ore.'
                  : 'Ogni giornata viene conteggiata come 8h 12m.'
                : assenzaNegativa
                  ? 'La giornata sottrae 8h 12m dal montante ore.'
                  : 'La giornata viene conteggiata come 8h 12m.'}
            </p>
          </div>

          {/* Note */}
          <div>
            <label htmlFor="note" className="label">
              Note <span className="text-gray-400 font-normal">(opzionale)</span>
            </label>
            <textarea
              id="note"
              className="input"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Eventuali note sull'assenza..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/dipendente')}
              className="btn-secondary"
              disabled={isSaving}
            >
              Torna alle attività
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving || !assenzaId || (piuGiorni && giorniDaRegistrare.length === 0)}
            >
              {isSaving
                ? 'Salvataggio...'
                : isEditing
                  ? 'Salva modifiche'
                  : piuGiorni && giorniDaRegistrare.length > 1
                    ? `Registra ${giorniDaRegistrare.length} giorni`
                    : 'Registra assenza'}
            </button>
          </div>
        </form>
      </div>
    </DipendenteLayout>
  );
}
