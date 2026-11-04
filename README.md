# NextQueue - Sistema Multi-Tenant & Multi-Serviço de Fila Inteligente com QR-Code e WebSocket

Sistema completo para gestão de filas e roteamento de pacientes/clientes com acompanhamento em tempo real via **QR Code**, cálculo dinâmico de tempo médio com **margem de segurança configurável** pela empresa, e fluxo multi-etapas com eventos auditáveis via **WebSocket**.

---

## 🌟 Principais Funcionalidades

1. **Multi-Tenant (Isolamento por Empresa/Clínica):**
   - Configuração independente por empresa (Nome, logo, serviços, etapas, guichês).
   - Suporte a múltiplos serviços (ex: *Pronto Atendimento*, *Consultório Eletivo*, *Laboratório*).

2. **Margem de Segurança Configurável (Tempo Médio):**
   - A empresa define se adiciona um valor a mais e quanto a mais ao tempo médio de espera.
   - Suporte a:
     - **Minutos Fixos** (ex: `+10 min`, `+15 min`)
     - **Porcentagem de Folga** (ex: `+20%`, `+30%`)
   - O paciente vê o tempo ajustado com transparência e sem frustrações com atrasos.

3. **Rastreamento no Celular via QR-Code (Sem Instalação de App):**
   - Ao emitir a ficha no Totem, é gerado um QR Code com URL única (`/track/:token`).
   - Ao apontar a câmera do celular, abre instantaneamente a tela de acompanhamento mobile.
   - Conecta à sala privada do ticket via **WebSocket**.
   - Atualização em tempo real de posição na fila, tempo estimado, e alertas.

4. **Alerta de Chamada Sonoro e Vibratório:**
   - Quando o atendente chama a senha, o celular do paciente:
     - Emite sinal sonoro (Web Audio API bi-tonal de aeroporto/hospital).
     - Vibra o aparelho (se compatível).
     - Exibe banner de alta visibilidade: *"É A SUA VEZ! Dirija-se à Sala de Triagem 01"*.

5. **Fluxo Multi-Etapas de Saúde (Workflow de Salas):**
   - Exemplo clássico hospitalar:
     - **Etapa 1:** Triagem & Sinais Vitais (Enfermagem)
     - **Etapa 2:** Consulta Médica (Consultório)
     - **Etapa 3:** Exames Rápidos / Medicação (Sala de Procedimentos)
     - **Etapa 4:** Conclusão & Alta Médica (Recepção/Farmácia)
   - Ao concluir uma etapa, o paciente é automaticamente transferido para a fila da próxima sala.
   - O tempo médio é recalculado para a nova etapa e o celular do paciente atualiza na hora.
   - Suporte a desvio/pulo de etapas (médico pode liberar alta direta).

6. **Mapeamento Completo de Eventos WebSocket:**
   - `TICKET_CREATED`: Senha emitida no totem.
   - `QR_TRACKER_OPENED`: Paciente leu o QR Code e abriu no celular.
   - `TICKET_CALLED`: Paciente chamado no painel e no celular.
   - `TICKET_CALL_REPEAT`: Chamada repetida.
   - `STAGE_STARTED`: Atendimento iniciado pelo profissional.
   - `STAGE_COMPLETED`: Etapa concluída com anotações clínicas salvas.
   - `STAGE_TRANSFERRED`: Transferido para a fila da próxima sala.
   - `TICKET_COMPLETED`: Atendimento 100% finalizado.

7. **Painéis Integrados:**
   - 📱 **Rastreador Mobile (`/track/:token`):** Tela exclusiva do paciente.
   - 🖥️ **Totem de Autoatendimento:** Emissão de ficha com QR Code e tipo de fila (Normal, Preferencial, Urgência).
   - 🩺 **Painel do Operador / Médico:** Chamar próximo, rechamar, anotações clínicas e encaminhamento.
   - 📺 **Painel TV:** Display para salas de espera com avisos sonoros e sintetizador de voz.
   - ⚙️ **Painel Administrativo:** Gestor de etapas (criar/editar etapas), ajuste de margens e auditoria ao vivo.

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js 20+

### Iniciar o Sistema (Servidor Unificado: API + WebSocket + Frontend)
```bash
# Opção 1: Inicialização padrão local
npm start

# Opção 2: Iniciar servidor + túnel Cloudflare em 1 clique
# Dê duplo clique em: start-cloudflare.bat
# ou execute em terminais separados:
npm start
npm run tunnel
```

O servidor iniciará em:
- **Local:** `http://localhost:5000`
- **Rede Local (Wi-Fi):** `http://192.168.1.12:5000` *(IP detectado automaticamente)*
- **Internet / 4G (Cloudflare Tunnel):** `https://<seu-tunnel>.trycloudflare.com`

---

## 🌐 Testando de Qualquer Lugar com Cloudflare

1. Abra a URL pública do Cloudflare gerada pelo tunnel (ex: `https://xxxx.trycloudflare.com`).
2. Acesse no celular ou computador de qualquer lugar (mesmo fora do seu Wi-Fi, via 4G/5G).
3. Vá na aba **Totem** e emita uma senha.
4. O **QR Code** será gerado automaticamente com o link HTTPS público do Cloudflare!
5. Escaneie com qualquer celular: a tela de acompanhamento mobile abre na hora conectada ao WebSocket!
6. No computador (ou outro celular), vá na aba **Operador** e clique em **Chamar Próximo**: o celular emitirá o toque sonoro e o aviso de tela instantaneamente!
