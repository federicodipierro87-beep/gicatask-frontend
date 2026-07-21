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
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      // Clear any stored auth state and redirect
      window.location.href = '/login';
    }
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
