/** Production defaults: talks to the real API Gateway, no mocks. */
export const environment = {
  /** Path (or absolute URL) of the gateway API. A relative path needs a reverse proxy / rewrite to the gateway. */
  apiBase: '/api/v1',
  useMocks: false,
};
