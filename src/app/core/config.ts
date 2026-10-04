/**
 * Runtime settings. The API Gateway (Go) is the single entry point of the backend,
 * so every service is reached under this base path (see endpoints.md, prefix /api/v1).
 */
export const API_BASE = '/api/v1';

/**
 * While the backend does not exist, requests to API_BASE are answered by mock-api.interceptor.
 * Set to false when the gateway is available; nothing else in the app changes.
 */
export const USE_MOCKS = true;
