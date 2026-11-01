# 📋 HANDOFF - NextQueue (Sistema Multi-Tenant de Fila com QR Code & WebSocket)

> **Data de Atualização:** 31/10/2026  
> **Status:** MVP 100% Funcional e Testado (Backend Express + Socket.IO + Frontend React Vite + PWA Mobile + TV Display + Totem + Painel Operador)

---

## 🎯 1. Visão Geral do Projeto

Sistema completo **Multi-Tenant** e **Multi-Serviço** para emissão de tickets, triagem, chamadas de fila e acompanhamento dinâmico do paciente/cliente do início ao fim da sua jornada através de leitura de **QR Code** e conexão **WebSocket**.

### Cenário de Referência (Saúde / Hospitalar):
1. **Emissão no Totem:** Paciente retira a senha no Totem ou recepcionista emite. A ficha contém um **QR Code** exclusivo.
2. **Leitura pelo Celular:** Ao apontar a câmera do celular, o paciente abre a tela de acompanhamento ao vivo (sem necessidade de instalar aplicativo). O WebSocket conecta e registra o evento `QR_TRACKER_OPENED`.
3. **Cálculo com Margem de Segurança:** A empresa decide se aplica um valor adicional ao tempo médio de espera e quanto (ex: $+10\text{ min}$ fixos ou $+20\%$). O paciente visualiza o tempo estimado realista e sua posição na fila.
4. **Chamada para Triagem (Enfermagem):** O atendente/enfermeiro chama a senha no painel. O celular do paciente toca alarme, vibra e avisa a sala/guichê. O Painel TV toca chime e fala a senha em voz alta.
5. **Avanço de Etapa para Consulta Médica:** O enfermeiro conclui a triagem, registra os sinais vitais/anotações clínicas, e encaminha para a fila do Médico. O celular do paciente atualiza instantaneamente para a fila do médico com novo tempo estimado.
6. **Exames / Procedimentos ou Alta Direta:** O médico pode encaminhar para exames/medicação ou liberar alta médica com receitas e atestados.
7. **Conclusão e Pesquisa de Satisfação:** Conclui com confetes no celular e avaliação por estrelas.

---

## 🛠️ 2. Stack Tecnológica

* **Runtime:** Node.js (v20.20.2+)
* **Backend:**
  * Express 4.x
  * Socket.IO 4.x (WebSocket em tempo real)
  * QR Code (`qrcode` npm) gerando data URLs de alta definição
  * Sistema de persistência atômico JSON em `backend/data/db.json` (zero dependências C++ nativas, portável em Windows/Linux/Mac/Docker)
  * UUID v4
* **Frontend:**
  * React 19 + Vite 6
  * Tailwind CSS 3.4
  * Lucide React (Ícones clínicos e operacionais)
  * Canvas Confetti (Celebração de conclusão)
  * Web Audio API Synthesizer (Chimes bi-tonais de aeroporto/hospital e sintetizador vocal PT-BR nativos do navegador, sem dependência de MP3 externos)
* **Arquitetura de Rede:**
  * Auto-detecção de IP da rede local (Wi-Fi/LAN) para que celulares físicos conectados ao mesmo Wi-Fi consigam escanear e abrir o QR Code diretamente.

---

## 📂 3. Estrutura de Arquivos

