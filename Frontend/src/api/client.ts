const BASE_HOST = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface ApiSuccessResponse<T = any> {
  success: true;
  message?: string;
  data?: T;
  user?: any;
  token?: string;
  items?: T[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  [key: string]: any;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  details?: any;
}

function getAuthToken(): string | null {
  return sessionStorage.getItem('token') || localStorage.getItem('token');
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Normalize path to always include /api prefix for robust routing
  let fullUrl: string;
  if (endpoint.startsWith('http')) {
    fullUrl = endpoint;
  } else {
    let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (!cleanEndpoint.startsWith('/api')) {
      cleanEndpoint = `/api${cleanEndpoint}`;
    }
    fullUrl = `${BASE_HOST}${cleanEndpoint}`;
  }

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({
    success: false,
    message: 'Invalid JSON response from server',
  }));

  if (!response.ok || data.success === false) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    const err: any = new Error(errorMsg);
    err.status = response.status;
    err.details = data.details;
    throw err;
  }

  return data as T;
}

export const api = {
  get: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = any>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
};
