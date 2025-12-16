// API URL - usa o mesmo host/porta que está servindo a página
const API_URL = '/api';

const instancesGrid = document.getElementById('instancesGrid');
const addInstanceBtn = document.getElementById('addInstanceBtn');
const modal = document.getElementById('qrModal');
const closeModal = document.querySelector('.close');
const qrImage = document.getElementById('qrImage');
const qrLoader = document.getElementById('qrLoader');
const qrStatus = document.getElementById('qrStatus');

let currentPollInterval = null;

// ==================== SERVER STATS ====================

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

async function fetchServerStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        const stats = await response.json();
        
        // CPU
        document.getElementById('cpuUsage').textContent = stats.cpu.usage + '%';
        document.getElementById('cpuCores').textContent = stats.cpu.cores + ' cores';
        
        // Memory
        document.getElementById('memUsage').textContent = stats.memory.usagePercent + '%';
        document.getElementById('memDetail').textContent = formatBytes(stats.memory.used) + ' / ' + formatBytes(stats.memory.total);
        
        // Process
        document.getElementById('processMemory').textContent = formatBytes(stats.process.rss);
        document.getElementById('nodeVersion').textContent = stats.system.nodeVersion;
        
        // Uptime
        document.getElementById('apiUptime').textContent = formatUptime(stats.api.uptime);
        document.getElementById('instancesCount').textContent = stats.api.connectedInstances + '/' + stats.api.instances + ' conectadas';
        
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

// Stats refresh interval
let statsInterval = null;

function changeRefreshRate() {
    const rate = parseInt(document.getElementById('refreshRate').value);
    if (statsInterval) clearInterval(statsInterval);
    statsInterval = setInterval(fetchServerStats, rate);
    // Save preference
    localStorage.setItem('statsRefreshRate', rate);
}

// Initialize stats refresh
function initStatsRefresh() {
    // Load saved preference
    const savedRate = localStorage.getItem('statsRefreshRate');
    if (savedRate) {
        document.getElementById('refreshRate').value = savedRate;
    }
    const rate = parseInt(document.getElementById('refreshRate').value);
    fetchServerStats();
    statsInterval = setInterval(fetchServerStats, rate);
}

initStatsRefresh();

// ==================== INSTANCES ====================

// Fetch and render instances
async function fetchInstances() {
    try {
        const response = await fetch(`${API_URL}/instances`);
        const instances = await response.json();
        renderInstances(instances);
    } catch (error) {
        console.error('Error fetching instances:', error);
    }
}

function renderInstances(instances) {
    instancesGrid.innerHTML = instances.map(instance => `
        <div class="card">
            <div class="card-header">
                <span class="status-badge ${instance.status === 'CONNECTED' ? 'status-connected' : 'status-disconnected'}">
                    ${instance.status}
                </span>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-icon btn-settings" onclick="openSettings('${instance.id}')" title="Configurações">
                        <i class="fa-solid fa-gear"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteInstance('${instance.id}')" title="Excluir">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="card-body">
                <h3>${instance.name || 'Desconhecido'}</h3>
                <p>${instance.id}</p>
                <p>${instance.phoneNumber ? '+' + instance.phoneNumber : 'Sem número'}</p>
            </div>
            <div class="card-actions">
                <button class="btn-primary" onclick="testCarousel('${instance.id}')" ${instance.status !== 'CONNECTED' ? 'disabled' : ''} style="flex: 1">
                    <i class="fa-solid fa-paper-plane"></i> Testar
                </button>
                <div style="width: 10px;"></div>
                <button class="btn-secondary" onclick="reconnectInstance('${instance.id}')" title="Reconectar / QR Code" style="flex: 1">
                    <i class="fa-solid fa-qrcode"></i> Reconectar
                </button>
            </div>
            <div class="card-link-section" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <span style="font-size: 0.85rem; color: #aaa;">
                        <i class="fa-solid fa-link"></i> Link Público QR
                    </span>
                    <label class="toggle-switch">
                        <input type="checkbox" ${instance.publicLinkEnabled ? 'checked' : ''} onchange="togglePublicLink('${instance.id}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <button class="btn-link-copy" onclick="copyPublicLink('${instance.id}')" ${!instance.publicLinkEnabled ? 'disabled' : ''} style="width: 100%; padding: 8px; font-size: 0.85rem;">
                    <i class="fa-solid fa-copy"></i> Copiar Link para Cliente
                </button>
            </div>
        </div>
    `).join('');
}

