import { environment } from '../../environments/environment';

/**
 * Runtime settings. The API Gateway is the single entry point of the backend, so every service
 * is reached under this base path (prefix /api/v1). Set per build in src/environments.
 */
export const API_BASE: string = environment.apiBase.replace(/\/$/, '');

const MOCK_KEY = 'driveos.mock';

/** The environment default, overridable per tab with ?mock (on) or ?mock=0 (off); the choice sticks for the tab. */
function resolveUseMocks(): boolean {
  try {
    const param = new URLSearchParams(window.location.search).get('mock');
    if (param !== null) {
      const on = param !== '0' && param !== 'false';
      sessionStorage.setItem(MOCK_KEY, on ? '1' : '0');
      return on;
    }
    const stored = sessionStorage.getItem(MOCK_KEY);
    if (stored !== null) return stored === '1';
  } catch {
    /* no window or storage blocked: use the environment default */
  }
  return environment.useMocks;
}

/** When true, requests to API_BASE are answered by mock-api.interceptor instead of the network. */
export const USE_MOCKS: boolean = resolveUseMocks();
