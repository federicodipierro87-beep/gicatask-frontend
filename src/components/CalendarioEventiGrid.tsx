import { useEffect, useMemo, useRef } from 'react';
import { giorniAnno, NOMI_MESI } from '../utils/festivita';
import type { CalendarioEvento } from '../types';

type Pallino = 'consegna' | 'evento' | 'smontaggio';

const ORDINE_PALLINI: Pallino[] = ['consegna', 'evento', 'smontaggio'];

const COLORE_PALLINO: Record<Pallino, string> = {
  consegna: 'bg-red-600',
  evento: 'bg-black',
  smontaggio: 'bg-green-600',
};

/** Larghezza in px di una colonna giorno, usata anche per lo scroll al mese. */
const LARGHEZZA_GIORNO = 26;

interface Props {
  anno: number;
  eventi: CalendarioEvento[];
}

function nomeEvento(evento: CalendarioEvento): string {
  return evento.nome?.trim() || evento.cliente.nome;
}

/** Giorno di oggi nel calendario locale, non in UTC. */
function isoOggi(): string {
  const oggi = new Date();
  const mese = String(oggi.getMonth() + 1).padStart(2, '0');
  const giorno = String(oggi.getDate()).padStart(2, '0');
  return `${oggi.getFullYear()}-${mese}-${giorno}`;
}

/**
 * Pallini di un evento indicizzati per giorno. L'intervallo e' percorso
 * sommando 86.400.000 ms a partire da mezzanotte UTC: senza cambi di ora
 * legale di mezzo il passo di un giorno e' esatto.
 */
function palliniEvento(evento: CalendarioEvento): Map<string, Pallino[]> {
  const mappa = new Map<string, Pallino[]>();

  const aggiungi = (giorno: string, tipo: Pallino) => {
    const esistenti = mappa.get(giorno);
    if (esistenti) esistenti.push(tipo);
    else mappa.set(giorno, [tipo]);
  };

  const inizio = new Date(`${evento.dataInizio.slice(0, 10)}T00:00:00.000Z`);
  const fine = new Date(`${evento.dataFine.slice(0, 10)}T00:00:00.000Z`);

  for (let g = inizio; g <= fine; g = new Date(g.getTime() + 86_400_000)) {
    aggiungi(g.toISOString().slice(0, 10), 'evento');
  }

  if (evento.dataConsegna) aggiungi(evento.dataConsegna.slice(0, 10), 'consegna');
  if (evento.dataSmontaggio) aggiungi(evento.dataSmontaggio.slice(0, 10), 'smontaggio');

  return mappa;
}

export function CalendarioEventiGrid({ anno, eventi }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const giorni = useMemo(() => giorniAnno(anno), [anno]);

  // Il colspan dell'intestazione mensile: 28, 29, 30 o 31 a seconda del mese
  const mesi = useMemo(() => {
    return NOMI_MESI.map((nome, mese) => ({
      nome,
      mese,
      giorni: giorni.filter((g) => g.mese === mese).length,
      primoIndice: giorni.findIndex((g) => g.mese === mese),
    }));
  }, [giorni]);

  const pallini = useMemo(() => {
    const perEvento = new Map<number, Map<string, Pallino[]>>();
    eventi.forEach((evento) => perEvento.set(evento.id, palliniEvento(evento)));
    return perEvento;
  }, [eventi]);

  const oggi = isoOggi();

  const vaiAlGiorno = (indice: number) => {
    scrollRef.current?.scrollTo({ left: indice * LARGHEZZA_GIORNO, behavior: 'smooth' });
  };

  // Sull'anno corrente conviene partire da oggi: scorrere fino a novembre a
  // mano ogni volta che si apre la pagina non ha senso
  useEffect(() => {
    const indiceOggi = giorni.findIndex((g) => g.iso === oggi);
    if (indiceOggi < 0) return;
    scrollRef.current?.scrollTo({ left: indiceOggi * LARGHEZZA_GIORNO });
  }, [giorni, oggi]);

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-3">
        {mesi.map((mese) => (
          <button
            key={mese.mese}
            type="button"
            onClick={() => vaiAlGiorno(mese.primoIndice)}
            className="px-2 py-1 text-xs font-medium rounded border border-gray-200 text-gray-700 hover:bg-gray-100"
          >
            {mese.nome}
          </button>
        ))}
      </div>

      {/*
        border-separate e' obbligatorio: con border-collapse i bordi delle
        celle sticky vengono ridisegnati dal browser durante lo scroll e
        spariscono a intermittenza.
      */}
      <div
        ref={scrollRef}
        className="overflow-auto max-h-[70vh] border border-gray-200 rounded-lg"
      >
        <table className="border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th
                rowSpan={2}
                className="sticky left-0 top-0 z-30 w-[200px] min-w-[200px] max-w-[200px] bg-primary-700 text-white text-left font-medium px-2 border-b border-r border-primary-500"
              >
                Evento
              </th>
              {mesi.map((mese) => (
                <th
                  key={mese.mese}
                  colSpan={mese.giorni}
                  className="sticky top-0 z-20 h-[26px] bg-primary-700 text-white font-medium border-b border-r border-primary-500"
                >
                  {mese.nome}
                </th>
              ))}
            </tr>
            <tr>
              {giorni.map((giorno) => (
                <th
                  key={giorno.iso}
                  className={`sticky top-[26px] z-20 h-[26px] w-[26px] min-w-[26px] font-normal border-b border-r border-gray-300 ${
                    giorno.festivo
                      ? 'bg-red-500 text-white'
                      : giorno.weekend
                        ? 'bg-red-200 text-gray-800'
                        : 'bg-primary-600 text-white'
                  }`}
                  title={giorno.iso.split('-').reverse().join('/')}
                >
                  {giorno.numero}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {eventi.map((evento) => {
              const perGiorno = pallini.get(evento.id);

              return (
                <tr key={evento.id}>
                  <td className="sticky left-0 z-10 w-[200px] min-w-[200px] max-w-[200px] bg-white px-2 py-1 truncate border-b border-r border-gray-300">
                    {nomeEvento(evento)}
                  </td>
                  {giorni.map((giorno) => {
                    const tipi = perGiorno?.get(giorno.iso);

                    return (
                      <td
                        key={giorno.iso}
                        className={`h-[26px] w-[26px] min-w-[26px] border-b border-r border-gray-300 ${
                          giorno.festivo
                            ? 'bg-red-100'
                            : giorno.weekend
                              ? 'bg-red-50'
                              : 'bg-white'
                        } ${giorno.iso === oggi ? 'ring-1 ring-inset ring-primary-500' : ''}`}
                      >
                        {tipi && (
                          <div className="flex items-center justify-center gap-[1px]">
                            {ORDINE_PALLINI.filter((t) => tipi.includes(t)).map((tipo) => (
                              <span
                                key={tipo}
                                className={`w-[6px] h-[6px] rounded-full ${COLORE_PALLINO[tipo]}`}
                              />
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
