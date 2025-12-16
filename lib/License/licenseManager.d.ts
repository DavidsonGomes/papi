/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                      PASTORINI API                            ║
 * ║              License Verification System                      ║
 * ║                     © 2025 Pastorini                          ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
export interface LicenseStatus {
    isValid: boolean;
    status: 'ACTIVE' | 'BLOCKED' | 'EXPIRED' | 'INACTIVE' | 'INVALID' | 'ERROR' | 'PENDING_ACTIVATION' | 'MACHINE_MISMATCH' | 'INTEGRITY_FAILED';
    message: string;
    maxInstances?: number;
    clientName?: string;
    expiresAt?: string;
}
declare class LicenseManager {
    private licenseKey;
    private adminUrl;
    private machineId;
    private integrityHash;
    private currentStatus;
    private heartbeatInterval;
    private instancesCount;
    private onBlockCallback;
    private activationChecked;
    /**
     * Generate or load machine ID
     */
    private getMachineId;
    /**
     * Calculate integrity hash of critical files
     * Usa lib/ em produção, src/ em desenvolvimento
     */
    private calculateIntegrityHash;
    /**
     * Initialize license manager
     */
    initialize(licenseKey?: string, adminUrl?: string): Promise<void>;
    /**
     * Request activation from admin server
     */
    private requestActivation;
    /**
     * Send heartbeat to admin server
     */
    private sendHeartbeat;
    /**
     * Check if system is allowed to operate
     */
    isAllowed(): boolean;
    /**
     * Get current license status
     */
    getStatus(): LicenseStatus;
    /**
     * Update instances count for heartbeat
     */
    setInstancesCount(count: number): void;
    /**
     * Set callback for when license is blocked
     */
    onBlock(callback: () => void): void;
    /**
     * Stop heartbeat
     */
    stop(): void;
}
export declare const licenseManager: LicenseManager;
export default licenseManager;
//# sourceMappingURL=licenseManager.d.ts.map