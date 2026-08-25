import axios, { AxiosError } from 'axios';
import type { ApiError, Bollettino, TipoVoceSlug, VoceBollettino } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'gicatask_token';

// Token management
export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  remove: () => localStorage.removeItem(TOKEN_KEY),
};

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

// Request interceptor to add Authorization header and cache busting
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add timestamp to bust browser cache
    config.params = {
      ...config.params,
      _t: Date.now(),
    };
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    // Don't auto-redirect on 401 - let the app handle auth state
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  getUsers: () =>
    apiClient.get<{ id: number; nome: string; cognome: string }[]>('/auth/users'),

  checkPassword: (userId: number) =>
    apiClient.get<{ hasPassword: boolean }>(`/auth/check-password/${userId}`),

  login: (utenteId: number, password?: string) =>
    apiClient.post<{
      token: string;
      user: { id: number; nome: string; cognome: string; ruolo: string; abilitatoBollettini: boolean };
    }>('/auth/login', { utenteId, password }),

  logout: () =>
    apiClient.post('/auth/logout'),

  getMe: () =>
    apiClient.get<{
      user: { id: number; nome: string; cognome: string; ruolo: string; abilitatoBollettini: boolean };
    }>('/auth/me'),
};

// Clienti API
export const clientiApi = {
  getAll: (includeInactive = false) =>
    apiClient.get(`/clienti${includeInactive ? '?includeInactive=true' : ''}`),
  getById: (id: number) =>
    apiClient.get(`/clienti/${id}`),
  create: (nome: string) =>
    apiClient.post('/clienti', { nome }),
  update: (id: number, nome: string) =>
    apiClient.put(`/clienti/${id}`, { nome }),
  delete: (id: number) =>
    apiClient.delete(`/clienti/${id}`),
  activate: (id: number) =>
    apiClient.post(`/clienti/${id}/activate`),
};

// Cantieri API
export const cantieriApi = {
  getAll: (includeInactive = false) =>
    apiClient.get(`/cantieri${includeInactive ? '?includeInactive=true' : ''}`),
  getByCliente: (clienteId: number, includeInactive = false) =>
    apiClient.get(`/cantieri/cliente/${clienteId}${includeInactive ? '?includeInactive=true' : ''}`),
  getById: (id: number) =>
    apiClient.get(`/cantieri/${id}`),
  create: (clienteId: number, nome: string) =>
    apiClient.post('/cantieri', { clienteId, nome }),
  update: (id: number, nome: string) =>
    apiClient.put(`/cantieri/${id}`, { nome }),
  delete: (id: number) =>
    apiClient.delete(`/cantieri/${id}`),
  activate: (id: number) =>
    apiClient.post(`/cantieri/${id}/activate`),
};

// Tipi Attività API
export const tipiAttivitaApi = {
  getAll: (includeInactive = false) =>
    apiClient.get(`/tipi-attivita${includeInactive ? '?includeInactive=true' : ''}`),
  getById: (id: number) =>
    apiClient.get(`/tipi-attivita/${id}`),
  create: (nome: string) =>
    apiClient.post('/tipi-attivita', { nome }),
  update: (id: number, nome: string) =>
    apiClient.put(`/tipi-attivita/${id}`, { nome }),
  delete: (id: number) =>
    apiClient.delete(`/tipi-attivita/${id}`),
  activate: (id: number) =>
    apiClient.post(`/tipi-attivita/${id}/activate`),
};

// Tipi Assenza API
export const tipiAssenzaApi = {
  getAll: (includeInactive = false) =>
    apiClient.get(`/tipi-assenza${includeInactive ? '?includeInactive=true' : ''}`),
  getById: (id: number) =>
    apiClient.get(`/tipi-assenza/${id}`),
  create: (nome: string) =>
    apiClient.post('/tipi-assenza', { nome }),
  update: (id: number, nome: string) =>
    apiClient.put(`/tipi-assenza/${id}`, { nome }),
  delete: (id: number) =>
    apiClient.delete(`/tipi-assenza/${id}`),
  activate: (id: number) =>
    apiClient.post(`/tipi-assenza/${id}/activate`),
};

// Attività API
export const attivitaApi = {
  getAll: (filters?: { utenteId?: number; clienteId?: number; cantiereId?: number; startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    if (filters?.utenteId) params.append('utenteId', filters.utenteId.toString());
    if (filters?.clienteId) params.append('clienteId', filters.clienteId.toString());
    if (filters?.cantiereId) params.append('cantiereId', filters.cantiereId.toString());
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    return apiClient.get(`/attivita${params.toString() ? '?' + params.toString() : ''}`);
  },
  getMine: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return apiClient.get(`/attivita/me${params.toString() ? '?' + params.toString() : ''}`);
  },
  getById: (id: number) =>
    apiClient.get(`/attivita/${id}`),
  create: (data: {
    utenteId?: number;
    dataRiferimento: string;
    oraInizioMattino?: string;
    oraFineMattino?: string;
    oraInizioPomeriggio?: string;
    oraFinePomeriggio?: string;
    clienteId?: number | null;
    cantiereId?: number | null;
    tipoAttivitaId?: number | null;
    assenzaId?: number | null;
    note?: string;
  }) => apiClient.post('/attivita', data),
  update: (id: number, data: {
    utenteId?: number;
    dataRiferimento?: string;
    oraInizioMattino?: string;
    oraFineMattino?: string;
    oraInizioPomeriggio?: string;
    oraFinePomeriggio?: string;
    clienteId?: number | null;
    cantiereId?: number | null;
    tipoAttivitaId?: number | null;
    assenzaId?: number | null;
    note?: string;
  }) => apiClient.put(`/attivita/${id}`, data),
  delete: (id: number) =>
    apiClient.delete(`/attivita/${id}`),
};

