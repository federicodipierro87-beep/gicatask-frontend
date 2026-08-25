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
