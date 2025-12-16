/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                      PASTORINI API                            ║
 * ║         PostgreSQL Auth State for Baileys Sessions            ║
 * ║                     © 2025 Pastorini                          ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
import type { AuthenticationState } from '../Types/index.js';
import type { Pool } from 'pg';
/**
 * Stores the full authentication state in PostgreSQL
 * Far superior for scaling compared to file-based storage
 */
export declare const usePostgresAuthState: (pool: Pool, sessionId: string) => Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
}>;
/**
 * Delete all session data for a given session ID
 */
export declare const deletePostgresSession: (pool: Pool, sessionId: string) => Promise<void>;
/**
 * List all session IDs in the database
 */
export declare const listPostgresSessions: (pool: Pool) => Promise<string[]>;
//# sourceMappingURL=usePostgresAuthState.d.ts.map