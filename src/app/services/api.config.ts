import { environment } from '../../environments/environment';

const LOCAL_BACKEND_URL = 'http://localhost:3000';
const envApiUrl = (environment.apiBaseUrl || '').trim();
const envSocketUrl = (environment.socketBaseUrl || '').trim();

function isLocalFrontend(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  const port = window.location.port;
  return (host === 'localhost' || host === '127.0.0.1') && port !== '3000';
}

// Priority:
// 1) environment value (for separate frontend/backend deployments),
// 2) localhost fallback for local dev,
// 3) same-origin fallback when served together.
export const API_BASE_URL = envApiUrl || (isLocalFrontend() ? LOCAL_BACKEND_URL : '');
export const SOCKET_BASE_URL =
  envSocketUrl ||
  envApiUrl ||
  (isLocalFrontend() ? LOCAL_BACKEND_URL : (typeof window !== 'undefined' ? window.location.origin : LOCAL_BACKEND_URL));
