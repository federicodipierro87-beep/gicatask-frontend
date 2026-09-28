import { useEffect, useRef, useState } from 'react';
import { hrApi } from '../api/client';
import { ridimensiona } from './AllegatiUploader';
import type { AllegatoHr } from '../types';

interface Props {
  value: AllegatoHr | null;
  onChange: (foto: AllegatoHr | null) => void;
}

const MIME_AMMESSI = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/**
 * Foto del dipendente nella scheda HR. Si carica subito, come le foto dei
 * tesserini, e si collega alla scheda solo al salvataggio: "Rimuovi" la toglie
 * dal form senza chiamare il server.
 *
 * L'anteprima passa da un blob e non da un <img src> sull'API: il file vuole
 * il token Bearer, che un <img> non manda.
 */
export function FotoDipendente({ value, onChange }: Props) {
  const [anteprima, setAnteprima] = useState<string | null>(null);
  const [caricando, setCaricando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const fotoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!value) {
      setAnteprima(null);
      return;
    }

    let url: string | null = null;
    let annullato = false;

    hrApi
      .getFotoBlob(value.id)
      .then(({ data }) => {
        if (annullato) return;
        url = URL.createObjectURL(data);
        setAnteprima(url);
      })
      .catch(() => !annullato && setAnteprima(null));

    return () => {
      annullato = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [value?.id]);

  const handleScelta = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!MIME_AMMESSI.includes(file.type)) {
      setErrore('Formato non ammesso: scegli un\'immagine');
      return;
    }

    setCaricando(true);
    setErrore(null);
    try {
      const { data } = await hrApi.uploadFoto(await ridimensiona(file));
      onChange(data);
    } catch (err: any) {
      setErrore(
        err.response?.status === 503
          ? 'Il caricamento delle foto non è disponibile'
          : err.response?.data?.error ?? 'Caricamento non riuscito'
      );
    } finally {
      setCaricando(false);
    }
  };

  return (
    <div className="flex items-start gap-4">
      <div className="w-24 h-32 flex-shrink-0 rounded-lg border border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center">
        {caricando ? (
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
        ) : anteprima ? (
          <img src={anteprima} alt="Foto del dipendente" className="w-full h-full object-cover" />
        ) : value ? (
          <span className="text-xs text-gray-400 text-center px-1">{value.nomeFile}</span>
        ) : (
          <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )}
      </div>

      <div className="space-y-2">
        <span className="label">Foto del dipendente</span>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleScelta} />
          <button type="button" className="btn-secondary" disabled={caricando} onClick={() => fileRef.current?.click()}>
            {value ? 'Cambia foto' : 'Scegli foto'}
          </button>

          <input
            ref={fotoRef}
            type="file"
            className="hidden"
            accept="image/*"
            // Da telefono apre la fotocamera posteriore: la foto la scatta
            // chi compila la scheda
            capture="environment"
            onChange={handleScelta}
          />
          <button type="button" className="btn-secondary" disabled={caricando} onClick={() => fotoRef.current?.click()}>
            Scatta foto
          </button>

          {value && (
            <button
              type="button"
              className="text-red-600 hover:text-red-700 text-sm px-2"
              disabled={caricando}
              onClick={() => onChange(null)}
            >
              Rimuovi
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">Si salva insieme alla scheda.</p>
        {errore && <p className="text-xs text-red-600">{errore}</p>}
      </div>
    </div>
  );
}
