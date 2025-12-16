/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                      PASTORINI API                            ║
 * ║              Database Connection Manager                      ║
 * ║                     © 2025 Pastorini                          ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
import { Pool } from 'pg';
import Redis from 'ioredis';
export type StorageType = 'file' | 'postgres' | 'postgres+redis';
export interface DatabaseConfig {
    storageType: StorageType;
    postgres?: {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
        ssl?: boolean;
    };
    redis?: {
        host: string;
        port: number;
        password?: string;
        db?: number;
    };
}
/**
 * Get database configuration from environment variables
 */
export declare function getDatabaseConfig(): DatabaseConfig;
/**
 * Initialize database connections
 */
export declare function initDatabase(config?: DatabaseConfig): Promise<void>;
/**
 * Get PostgreSQL pool
 */
export declare function getPostgresPool(): Pool | null;
/**
 * Get Redis client
 */
export declare function getRedisClient(): Redis | null;
/**
 * Get current storage type
 */
export declare function getStorageType(): StorageType;
/**
 * Close all database connections
 */
export declare function closeDatabase(): Promise<void>;
//# sourceMappingURL=database.d.ts.map