// Backup API
export const backupApi = {
  getStatus: () =>
    apiClient.get<{
      configured: boolean;
      lastBackup: { date: string; stato: string } | null;
      totalBackups: number;
      config?: { accountId: string; bucket: string };
    }>('/backup/status'),
  testConnection: () =>
    apiClient.get<{ success: boolean; message: string }>('/backup/test'),
  getAll: () =>
    apiClient.get<{
      id: number;
      filename: string;
      tipo: string;
      dimensione: number;
      dimensioneFormatted: string;
      stato: string;
      createdAt: string;
    }[]>('/backup'),
  create: () =>
    apiClient.post<{ id: number; filename: string }>('/backup'),
  restore: (id: number) =>
    apiClient.post<{ restored: boolean; stats: Record<string, number> }>(`/backup/${id}/restore`),
  delete: (id: number) =>
    apiClient.delete(`/backup/${id}`),
};

// Utenti API
export const utentiApi = {
  getAll: (includeInactive = false) =>
    apiClient.get(`/utenti${includeInactive ? '?includeInactive=true' : ''}`),
  getById: (id: number) =>
    apiClient.get(`/utenti/${id}`),
  create: (data: { nome: string; cognome: string; ruolo: string; password?: string }) =>
    apiClient.post('/utenti', data),
  update: (
    id: number,
    data: { nome?: string; cognome?: string; ruolo?: string; abilitatoBollettini?: boolean }
  ) => apiClient.put(`/utenti/${id}`, data),
  setPassword: (id: number, password: string | null) =>
    apiClient.post(`/utenti/${id}/password`, { password }),
  delete: (id: number) =>
    apiClient.delete(`/utenti/${id}`),
  activate: (id: number) =>
    apiClient.post(`/utenti/${id}/activate`),
};

// Anagrafica voci bollettino (mezzi / materiali / trasporti)
export const vociBollettinoApi = {
  getAll: (tipo: TipoVoceSlug, includeInactive = false) =>
    apiClient.get<VoceBollettino[]>(
      `/voci-bollettino/${tipo}${includeInactive ? '?includeInactive=true' : ''}`
    ),
  create: (tipo: TipoVoceSlug, nome: string) =>
    apiClient.post<VoceBollettino>(`/voci-bollettino/${tipo}`, { nome }),
  update: (id: number, nome: string) =>
    apiClient.put<VoceBollettino>(`/voci-bollettino/${id}`, { nome }),
  delete: (id: number) =>
    apiClient.delete(`/voci-bollettino/${id}`),
  activate: (id: number) =>
    apiClient.post<VoceBollettino>(`/voci-bollettino/${id}/activate`),
};

export interface BollettinoFilters {
  utenteId?: number;
  clienteId?: number;
  cantiereId?: number;
  startDate?: string;
  endDate?: string;
}

export interface RigaBollettinoInput {
  voceId: number;
  quantita: number;
}

export interface CreateBollettinoInput {
  cantiereId: number;
  dataRiferimento: string;
  attivita: string;
  numeroOperai: number;
  ore: number;
  mezzi: RigaBollettinoInput[];
  materiali: RigaBollettinoInput[];
  trasporti: RigaBollettinoInput[];
  firmaOperatoreNome: string;
  firmaOperatoreImg: string;
  firmaCommittenteNome: string;
  firmaCommittenteImg: string;
}

function bollettinoParams(filters?: BollettinoFilters): string {
  const params = new URLSearchParams();
  if (filters?.utenteId) params.append('utenteId', String(filters.utenteId));
  if (filters?.clienteId) params.append('clienteId', String(filters.clienteId));
  if (filters?.cantiereId) params.append('cantiereId', String(filters.cantiereId));
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  return params.toString() ? `?${params.toString()}` : '';
}

/**
 * I PDF passano da apiClient e non da fetch: il token Bearer è aggiunto
 * dall'interceptor axios, mentre una fetch nuda si autenticherebbe con il solo
 * cookie SameSite=None, che Safari limita.
 */
async function downloadPdf(url: string, filename: string): Promise<void> {
  const response = await apiClient.get(url, { responseType: 'blob' });

  const blobUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

// Bollettini API
export const bollettiniApi = {
  getAll: (filters?: BollettinoFilters) =>
    apiClient.get<Bollettino[]>(`/bollettini${bollettinoParams(filters)}`),
  getById: (id: number) =>
    apiClient.get<Bollettino>(`/bollettini/${id}`),
  create: (data: CreateBollettinoInput) =>
    apiClient.post<{ id: number }>('/bollettini', data),
  delete: (id: number) =>
    apiClient.delete(`/bollettini/${id}`),
  downloadPdf: (id: number) =>
    downloadPdf(`/bollettini/${id}/pdf`, `bollettino-${id}.pdf`),
  downloadCumulativo: (cantiereId: number, startDate?: string, endDate?: string) =>
    downloadPdf(
      `/bollettini/cantiere/${cantiereId}/pdf${bollettinoParams({ startDate, endDate })}`,
      `bollettini-cantiere-${cantiereId}.pdf`
    ),
};
