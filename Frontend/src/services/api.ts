import type { AbendLog, AbendLogFilter, PaginatedLogResponse } from '../types';

const API_BASE_URL = '/api/abend';

const SESSION_KEY = 'abend_session';

function getToken(): string | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw).token ?? null;
  } catch { return null; }
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  if (response.status === 401 || response.status === 403) {
    window.dispatchEvent(new Event('auth:expired'));
  }
  return response;
}

// Helper to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export const api = {
  getLogs: async (filters: AbendLogFilter, page: number, pageSize: number): Promise<PaginatedLogResponse> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));
    
    const response = await fetchWithAuth(`${API_BASE_URL}?${params.toString()}`);
    return handleResponse<PaginatedLogResponse>(response);
  },

  getLog: async (year: number, log_number: number): Promise<AbendLog | undefined> => {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/${year}/${log_number}`);
        if (response.status === 404) {
            return undefined;
        }
        return await handleResponse<AbendLog>(response);
    } catch(error) {
        console.error("Failed to get log by year and number", error);
        return undefined;
    }
  },

  getNextLogNumber: async (year: number): Promise<number> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/next-log-number?year=${year}`);
    return handleResponse<number>(response);
  },
  
  addLog: async (logData: Omit<AbendLog, 'log_id' | 'log_number'>): Promise<AbendLog> => {
    const response = await fetchWithAuth(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData),
    });
    return handleResponse<AbendLog>(response);
  },

  updateLog: async (year: number, log_number: number, logData: Partial<AbendLog>): Promise<AbendLog> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/${year}/${log_number}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData),
    });
    return handleResponse<AbendLog>(response);
  },

  deleteLog: async (year: number, log_number: number): Promise<{ success: boolean }> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/${year}/${log_number}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean }>(response);
  }
};
