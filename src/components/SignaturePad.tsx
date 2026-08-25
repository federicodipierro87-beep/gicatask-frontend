import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  label: string;
  value: string | null;
  onChange: (base64: string | null) => void;
  disabled?: boolean;
}

type Punto = { x: number; y: number };

const LINE_WIDTH = 2;
const STROKE_COLOR = '#111827';

/**
 * Pad di firma disegnata a mano.
 *
 * I tratti vivono in un ref e non nello stato: ridisegnarli su ogni movimento
 * del dito farebbe rimontare il canvas a ogni punto. Lo stato serve solo a
 * sapere se c'è qualcosa di disegnato, per abilitare "Cancella".
 */
export function SignaturePad({ label, value, onChange, disabled = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trattiRef = useRef<Punto[][]>([]);
  const trattoCorrenteRef = useRef<Punto[] | null>(null);
  const [vuoto, setVuoto] = useState(true);

  // Assegnare width/height azzera il contesto: scala, spessore e colore vanno
  // riapplicati a ogni ridimensionamento, non una volta al mount
  const ridisegna = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Oltre 2x il PNG cresce senza che la firma diventi più leggibile
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = STROKE_COLOR;
    ctx.clearRect(0, 0, rect.width, rect.height);

    for (const tratto of trattiRef.current) {
      const inizio = tratto[0];
      if (!inizio) continue;

      ctx.beginPath();
      ctx.moveTo(inizio.x, inizio.y);

      if (tratto.length === 1) {
        // Un tocco singolo senza questo non lascerebbe alcun segno
        ctx.lineTo(inizio.x + 0.1, inizio.y);
      } else {
        for (const punto of tratto.slice(1)) {
          ctx.lineTo(punto.x, punto.y);
        }
      }

      ctx.stroke();
    }
  }, []);

  // Ruotando il telefono il canvas cambia dimensione: senza ridisegno i tratti
  // già tracciati sparirebbero a metà firma
  useEffect(() => {
    ridisegna();

    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => ridisegna());
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [ridisegna]);

  // Il genitore può azzerare la firma dopo un salvataggio
  useEffect(() => {
    if (value === null && trattiRef.current.length > 0) {
      trattiRef.current = [];
      setVuoto(true);
      ridisegna();
    }
  }, [value, ridisegna]);

  const puntoDaEvento = (e: React.PointerEvent<HTMLCanvasElement>): Punto => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const esporta = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (trattiRef.current.length === 0) {
      onChange(null);
      return;
    }

    // Solo base64 puro: il backend lo passa a Buffer.from(b64, 'base64')
    onChange(canvas.toDataURL('image/png').split(',')[1] ?? null);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;

    // Chiude correttamente un tratto che esce dal canvas
    e.currentTarget.setPointerCapture(e.pointerId);
    trattoCorrenteRef.current = [puntoDaEvento(e)];
    trattiRef.current.push(trattoCorrenteRef.current);
    setVuoto(false);
    ridisegna();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || !trattoCorrenteRef.current) return;

    trattoCorrenteRef.current.push(puntoDaEvento(e));
    ridisegna();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!trattoCorrenteRef.current) return;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    trattoCorrenteRef.current = null;
    esporta();
  };

  const handleClear = () => {
    trattiRef.current = [];
    trattoCorrenteRef.current = null;
    setVuoto(true);
    ridisegna();
    onChange(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="label mb-0">{label}</span>
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || vuoto}
          className="text-sm text-primary-600 hover:text-primary-700 disabled:text-gray-300"
        >
          Cancella
        </button>
      </div>

      <canvas
        ref={canvasRef}
        // Senza touchAction il dito scorre la pagina invece di disegnare:
        // sul telefono, che è il dispositivo di destinazione, il pad
        // risulterebbe semplicemente inutilizzabile
        style={{ touchAction: 'none' }}
        className={`w-full h-40 rounded-lg border bg-white ${
          disabled ? 'border-gray-200 opacity-60' : 'border-gray-300'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      {vuoto && (
        <p className="text-xs text-gray-500 mt-1">Firma qui sopra con il dito o con il mouse</p>
      )}
    </div>
  );
}
