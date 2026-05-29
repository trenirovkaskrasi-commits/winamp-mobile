export class ReconnectManager {
  private attempts = 0;
  private maxAttempts = 10;
  private baseDelay = 1000;
  private maxDelay = 30000;
  private lastAttemptAt = 0;
  private cooldownMs = 60000; // Reset after 60s of stable connection

  shouldReconnect(): boolean {
    return this.attempts < this.maxAttempts;
  }

  getDelay(): number {
    const delay = Math.min(this.maxDelay, this.baseDelay * Math.pow(1.5, this.attempts));
    // Add jitter
    return delay + Math.random() * 1000;
  }

  recordAttempt(): number {
    const now = Date.now();
    // If it's been stable for a while, reset attempts
    if (now - this.lastAttemptAt > this.cooldownMs) {
      this.attempts = 0;
    }
    this.attempts++;
    this.lastAttemptAt = now;
    return this.getDelay();
  }

  reset() {
    this.attempts = 0;
    this.lastAttemptAt = 0;
  }

  // Cache busting appender
  getBustedUrl(baseUrl: string): string {
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}_t=${Date.now()}`;
  }
}