// Create Instance & Poll QR
async function createInstance(existingId = null) {
    const id = existingId || `instance_${Date.now()}`;
    modal.style.display = 'flex';
    qrStatus.innerText = 'Iniciando instância...';
    qrLoader.style.display = 'block';
    qrImage.style.display = 'none';

    try {
        await fetch(`${API_URL}/instances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        startQrPolling(id);
    } catch (error) {
        qrStatus.innerText = 'Erro ao criar instância';
    }
}

function reconnectInstance(id) {
    if (!confirm('Deseja gerar um novo QR Code para esta instância?')) return;
    createInstance(id);
}

function startQrPolling(id) {
    if (currentPollInterval) clearInterval(currentPollInterval);

    const pollQr = async () => {
        try {
            // Check instance status first
            const listRes = await fetch(`${API_URL}/instances`);
            const instances = await listRes.json();
            const instance = instances.find(i => i.id === id);

            if (instance) {
                console.log(`[Polling] Instance ${id} status: ${instance.status}`);
                
                if (instance.status === 'CONNECTED') {
                    clearInterval(currentPollInterval);
                    currentPollInterval = null;
                    modal.style.display = 'none';
                    qrStatus.innerText = 'Conectado!';
                    fetchInstances();
                    return;
                }
                
                if (instance.status === 'CONNECTING') {
                    qrStatus.innerText = 'Conectando... aguarde';
                    qrLoader.style.display = 'block';
                    qrImage.style.display = 'none';
                    return;
                }
            }

            // Get QR
            const qrRes = await fetch(`${API_URL}/instances/${id}/qr`);
            if (qrRes.ok) {
                const data = await qrRes.json();
                qrImage.src = data.qrImage;
                qrImage.style.display = 'block';
                qrLoader.style.display = 'none';
                qrStatus.innerText = 'Escaneie o QR Code no WhatsApp';
            } else {
                // QR não disponível ainda
                const errorData = await qrRes.json().catch(() => ({}));
                if (errorData.error === 'QR not ready or already connected') {
                    qrStatus.innerText = 'Aguardando QR Code...';
                }
            }
        } catch (error) {
            console.error('Polling error', error);
        }
    };

    // Primeira verificação imediata
    pollQr();
    
    // Polling mais rápido (1.5 segundos) para melhor responsividade
    currentPollInterval = setInterval(pollQr, 1500);
}

// Delete Instance
async function deleteInstance(id) {
    if (!confirm('Tem certeza que deseja remover esta instância?')) return;

    await fetch(`${API_URL}/instances/${id}`, { method: 'DELETE' });
    fetchInstances();
}

// Toggle Public Link
async function togglePublicLink(id, enabled) {
    console.log(`[Toggle] Setting public link for ${id} to ${enabled}`);
    try {
        const response = await fetch(`${API_URL}/instances/${id}/toggle-public-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled })
        });
        const data = await response.json();
        console.log('[Toggle] Response:', data);
        if (!response.ok) {
            throw new Error(data.error || 'Failed to toggle');
        }
        fetchInstances();
    } catch (error) {
        console.error('Error toggling public link:', error);
        alert('Erro ao alterar configuração: ' + error.message);
    }
}

// Copy Public Link
function copyPublicLink(id) {
    const link = `${window.location.origin}/qr-client.html?id=${id}`;
    navigator.clipboard.writeText(link).then(() => {
        alert('Link copiado!\n\n' + link);
    }).catch(() => {
        prompt('Copie o link abaixo:', link);
    });
}

const sendModal = document.getElementById('sendModal');
const sendClose = document.querySelector('.send-close');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const btnHeaderType = document.getElementById('btnHeaderType');
const mediaUrlGroup = document.getElementById('mediaUrlGroup');

let currentInstanceId = null;

// ... existing fetchInstances ...

// Open Send Modal
function testCarousel(id) {
    currentInstanceId = id;
    sendModal.style.display = 'flex';
}

// Tab Switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${btn.dataset.tab}Tab`).classList.add('active');
    });
});

// Toggle Media Input
btnHeaderType.addEventListener('change', (e) => {
    if (e.target.value === 'image' || e.target.value === 'video') {
        mediaUrlGroup.style.display = 'block';
    } else {
        mediaUrlGroup.style.display = 'none';
    }
});

