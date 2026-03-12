/**
 * UserRegistry: Telegram user_id ↔ AOA account mapping
 * In-memory Map store for Phase 1
 */

export class UserRegistry {
  private readonly store: Map<number, string> = new Map();

  /**
   * Register a Telegram user to an AOA account.
   * @param telegramUserId Telegram user ID (numeric)
   * @param aoaAccountId AOA account ID (string)
   */
  register(telegramUserId: number, aoaAccountId: string): void {
    this.store.set(telegramUserId, aoaAccountId);
  }

  /**
   * Look up AOA account ID by Telegram user ID.
   * @param telegramUserId Telegram user ID
   * @returns AOA account ID or undefined if not registered
   */
  lookup(telegramUserId: number): string | undefined {
    return this.store.get(telegramUserId);
  }

  /**
   * Check if a Telegram user is registered.
   * @param telegramUserId Telegram user ID
   * @returns true if registered, false otherwise
   */
  isRegistered(telegramUserId: number): boolean {
    return this.store.has(telegramUserId);
  }

  /**
   * Unregister a Telegram user (for testing/cleanup).
   * @param telegramUserId Telegram user ID
   */
  unregister(telegramUserId: number): void {
    this.store.delete(telegramUserId);
  }

  /**
   * Clear all registrations (for testing).
   */
  clear(): void {
    this.store.clear();
  }
}
