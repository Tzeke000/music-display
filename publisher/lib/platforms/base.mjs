/** Raised when a platform has no stored credentials yet. Job stays retryable. */
export class NotConnectedError extends Error {
  constructor(platform) {
    super(`${platform} is not connected. Run: npm run pub -- connect ${platform}`);
    this.name = 'NotConnectedError';
    this.retryable = true;
  }
}

/**
 * Raised when credentials exist but the live API client isn't implemented in
 * this environment. The connectors carry the exact wiring spec; this is the
 * one step that gets finished on the laptop (where it can reach the APIs).
 */
export class NotWiredError extends Error {
  constructor(platform, steps) {
    super(`${platform} API client not wired up yet.\n${steps}`);
    this.name = 'NotWiredError';
    this.retryable = true;
  }
}
