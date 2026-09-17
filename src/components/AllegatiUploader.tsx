import { useRef, useState } from 'react';
import { bollettiniApi } from '../api/client';
import type { AllegatoBollettino } from '../types';

interface Props {
  value: AllegatoBollettino[];
  onChange: (allegati: AllegatoBollettino[]) => void;
  disabled?: boolean;
}

/** Stessa allowlist del server: qui serve solo a dare un errore più leggibile. */
const MIME_AMMESSI = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];

const MAX_FILE = 10;
const LATO_MAX = 1600;

/** Riga in corso di caricamento: vive solo finché l'upload non è concluso. */
interface InCorso {
  uid: string;
  nomeFile: string;
  dimensione: number;
  errore: string | null;
}

function formatPeso(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Ridimensiona una foto prima di spedirla. Una foto da 4 MB scende a ~300 KB,
 * che in cantiere è la differenza fra funzionare e no.
 *
 * I PDF passano intatti, e se la decodifica fallisce — HEIC su un browser che
 * non lo decodifica — si carica l'originale: il MIME è comunque nell'allowlist
 * del server.
 */
async function ridimensiona(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  try {
    const bitmap = await createImageBitmap(file);

    const scala = Math.min(1, LATO_MAX / Math.max(bitmap.width, bitmap.height));
    // Già piccola: ricomprimerla peggiorerebbe l'immagine senza guadagno
    if (scala === 1 && file.size <= 1024 * 1024) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scala);
    canvas.height = Math.round(bitmap.height * scala);

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.8)
    );

    if (!blob || blob.size >= file.size) return file;

    const nome = file.name.replace(/\.[^.]+$/, '') || 'foto';
    return new File([blob], `${nome}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

/**
 * Box degli allegati del bollettino.
 *
 * Ogni file parte in upload appena scelto, prima delle firme: un errore qui è
 * un errore ordinario, il bollettino non esiste ancora e non c'è niente da
 * rifirmare. È il motivo per cui il box sta sotto il campo e-mail e non dentro
 * il blocco delle firme.
 */
export function AllegatiUploader({ value, onChange, disabled = false }: Props) {
  const [inCorso, setInCorso] = useState<InCorso[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [rimuovendo, setRimuovendo] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const fotoRef = useRef<HTMLInputElement | null>(null);

  // `value` dentro una closure asincrona sarebbe quello del momento della
  // scelta: con più file in parallelo l'ultimo cancellerebbe i precedenti
  const valueRef = useRef(value);
  valueRef.current = value;

  const pieno = value.length + inCorso.length >= MAX_FILE;

  const caricaUno = async (file: File) => {
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    if (!MIME_AMMESSI.includes(file.type)) {
      setInCorso((prev) => [
        ...prev,
        { uid, nomeFile: file.name, dimensione: file.size, errore: 'Formato non ammesso' },
      ]);
      return;
    }

    setInCorso((prev) => [
      ...prev,
      { uid, nomeFile: file.name, dimensione: file.size, errore: null },
    ]);

    try {
      const pronto = await ridimensiona(file);
      const { data } = await bollettiniApi.uploadAllegato(pronto);

      onChange([...valueRef.current, data]);
      setInCorso((prev) => prev.filter((r) => r.uid !== uid));
    } catch (err: any) {
      const messaggio =
        err.response?.status === 503
          ? 'Gli allegati non sono disponibili'
          : err.response?.data?.error ?? 'Caricamento non riuscito';

      setInCorso((prev) =>
        prev.map((r) => (r.uid === uid ? { ...r, errore: messaggio } : r))
      );
    }
  };

  const handleScelta = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const scelti = Array.from(e.target.files ?? []);
    // Lo stesso file scelto due volte di seguito non scatenerebbe un change
    e.target.value = '';

    if (scelti.length === 0) return;

    const spazio = MAX_FILE - valueRef.current.length - inCorso.length;
    setErrore(scelti.length > spazio ? `Massimo ${MAX_FILE} allegati` : null);

    // In sequenza: dieci upload insieme da una connessione di cantiere si
    // ostacolano a vicenda
    for (const file of scelti.slice(0, Math.max(spazio, 0))) {
      await caricaUno(file);
    }
  };

  const handleRimuovi = async (id: number) => {
    setRimuovendo(id);
    try {
      await bollettiniApi.deleteAllegato(id);
      onChange(valueRef.current.filter((a) => a.id !== id));
      setErrore(null);
    } catch {
      setErrore('Impossibile rimuovere l\'allegato');
    } finally {
      setRimuovendo(null);
    }
  };

  return (
    <div>
      <span className="label">
        Allegati <span className="text-gray-400 font-normal">(facoltativi)</span>
      </span>

      <div className="flex flex-wrap gap-3 mt-1">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf"
          multiple
          onChange={handleScelta}
        />
        <button
          type="button"
          className="btn-secondary"
          disabled={disabled || pieno}
          title={pieno ? `Massimo ${MAX_FILE} allegati` : undefined}
          onClick={() => fileRef.current?.click()}
        >
          Scegli file
        </button>

        <input
          ref={fotoRef}
          type="file"
          className="hidden"
          accept="image/*"
          // Da telefono apre la fotocamera; da desktop viene ignorato e si apre
          // il solito selettore, che è innocuo
          capture="environment"
          onChange={handleScelta}
        />
        <button
          type="button"
          className="btn-secondary"
          disabled={disabled || pieno}
          title={pieno ? `Massimo ${MAX_FILE} allegati` : undefined}
          onClick={() => fotoRef.current?.click()}
        >
          Scatta foto
        </button>
      </div>

      <p className="mt-1 text-xs text-gray-500">
        Immagini o PDF, fino a {MAX_FILE} file. Vengono inviati insieme al bollettino.
      </p>

      {errore && <p className="mt-1 text-xs text-amber-700">{errore}</p>}

      {(value.length > 0 || inCorso.length > 0) && (
        <ul className="mt-3 space-y-2">
          {value.map((allegato) => (
            <li
              key={allegato.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2"
            >
              <span className="min-w-0 text-sm text-gray-700 truncate">
                <span className="text-green-600 mr-2">✓</span>
                {allegato.nomeFile}
                <span className="text-gray-400 ml-2">{formatPeso(allegato.dimensione)}</span>
              </span>
              <button
                type="button"
                onClick={() => handleRimuovi(allegato.id)}
                disabled={disabled || rimuovendo === allegato.id}
                className="text-red-600 hover:text-red-700 text-sm disabled:text-gray-300"
                aria-label={`Rimuovi ${allegato.nomeFile}`}
              >
                ✕
              </button>
            </li>
          ))}

          {inCorso.map((riga) => (
            <li
              key={riga.uid}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2"
            >
              <span className="min-w-0 text-sm text-gray-700 truncate">
                {riga.errore ? (
                  <span className="text-red-600 mr-2">!</span>
                ) : (
                  <span className="inline-block align-middle animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600 mr-2" />
                )}
                {riga.nomeFile}
                <span className="text-gray-400 ml-2">{formatPeso(riga.dimensione)}</span>
                {riga.errore && (
                  <span className="text-red-600 ml-2">{riga.errore}</span>
                )}
              </span>
              {riga.errore && (
                <button
                  type="button"
                  onClick={() => setInCorso((prev) => prev.filter((r) => r.uid !== riga.uid))}
                  className="text-red-600 hover:text-red-700 text-sm"
                  aria-label={`Togli ${riga.nomeFile}`}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
