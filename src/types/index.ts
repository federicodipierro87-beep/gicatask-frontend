export type Ruolo = 'DIPENDENTE' | 'RESPONSABILE';

export interface User {
  id: number;
  nome: string;
  cognome: string;
  ruolo: Ruolo;
  abilitatoBollettini: boolean;
}

export interface UserListItem {
  id: number;
  nome: string;
  cognome: string;
}

export interface LoginResponse {
  user: User;
}

export interface CheckPasswordResponse {
  hasPassword: boolean;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

export interface Cliente {
  id: number;
  nome: string;
  attivo: boolean;
}

export interface Cantiere {
  id: number;
  clienteId: number;
  nome: string;
  attivo: boolean;
}

export interface TipoAttivita {
  id: number;
  cantiereId: number;
  nome: string;
  attivo: boolean;
}

export interface TipoAssenza {
  id: number;
  nome: string;
  attivo: boolean;
}

export interface Attivita {
  id: number;
  utenteId: number;
  dataRiferimento: string;
  oraInizio: string;
  oraFine: string;
  durataMinuti: number;
  clienteId?: number | null;
  cantiereId?: number | null;
  tipoAttivitaId?: number | null;
  assenzaId?: number | null;
  note?: string;
  createdById: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Le date arrivano dal backend come stringhe ISO complete, ma rappresentano
 * giorni: vanno lette con `slice(0, 10)` e mai convertite in `Date` locale,
 * che in Europe/Rome sposterebbe la mezzanotte UTC al giorno precedente.
 */
export interface CalendarioEvento {
  id: number;
  clienteId: number;
  nome: string | null;
  dataInizio: string;
  dataFine: string;
  dataConsegna: string | null;
  dataSmontaggio: string | null;
  importo: number | null;
  cliente: { id: number; nome: string };
}

/** Le date sono `YYYY-MM-DD`, il formato nativo degli input di tipo date. */
export interface CalendarioEventoInput {
  clienteId: number;
  nome?: string | null;
  dataInizio: string;
  dataFine: string;
  dataConsegna?: string | null;
  dataSmontaggio?: string | null;
  importo?: number | null;
}

/** Quota del noleggio: 70/30 trattiene il 70% dell'importo, 100 lo lascia intero. */
export type QuotaNoleggio = 'SETTANTA_TRENTA' | 'CENTO';

export interface DreamVeicolo {
  id: number;
  nome: string;
  attivo: boolean;
}

/** `data` e' una ISO completa che vale come giorno: si legge con `slice(0, 10)`. */
export interface DreamNoleggio {
  id: number;
  veicoloId: number;
  data: string;
  osservazioni: string | null;
  importo: number;
  quota: QuotaNoleggio;
  importoCalcolato: number;
  veicolo: { id: number; nome: string };
}

/**
 * `importoCalcolato` non compare: lo ricava il server dall'importo e dalla
 * quota, il form ne mostra solo un'anteprima.
 */
export interface DreamNoleggioInput {
  veicoloId: number;
  data: string;
  osservazioni?: string | null;
  importo: number;
  quota: QuotaNoleggio;
}

export type TipoVoce = 'MEZZO' | 'MATERIALE' | 'TRASPORTO';

/** Slug usato nelle URL dell'anagrafica voci. */
export type TipoVoceSlug = 'mezzi' | 'materiali' | 'trasporti';

export interface VoceBollettino {
  id: number;
  tipo: TipoVoce;
  nome: string;
  attivo: boolean;
}

export interface RigaBollettino {
  id: number;
  tipo: TipoVoce;
  voceId: number | null;
  descrizione: string;
  quantita: number;
}

/**
 * Le firme non compaiono qui: il backend le esclude dagli elenchi e dal
 * dettaglio, perché servono solo a generare il PDF lato server.
 */
export interface Bollettino {
  id: number;
  utenteId: number;
  cantiereId: number;
  dataRiferimento: string;
  attivita: string;
  numeroOperai: number;
  ore: number;
  clienteNome: string;
  cantiereNome: string;
  firmaOperatoreNome: string;
  firmaCommittenteNome: string;
  createdAt: string;
  utente: { id: number; nome: string; cognome: string };
  righe?: RigaBollettino[];
}