```
new-ticket/
├── backend/
│   ├── data/
│   │   └── db.json                    # Banco de dados com dados semente (Hospital São Rafael, etc.)
│   ├── src/
│   │   ├── db/
│   │   │   └── store.js               # Repositório de persistência e helpers
│   │   ├── services/
│   │   │   └── waitTimeService.js     # Motor de cálculo de tempo médio + margem de segurança configurável
│   │   ├── routes/
│   │   │   ├── tenants.js             # Rotas de empresas, serviços, etapas e buffers
│   │   │   └── tickets.js             # Criação, chamadas, avanço de etapas e auditoria de tickets
│   │   ├── socket.js                  # Hub de eventos WebSocket (salas privadas, TV, desk, admin)
│   │   └── server.js                  # Servidor unificado Express + Socket.IO + static build SPA
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MobileTracker.jsx      # Visão do celular do paciente (QR Tracker)
│   │   │   ├── TotemKiosk.jsx         # Totem touchscreen com emissão e QR code impresso
│   │   │   ├── OperatorDesk.jsx       # Painel do atendente/enfermeiro/médico com prontuário rápido
│   │   │   ├── TvDisplay.jsx          # Painel TV de recepção com som e sintetizador de voz
│   │   │   ├── AdminPanel.jsx         # Gestor de etapas (workflow builder) e ajuste de margem
│   │   │   └── Navbar.jsx             # Barra de navegação e alternador de visão/tenant
│   │   ├── utils/
│   │   │   ├── api.js                 # Cliente REST
│   │   │   ├── socket.js              # Cliente Socket.IO singleton
│   │   │   └── sound.js               # Gerador de som Web Audio API e síntese de voz
│   │   ├── App.jsx                    # Roteador dinâmico e suporte a rota direta /track/:token
│   │   ├── index.css                  # Estilos globais e Tailwind
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── package.json                       # Scripts globais do monorepo
├── README.md                          # Documentação executiva
└── HANDOFF.md                         # Este documento de transição
```

---

## 🔄 4. Ciclo de Vida dos Eventos WebSocket

| Evento | Origem | Destino | Descrição |
|---|---|---|---|
| `join_ticket` | Celular | Servidor | Paciente escaneou o QR Code e abriu a página |
| `QR_TRACKER_OPENED` | Servidor | Auditoria / Admin | Log auditável do momento exato que o paciente conectou |
| `ticket_snapshot` | Servidor | Celular | Envio do estado atual, etapas, fila e tempo estimado |
| `TICKET_CALLED` | Operador | TV / Celular | Dispara chime de alta prioridade, banner e vibração |
| `display:call` | Servidor | Painel TV | Aciona fala sintetizada e banner piscante |
| `STAGE_STARTED` | Operador | Celular / Admin | Marca início do atendimento no consultório |
| `STAGE_COMPLETED` | Operador | Histórico do Ticket | Salva anotações clínicas e duração da etapa |
| `STAGE_TRANSFERRED` | Servidor | Celular | Transfere paciente para a próxima fila e recalcula tempo |
| `queue_position_updated` | Servidor | Celulares na fila | Notifica quem está aguardando sempre que a fila anda |
| `TICKET_COMPLETED` | Operador | Celular | Dispara confetes, resumo do atendimento e pesquisa NPS |

---

## 💻 5. Como Rodar na Nova Máquina

1. **Clonar o Repositório:**
   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd new-ticket
   ```

2. **Instalar Dependências:**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   npm run build
   ```

3. **Executar o Servidor Unificado:**
   ```bash
   cd ../backend
   node src/server.js
   ```

4. **Acessar as Aplicações:**
   * A aplicação unificada estará acessível em `http://localhost:5000` (e no IP da rede local para testes com smartphone físico).
   * No menu superior é possível navegar diretamente entre:
     * 📱 **Celular (QR Tracker)**
     * 🖥️ **Totem de Autoatendimento**
     * 🩺 **Painel do Operador / Médico**
     * 📺 **Painel TV de Chamadas**
     * ⚙️ **Gestão de Etapas & Margem**

---

## 🚀 6. Próximos Passos Sugeridos para a Próxima Máquina

1. **Persistência Externa (Opcional):**
   * Atualmente os dados persistem em `backend/data/db.json` de forma atômica e limpa. Caso desejado, pode-se plugar PostgreSQL / MongoDB / Supabase facilmente mantendo a mesma interface de `backend/src/db/store.js`.
2. **Integração com WhatsApp:**
   * Envio automático do link do QR Code via WhatsApp (Twilio / Evolution API / Z-API) quando o paciente digita o telefone no Totem.
3. **Múltiplos Totens / Impressora Térmica:**
   * Envio direto de comando de impressão térmica ESC/POS para impressoras de balcão (Epson, Bematech, Elgin).
4. **Relatórios de SLA e Gargalos:**
   * Gráficos adicionais de tempo médio real de permanência em cada sala para a diretoria clínica.
