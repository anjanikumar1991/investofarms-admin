import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://investofarms-api-production.up.railway.app';
export const API_V1_BASE_URL = `${API_BASE_URL}/v1`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const unwrap = <T>(response: any): T => response?.data?.data ?? response?.data;
