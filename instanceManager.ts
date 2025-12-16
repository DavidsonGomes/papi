/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                      PASTORINI API                            ║
 * ║              WhatsApp API powered by Baileys                  ║
 * ║                     © 2025 Pastorini                          ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import makeWASocket, {
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState,
    Browsers
} from './lib/index.js'
import { Boom } from '@hapi/boom'
import MAIN_LOGGER from './lib/Utils/logger.js'
import fs from 'fs'
import path from 'path'
import * as QRCode from 'qrcode'
import { fileURLToPath } from 'url'
import { 
    initDatabase, 
    getPostgresPool, 
    getRedisClient, 
    getStorageType,
    getDatabaseConfig
} from './lib/Store/database.js'
import { usePostgresAuthState, deletePostgresSession, listPostgresSessions } from './lib/Store/usePostgresAuthState.js'
import { useRedisCachedAuthState, deleteRedisCachedSession } from './lib/Store/useRedisCache.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const logger = MAIN_LOGGER.child({})
logger.level = 'info'

export type InstanceStatus = 'CONNECTING' | 'CONNECTED' | 'QR_READY' | 'DISCONNECTED'

export interface WebhookConfig {
    url: string
    enabled: boolean
    events: string[] // ['messages', 'status', 'connection']
}

export interface InstanceData {
    id: string
    status: InstanceStatus
    qr?: string
    name?: string
    phoneNumber?: string
    socket?: any
    isDeleting?: boolean
    publicLinkEnabled?: boolean
    webhook?: WebhookConfig
}

class InstanceManager {
    private instances: Map<string, InstanceData> = new Map()
    private sessionsDir: string
    private initialized: boolean = false

    constructor(sessionsDir: string = './sessions') {
        this.sessionsDir = sessionsDir
        if (!fs.existsSync(this.sessionsDir)) {
            fs.mkdirSync(this.sessionsDir, { recursive: true })
        }
    }

    /**
     * Initialize the instance manager
     * Must be called before using any other methods
     */
    public async initialize(): Promise<void> {
        if (this.initialized) return
        
        const config = getDatabaseConfig()
        console.log(`[InstanceManager] Initializing with storage: ${config.storageType}`)
        
        if (config.storageType !== 'file') {
            await initDatabase(config)
        }
        
        await this.loadExistingSessions()
        this.initialized = true
    }

    private async loadExistingSessions(): Promise<void> {
        const storageType = getStorageType()
        
        if (storageType === 'file') {
            // Load from file system
            const files = fs.readdirSync(this.sessionsDir)
            for (const file of files) {
                if (fs.statSync(path.join(this.sessionsDir, file)).isDirectory()) {
                    await this.createInstance(file, false)
                }
            }
        } else {
            // Load from PostgreSQL
            const pool = getPostgresPool()
            if (pool) {
                const sessions = await listPostgresSessions(pool)
                for (const sessionId of sessions) {
                    await this.createInstance(sessionId, false)
                }
            }
        }
    }

    public getAllInstances(): Omit<InstanceData, 'socket'>[] {
        return Array.from(this.instances.values()).map(({ socket, ...rest }) => ({
            ...rest,
            publicLinkEnabled: rest.publicLinkEnabled ?? false
        }))
    }

