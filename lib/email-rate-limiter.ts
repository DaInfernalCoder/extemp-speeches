/**
 * Rate limiter for email sending to comply with Resend's 2 requests/second limit.
 * 
 * Uses a sliding window approach: maintains the last 2 send timestamps.
 * Before sending, ensures at least 1 second has passed since the oldest timestamp.
 */

class EmailRateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests = 2;
  private readonly windowMs = 1000; // 1 second

  /**
   * Waits until it's safe to send an email (respecting 2 requests/second limit).
   * Should be called before each email send operation.
   */
  async waitForRateLimit(): Promise<void> {
    const now = Date.now();

    // Remove timestamps older than 1 second
    this.timestamps = this.timestamps.filter(
      (ts) => now - ts < this.windowMs
    );

    // If we have fewer than maxRequests, we can send immediately
    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(now);
      return;
    }

    // We have maxRequests in the last second, need to wait
    // Find the oldest timestamp
    const oldestTimestamp = Math.min(...this.timestamps);
    const timeSinceOldest = now - oldestTimestamp;
    const waitTime = this.windowMs - timeSinceOldest + 10; // Add 10ms buffer for safety

    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    // Update timestamps after waiting
    const newNow = Date.now();
    this.timestamps = this.timestamps.filter(
      (ts) => newNow - ts < this.windowMs
    );
    this.timestamps.push(newNow);
  }
}

// Export a singleton instance
export const emailRateLimiter = new EmailRateLimiter();





