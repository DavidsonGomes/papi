/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                      PASTORINI API                            ║
 * ║              Redis Cache Layer for Sessions                   ║
 * ║                     © 2025 Pastorini                          ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
import type { AuthenticationState } from '../Types/index.js';
import type { Redis } from 'ioredis';
import type { Pool } from 'pg';
/**
 * Redis-cached PostgreSQL auth state
 * Uses Redis as L1 cache and PostgreSQL as persistent storage
 * Best of both worlds: speed + durability
 */
export declare const useRedisCachedAuthState: (redis: Redis, pool: Pool, sessionId: string) => Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
}>;
/**
 * Delete all session data from both Redis and PostgreSQL
 */
export declare const deleteRedisCachedSession: (redis: Redis, pool: Pool, sessionId: string) => Promise<void>;
//# sourceMappingURL=useRedisCache.d.ts.map