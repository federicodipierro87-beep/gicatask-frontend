export type Ruolo = 'DIPENDENTE' | 'RESPONSABILE';

export interface User {
  id: number;
  nome: string;
  cognome: string;
  ruolo: Ruolo;
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
  isGenerico: boolean;
  attivo: boolean;
}

export interface TipoAttivita {
  id: number;
  cantiereId: number;
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
  clienteId: number;
  cantiereId: number;
  tipoAttivitaId: number;
  note?: string;
  createdById: number;
  createdAt: string;
  updatedAt: string;
}
