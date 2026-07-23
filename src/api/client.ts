import axios, { AxiosError } from 'axios';
import type { ApiError } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    apiClient.post<{ user: { id: number; nome: string; cognome: string; ruolo: string } }>(
      '/auth/login',
      { utenteId, password }
    ),

  logout: () =>
    apiClient.post('/auth/logout'),

  getMe: () =>
    apiClient.get<{ user: { id: number; nome: string; cognome: string; ruolo: string } }>(
      '/auth/me'
    ),
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
  getByCantiere: (cantiereId: number, includeInactive = false) =>
    apiClient.get(`/tipi-attivita/cantiere/${cantiereId}${includeInactive ? '?includeInactive=true' : ''}`),
  getById: (id: number) =>
    apiClient.get(`/tipi-attivita/${id}`),
  create: (cantiereId: number, nome: string) =>
    apiClient.post('/tipi-attivita', { cantiereId, nome }),
  update: (id: number, nome: string) =>
    apiClient.put(`/tipi-attivita/${id}`, { nome }),
  delete: (id: number) =>
    apiClient.delete(`/tipi-attivita/${id}`),
  activate: (id: number) =>
    apiClient.post(`/tipi-attivita/${id}/activate`),
};

// Attività API
export const attivitaApi = {
  getAll: (filters?: { utenteId?: number; clienteId?: number; startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    if (filters?.utenteId) params.append('utenteId', filters.utenteId.toString());
    if (filters?.clienteId) params.append('clienteId', filters.clienteId.toString());
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
    oraInizio: string;
    oraFine: string;
    clienteId: number;
    cantiereId: number;
    tipoAttivitaId: number;
    note?: string;
  }) => apiClient.post('/attivita', data),
  update: (id: number, data: {
    dataRiferimento?: string;
    oraInizio?: string;
    oraFine?: string;
    clienteId?: number;
    cantiereId?: number;
    tipoAttivitaId?: number;
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
  update: (id: number, data: { nome?: string; cognome?: string; ruolo?: string }) =>
    apiClient.put(`/utenti/${id}`, data),
  setPassword: (id: number, password: string | null) =>
    apiClient.post(`/utenti/${id}/password`, { password }),
  delete: (id: number) =>
    apiClient.delete(`/utenti/${id}`),
  activate: (id: number) =>
    apiClient.post(`/utenti/${id}/activate`),
};