// Send Message Logic
sendMessageBtn.addEventListener('click', async () => {
    const jid = document.getElementById('targetJid').value;
    if (!jid) return alert('Digite um número!');

    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    const url = `${API_URL}/instances/${currentInstanceId}`;
    let endpoint = '';
    let body = { jid };

    if (activeTab === 'carousel') {
        endpoint = '/send-carousel';
        // Body is just jid for now as per server implementation demo
    } else if (activeTab === 'list') {
        endpoint = '/send-list';
        body = {
            ...body,
            title: document.getElementById('listTitle').value,
            text: document.getElementById('listText').value,
            footer: 'Rodapé do Menu',
            buttonText: document.getElementById('listButtonParams').value,
            sections: [
                {
                    title: 'Seção 1',
                    rows: [
                        { title: 'Opção 1', description: 'Descrição da opção 1', rowId: 'opt1' },
                        { title: 'Opção 2', description: 'Descrição da opção 2', rowId: 'opt2' }
                    ]
                }
            ]
        };
    } else if (activeTab === 'buttons') {
        endpoint = '/send-buttons';
        body = {
            ...body,
            text: document.getElementById('btnText').value,
            footer: 'Rodapé dos Botões',
            headerType: document.getElementById('btnHeaderType').value,
            mediaUrl: document.getElementById('btnMediaUrl').value,
            buttons: [
                { type: 'reply', displayText: 'Sim', id: 'yes' },
                { type: 'reply', displayText: 'Não', id: 'no' },
                { type: 'url', displayText: 'Visitar Site', url: 'https://google.com' }
            ]
        };
    }

    try {
        const res = await fetch(url + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) {
            alert('Mensagem enviada com sucesso!');
            sendModal.style.display = 'none';
        } else {
            alert('Erro ao enviar: ' + (data.error || 'Desconhecido'));
        }
    } catch (error) {
        console.error(error);
        alert('Erro ao enviar requisição');
    }
});

sendClose.addEventListener('click', () => {
    sendModal.style.display = 'none';
});

// ... existing code ...

// Event Listeners
addInstanceBtn.addEventListener('click', () => createInstance());
closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
    if (currentPollInterval) clearInterval(currentPollInterval);
});

// Settings Modal
const settingsModal = document.getElementById('settingsModal');
const settingsClose = document.querySelector('.settings-close');
let settingsInstanceId = null;

async function openSettings(id) {
    settingsInstanceId = id;
    settingsModal.style.display = 'flex';
    
    // Reset all checkboxes first
    document.querySelectorAll('.event-checkbox').forEach(cb => {
        cb.checked = false;
    });
    
    // Carrega configurações atuais
    try {
        const res = await fetch(`${API_URL}/instances/${id}/webhook`);
        const data = await res.json();
        
        if (data.webhook) {
            document.getElementById('webhookUrl').value = data.webhook.url || '';
            document.getElementById('webhookEnabled').checked = data.webhook.enabled || false;
            
            // Marca os eventos configurados
            const events = data.webhook.events || [];
            document.querySelectorAll('.event-checkbox').forEach(cb => {
                const eventName = cb.dataset.event;
                cb.checked = events.includes(eventName) || events.includes('all');
            });
        } else {
            document.getElementById('webhookUrl').value = '';
            document.getElementById('webhookEnabled').checked = false;
            // Marca apenas mensagens e status por padrão
            document.querySelector('[data-event="messages"]').checked = true;
            document.querySelector('[data-event="message_status"]').checked = true;
        }
    } catch (error) {
        console.error('Error loading webhook config:', error);
    }
}

async function saveWebhookSettings() {
    const url = document.getElementById('webhookUrl').value;
    const enabled = document.getElementById('webhookEnabled').checked;
    const events = [];
    
    // Coleta todos os eventos marcados
    document.querySelectorAll('.event-checkbox:checked').forEach(cb => {
        events.push(cb.dataset.event);
    });
    
    try {
        const res = await fetch(`${API_URL}/instances/${settingsInstanceId}/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, enabled, events })
        });
        
        const data = await res.json();
        if (data.success) {
            alert('Configurações salvas com sucesso!');
            settingsModal.style.display = 'none';
        } else {
            alert('Erro ao salvar: ' + (data.error || 'Desconhecido'));
        }
    } catch (error) {
        console.error('Error saving webhook:', error);
        alert('Erro ao salvar configurações');
    }
}

if (settingsClose) {
    settingsClose.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });
}

// Settings Tab Switching
document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${btn.dataset.settingsTab}SettingsTab`).classList.add('active');
    });
});

// Initial load
fetchInstances();
setInterval(fetchInstances, 5000); // Auto refresh list
