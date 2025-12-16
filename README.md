<p align="center">
  <img src="public/logo-papi.png" alt="Pastorini API" width="120">
</p>

<h1 align="center">Pastorini API</h1>

<p align="center">
  <strong>API completa para WhatsApp com suporte a mensagens interativas</strong><br>
  Botões, Listas, Carrossel, Mídia e muito mais
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.3-green" alt="Version">
  <img src="https://img.shields.io/badge/node-%3E%3D18-blue" alt="Node">
  <img src="https://img.shields.io/badge/license-Proprietary-red" alt="License">
</p>

---

## 📋 Recursos

- ✅ Envio de mensagens de texto, imagem, vídeo, áudio, documento
- ✅ **Botões interativos** (Reply, URL, Call, Copy)
- ✅ **Listas/Menus** com seções e opções
- ✅ **Carrossel** de cards com imagens e botões
- ✅ Gerenciamento de grupos
- ✅ Webhooks configuráveis por instância
- ✅ Múltiplas instâncias simultâneas
- ✅ Painel web integrado
- ✅ API Tester embutido
- ✅ Suporte a PostgreSQL + Redis para alta escala

---

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+
- Docker e Docker Compose (recomendado)
- Chave de licença válida

### Via Docker (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/pastorini-api.git
cd pastorini-api

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com sua LICENSE_KEY

# Inicie com Docker Compose
docker-compose up -d
```

### Via NPM

```bash
# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env

# Inicie o servidor
npm run server
```

---

## ⚙️ Configuração

Edite o arquivo `.env`:

```env
# Servidor
PORT=3000
HOST=0.0.0.0

# Licença (obrigatório)
LICENSE_KEY=SUA-CHAVE-DE-LICENCA

# Storage (file | postgres | postgres+redis)
STORAGE_TYPE=file

# PostgreSQL (se STORAGE_TYPE=postgres ou postgres+redis)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=pastorini_api
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua_senha

# Redis (se STORAGE_TYPE=postgres+redis)
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 📖 Documentação

Após iniciar o servidor, acesse:

| Recurso | URL |
|---------|-----|
| **Painel Principal** | `http://localhost:3000` |
| **Documentação da API** | `http://localhost:3000/docs.html` |
| **API Tester** | `http://localhost:3000/api-tester.html` |

---

## 🔗 Endpoints Principais

### Instâncias

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/instances` | Listar instâncias |
| POST | `/api/instances` | Criar instância |
| GET | `/api/instances/:id/qr` | Obter QR Code |
| GET | `/api/instances/:id/status` | Status da instância |
| DELETE | `/api/instances/:id` | Deletar instância |

### Mensagens

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/instances/:id/send-text` | Enviar texto |
| POST | `/api/instances/:id/send-image` | Enviar imagem |
| POST | `/api/instances/:id/send-buttons` | Enviar botões |
| POST | `/api/instances/:id/send-list` | Enviar lista/menu |
| POST | `/api/instances/:id/send-carousel` | Enviar carrossel |

### Webhooks

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/instances/:id/webhook` | Obter config webhook |
| POST | `/api/instances/:id/webhook` | Configurar webhook |

---

## 📱 Exemplo de Uso

### Enviar Mensagem com Botões

```bash
curl -X POST http://localhost:3000/api/instances/default/send-buttons \
  -H "Content-Type: application/json" \
  -d '{
    "jid": "5511999999999@s.whatsapp.net",
    "text": "Escolha uma opção:",
    "footer": "Pastorini API",
    "buttons": [
      { "type": "reply", "displayText": "Opção 1", "id": "btn1" },
      { "type": "url", "displayText": "Site", "url": "https://google.com" }
    ]
  }'
```

### Enviar Carrossel

```bash
curl -X POST http://localhost:3000/api/instances/default/send-carousel \
  -H "Content-Type: application/json" \
  -d '{
    "jid": "5511999999999@s.whatsapp.net",
    "cards": [
      {
        "header": { "title": "Produto 1", "imageUrl": "https://exemplo.com/img.jpg" },
        "body": "Descrição do produto",
        "footer": "R$ 99,90",
        "buttons": [
          { "displayText": "Comprar", "urlButton": { "url": "https://loja.com" } }
        ]
      }
    ]
  }'
```

---

## 🐳 Docker Compose e Swarm em breve...


---

## 📞 Suporte
- **Criador**": Matheus Pastorini
- **Contribuidor do projeto**: Rafael Martins 
- **WhatsApp**: [+55 82 98889-8565](https://wa.me/5582988898565)
- **Grupos Automatik de Suporte / Licenaça Free**: [Grupo Automatik](https://chat.whatsapp.com/BL1yLEFDjmkFB1yLkQVsCn)
- **Documentação**: Acesse `/docs.html` no painel
 
---

## ⚠️ Aviso Legal

Este software requer uma licença válida para funcionamento. O uso não autorizado é proibido.

---

<p align="center">
  <strong>© 2025 Pastorini API</strong><br>
  Powered by Baileys
</p>