    public async deleteInstance(id: string) {
        console.log(`[${id}] Deleting instance...`)
        const instance = this.instances.get(id)
        if (instance) {
            // Marca como deletando para evitar reconexão automática
            instance.isDeleting = true
            
            if (instance.socket) {
                try {
                    // Logout para desconectar corretamente
                    await instance.socket.logout()
                } catch (e) {
                    // Se falhar o logout, tenta encerrar
                    try {
                        instance.socket.end(undefined)
                    } catch (e2) {
                        console.log(`[${id}] Error ending socket:`, e2)
                    }
                }
            }
            this.instances.delete(id)
        }

        const storageType = getStorageType()
        
        if (storageType === 'file') {
            const sessionPath = path.join(this.sessionsDir, id)
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true })
            }
        } else if (storageType === 'postgres') {
            const pool = getPostgresPool()
            if (pool) {
                await deletePostgresSession(pool, id)
            }
        } else if (storageType === 'postgres+redis') {
            const pool = getPostgresPool()
            const redis = getRedisClient()
            if (pool && redis) {
                await deleteRedisCachedSession(redis, pool, id)
            }
        }
        
        console.log(`[${id}] Instance deleted successfully`)
    }

    public async createInstance(id: string, forceNew: boolean = true) {
        if (this.instances.has(id) && !forceNew) {
            return this.instances.get(id)
        }

        // Get auth state based on storage type
        const storageType = getStorageType()
        let state: any
        let saveCreds: () => Promise<void>
        
        if (storageType === 'postgres+redis') {
            const pool = getPostgresPool()
            const redis = getRedisClient()
            if (!pool || !redis) throw new Error('Database not initialized')
            const authState = await useRedisCachedAuthState(redis, pool, id)
            state = authState.state
            saveCreds = authState.saveCreds
            console.log(`[${id}] Using Redis + PostgreSQL storage`)
        } else if (storageType === 'postgres') {
            const pool = getPostgresPool()
            if (!pool) throw new Error('Database not initialized')
            const authState = await usePostgresAuthState(pool, id)
            state = authState.state
            saveCreds = authState.saveCreds
            console.log(`[${id}] Using PostgreSQL storage`)
        } else {
            const sessionPath = path.join(this.sessionsDir, id)
            const authState = await useMultiFileAuthState(sessionPath)
            state = authState.state
            saveCreds = authState.saveCreds
            console.log(`[${id}] Using file storage`)
        }

        // Check for version override in environment variables
        let version: [number, number, number] | undefined;
        if (process.env.CONFIG_SESSION_PHONE_VERSION) {
            const versionParts = process.env.CONFIG_SESSION_PHONE_VERSION.split('.').map(Number);
            if (versionParts.length === 3 && !versionParts.some(isNaN)) {
                version = versionParts as [number, number, number];
                logger.info({ version }, 'Using manual WhatsApp version from environment');
            } else {
                logger.warn({ envVersion: process.env.CONFIG_SESSION_PHONE_VERSION }, 'Invalid format for CONFIG_SESSION_PHONE_VERSION, fetching latest instead');
            }
        }

        if (!version) {
            const fetched = await fetchLatestBaileysVersion();
            version = fetched.version;
        }

        const sock = makeWASocket({
            version,
            logger,
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: state.keys
            },
            browser: Browsers.ubuntu('Chrome'),
            // Added based on example.ts logic
            generateHighQualityLinkPreview: true,
        })

        // Preserva a configuração de link público se já existia
        const existingInstance = this.instances.get(id)
        const publicLinkEnabled = existingInstance?.publicLinkEnabled ?? false

        const instanceData: InstanceData = {
            id,
            status: 'CONNECTING',
            socket: sock,
            qr: undefined,
            publicLinkEnabled
        }
        this.instances.set(id, instanceData)

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update
            
            console.log(`[${id}] Connection update:`, { connection, hasQr: !!qr })

            if (qr) {
                console.log(`[${id}] QR Code received`);
                QRCode.toString(qr, { type: 'terminal', small: true }, (err, url) => {
                    if (!err) console.log(url)
                })
                instanceData.status = 'QR_READY'
                instanceData.qr = qr
            }

            if (connection === 'close') {
                // Verifica se a instância está sendo deletada
                if (instanceData.isDeleting) {
                    console.log(`[${id}] Instance is being deleted, skipping reconnect`)
                    return
                }
                
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut
                
                console.log(`[${id}] Connection closed. StatusCode: ${statusCode}, shouldReconnect: ${shouldReconnect}`)

                if (shouldReconnect) {
                    instanceData.status = 'CONNECTING'
                    instanceData.qr = undefined
                    // Reconecta após 3 segundos
                    setTimeout(() => this.createInstance(id, true), 3000)
                } else {
                    instanceData.status = 'DISCONNECTED'
                    instanceData.qr = undefined
                }
            } else if (connection === 'open') {
                console.log(`[${id}] Connected successfully!`)
                instanceData.status = 'CONNECTED'
                instanceData.qr = undefined
                instanceData.name = sock.user?.name || id
                instanceData.phoneNumber = sock.user?.id ? sock.user.id.split(':')[0] : undefined
            }
        })

        sock.ev.on('creds.update', saveCreds)

        // Listener para mensagens recebidas
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return
            
            for (const msg of messages) {
                // Ignora mensagens enviadas por nós mesmos
                if (msg.key.fromMe) continue
                
                console.log(`[${id}] New message received:`, msg.key.remoteJid)
                
                // Envia para webhook se configurado
                await this.sendWebhook(id, 'messages', {
                    type: 'message',
                    instanceId: id,
                    data: {
                        key: msg.key,
                        message: msg.message,
                        pushName: msg.pushName,
                        messageTimestamp: msg.messageTimestamp
                    }
                })
            }
        })

        // Listener para atualizações de status de mensagem
        sock.ev.on('messages.update', async (updates) => {
            for (const update of updates) {
                await this.sendWebhook(id, 'message_status', {
                    type: 'message_status',
                    instanceId: id,
                    data: update
                })
            }
        })

        // Listener para reações
        sock.ev.on('messages.reaction', async (reactions) => {
            await this.sendWebhook(id, 'message_reaction', {
                type: 'message_reaction',
                instanceId: id,
                data: reactions
            })
        })

        // Listener para presença (online/offline/digitando)
        sock.ev.on('presence.update', async (presence) => {
            await this.sendWebhook(id, 'presence', {
                type: 'presence',
                instanceId: id,
                data: presence
            })
        })

        // Listener para atualizações de grupos
        sock.ev.on('groups.update', async (updates) => {
            await this.sendWebhook(id, 'group_update', {
                type: 'group_update',
                instanceId: id,
                data: updates
            })
        })

        // Listener para participantes de grupos
        sock.ev.on('group-participants.update', async (update) => {
            await this.sendWebhook(id, 'group_participants', {
                type: 'group_participants',
                instanceId: id,
                data: update
            })
        })

        // Listener para chamadas
        sock.ev.on('call', async (calls) => {
            await this.sendWebhook(id, 'call', {
                type: 'call',
                instanceId: id,
                data: calls
            })
        })

        // Listener para contatos
        sock.ev.on('contacts.update', async (contacts) => {
            await this.sendWebhook(id, 'contacts', {
                type: 'contacts_update',
                instanceId: id,
                data: contacts
            })
        })

        // Listener para chats
        sock.ev.on('chats.update', async (chats) => {
            await this.sendWebhook(id, 'chats', {
                type: 'chats_update',
                instanceId: id,
                data: chats
            })
        })

        // Listener para labels/etiquetas
        sock.ev.on('labels.association', async (label) => {
            await this.sendWebhook(id, 'labels', {
                type: 'label_association',
                instanceId: id,
                data: label
            })
        })

        return instanceData
    }

    public getInstance(id: string) {
        return this.instances.get(id)
    }

    public togglePublicLink(id: string, enabled: boolean): boolean {
        const instance = this.instances.get(id)
        if (instance) {
            instance.publicLinkEnabled = enabled
            console.log(`[${id}] Public link ${enabled ? 'enabled' : 'disabled'}`)
            return true
        }
        return false
    }

    public isPublicLinkEnabled(id: string): boolean {
        const instance = this.instances.get(id)
        return instance?.publicLinkEnabled ?? false
    }

    public setWebhook(id: string, config: WebhookConfig): boolean {
        const instance = this.instances.get(id)
        if (instance) {
            instance.webhook = config
            console.log(`[${id}] Webhook configured:`, config.url, 'enabled:', config.enabled)
            return true
        }
        return false
    }

    public getWebhook(id: string): WebhookConfig | undefined {
        const instance = this.instances.get(id)
        return instance?.webhook
    }

    private async sendWebhook(instanceId: string, eventType: string, payload: any): Promise<void> {
        const instance = this.instances.get(instanceId)
        if (!instance?.webhook?.enabled || !instance.webhook.url) return
        
        // Verifica se o evento está habilitado
        if (!instance.webhook.events.includes(eventType) && !instance.webhook.events.includes('all')) {
            return
        }

        try {
            const response = await fetch(instance.webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Instance-ID': instanceId,
                    'X-Event-Type': eventType
                },
                body: JSON.stringify(payload)
            })
            
            if (!response.ok) {
                console.log(`[${instanceId}] Webhook failed: ${response.status}`)
            } else {
                console.log(`[${instanceId}] Webhook sent successfully: ${eventType}`)
            }
        } catch (error) {
            console.error(`[${instanceId}] Webhook error:`, error)
        }
    }
}

export default new InstanceManager()
