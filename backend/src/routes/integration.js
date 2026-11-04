const express = require('express');
const router = express.Router();
const store = require('../db/store');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const waitTimeService = require('../services/waitTimeService');
const webhookService = require('../services/webhookService');

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('ethernet') || name.toLowerCase().includes('wlan')) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) return net.address;
      }
    }
  }
  return 'localhost';
}

// Authentication Middleware via API Key
function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || 
    (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '') : null);

  if (!apiKey) {
    return res.status(401).json({
      error: 'Autenticação necessária.',
      message: 'Envie o cabeçalho "x-api-key: nq_live_..." ou "Authorization: Bearer <sua_chave>"'
    });
  }

  const tenant = store.getTenantByApiKey(apiKey);
  if (!tenant) {
    return res.status(403).json({
      error: 'Acesso negado.',
      message: 'Chave de API inválida ou revogada para este ambiente.'
    });
  }

  req.tenant = tenant;
  next();
}

module.exports = function (io, wsHub) {
  // All routes below require valid API Key
  router.use(authenticateApiKey);

  // 1. Emissão de Ticket (Totem Externo / ERP de Recepção)
  router.post('/tickets', async (req, res) => {
    try {
      const tenant = req.tenant;
      const { 
        service_id, 
        service_code, 
        customer_name, 
        customer_phone, 
        customer_document,
        priority = 'normal',
        external_reference_id,
        metadata
      } = req.body;

      // Find service
      let service = null;
      if (service_id) {
        service = store.getServiceById(service_id);
      } else if (service_code) {
        const services = store.getServices(tenant.id);
        service = services.find(s => s.code_prefix.toUpperCase() === service_code.toUpperCase());
      } else {
        const services = store.getServices(tenant.id);
        service = services[0];
      }

      if (!service) {
        return res.status(404).json({ error: 'Serviço não encontrado para este tenant' });
      }

      const stages = store.getStages(service.id);
      if (stages.length === 0) {
        return res.status(400).json({ error: 'O serviço selecionado não possui etapas configuradas' });
      }

      const initialStage = stages[0];

      // Sequential display code for today (never duplicate active codes)
      const today = new Date().toISOString().slice(0, 10);
      const todayTickets = store.data.tickets.filter(t => 
        t.tenant_id === tenant.id && 
        t.service_id === service.id && 
        t.created_at.startsWith(today)
      );
      let sequence = todayTickets.length + 1;
      let displayCode = `${service.code_prefix}-${String(sequence).padStart(3, '0')}`;
      const activeCodes = new Set(
        store.data.tickets
          .filter(t => t.tenant_id === tenant.id && t.status !== 'completed' && t.status !== 'cancelled')
          .map(t => t.display_code)
      );
      while (activeCodes.has(displayCode)) {
        sequence++;
        displayCode = `${service.code_prefix}-${String(sequence).padStart(3, '0')}`;
      }

      const trackingToken = `tk_${uuidv4().replace(/-/g, '').slice(0, 8)}`;

      // Resolve public client URL
      let clientUrl = process.env.CLIENT_URL;
      if (!clientUrl) {
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const hostHeader = req.headers['x-forwarded-host'] || req.get('host') || req.hostname;
        if (hostHeader.startsWith('localhost') || hostHeader.startsWith('127.0.0.1')) {
          const port = process.env.PORT || 5000;
          clientUrl = `http://${getLocalIp()}:${port}`;
        } else {
          clientUrl = `${proto}://${hostHeader}`;
        }
      }
      const trackingUrl = `${clientUrl}/track/${trackingToken}`;

      // Generate base64 QR Code (ready for thermal printer / kiosk UI)
      const qrCodeDataUrl = await QRCode.toDataURL(trackingUrl, {
        margin: 2,
        width: 320,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });

      const newTicket = {
        id: `tkt-${uuidv4().slice(0, 8)}`,
        tenant_id: tenant.id,
        service_id: service.id,
        tracking_token: trackingToken,
        tracking_url: trackingUrl,
        display_code: displayCode,
        customer_name: customer_name || 'Paciente / Visitante',
        customer_phone: customer_phone || '',
        customer_document: customer_document || '',
        priority,
        external_reference_id: external_reference_id || null,
        metadata: metadata || null,
        current_stage_id: initialStage.id,
        current_stage_order: initialStage.step_order,
        status: 'waiting',
        assigned_counter: null,
        assigned_operator: null,
        call_count: 0,
        called_at: null,
        current_stage_started_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
        clinical_notes: []
      };

      store.createTicket(newTicket);

      // Audit event
      store.logEvent({
        ticket_id: newTicket.id,
        tenant_id: tenant.id,
        stage_id: initialStage.id,
        event_type: 'TICKET_CREATED',
        payload: {
          display_code: displayCode,
          service_name: service.name,
          initial_stage_name: initialStage.name,
          source: 'integration_api',
          external_reference_id
        }
      });

      const waitInfo = waitTimeService.calculateForTicket(newTicket);

      // Broadcast to operator desks and TV
      io.to(`tenant:${tenant.id}:desk`).emit('ticket_created', {
        ticket: newTicket,
        stageId: initialStage.id
      });
      io.to(`tenant:${tenant.id}:admin`).emit('ticket_created', {
        ticket: newTicket
      });

      // Dispatch Outbound Webhook
      webhookService.dispatchWebhook(tenant, 'ticket.created', {
        ticket: newTicket,
        wait_info: waitInfo,
        tracking_url: trackingUrl
      });

      res.status(201).json({
        ticket_id: newTicket.id,
        display_code: displayCode,
        tracking_token: trackingToken,
        tracking_url: trackingUrl,
        qr_code_base64: qrCodeDataUrl,
        service: {
          id: service.id,
          name: service.name,
          code_prefix: service.code_prefix
        },
        initial_stage: {
          id: initialStage.id,
          name: initialStage.name,
          counter_label: initialStage.counter_label
        },
        queue_position: waitInfo.positionInQueue,
        estimated_wait_minutes: waitInfo.estimatedWaitMinutes,
        buffer_applied: tenant.buffer_type === 'percentage' 
          ? `+${tenant.buffer_value}% de margem` 
          : `+${tenant.buffer_value} min de margem`
      });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Falha ao emitir ticket via integração' });
    }
  });

  // 2. Chamar Próximo da Fila (Acionado pelo PEP / Prontuário do Médico Externo)
  router.post('/tickets/call-next', (req, res) => {
    try {
      const tenant = req.tenant;
      const { stage_id, service_id, counter, operator_name } = req.body;

      let allWaiting = store.getTickets(tenant.id).filter(t => t.status === 'waiting');

      if (service_id) allWaiting = allWaiting.filter(t => t.service_id === service_id);
      if (stage_id) allWaiting = allWaiting.filter(t => t.current_stage_id === stage_id);

      // Priority sort: urgente > preferencial > normal, then by created_at
      const priorityOrder = { urgente: 1, preferencial: 2, normal: 3 };
      allWaiting.sort((a, b) => {
        const pDiff = (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
        if (pDiff !== 0) return pDiff;
        return new Date(a.created_at) - new Date(b.created_at);
      });

      if (allWaiting.length === 0) {
        return res.status(404).json({
          error: 'Fila vazia',
          message: 'Nenhum paciente aguardando atendimento para os critérios informados'
        });
      }

      const nextTicket = allWaiting[0];
      const currentStage = store.getStageById(nextTicket.current_stage_id);
      const counterLabel = counter || (currentStage ? currentStage.counter_label : 'Guichê de Atendimento');
      const operator = operator_name || 'Profissional Responsável';

      const updated = store.updateTicket(nextTicket.id, {
        status: 'called',
        assigned_counter: counterLabel,
        assigned_operator: operator,
        call_count: (nextTicket.call_count || 0) + 1,
        called_at: new Date().toISOString()
      });

      // Audit event
      store.logEvent({
        ticket_id: nextTicket.id,
        tenant_id: tenant.id,
        stage_id: nextTicket.current_stage_id,
        event_type: 'TICKET_CALLED',
        payload: {
          counter: counterLabel,
          operator,
          stage_name: currentStage?.name,
          call_count: updated.call_count,
          source: 'integration_api'
        }
      });

      // Emit urgent call event to patient mobile
      io.to(`ticket:${nextTicket.tracking_token}`).emit('ticket_called', {
        ticket: updated,
        counter: counterLabel,
        operator,
        call_count: updated.call_count
      });
      io.to(`ticket:${nextTicket.id}`).emit('ticket_called', {
        ticket: updated,
        counter: counterLabel,
        operator,
        call_count: updated.call_count
      });

      // Broadcast to TV
      io.to(`tenant:${tenant.id}:display`).emit('display:call', {
        ticketId: nextTicket.id,
        displayCode: nextTicket.display_code,
        customerName: nextTicket.customer_name,
        counter: counterLabel,
        stageName: currentStage?.name || 'Atendimento',
        priority: nextTicket.priority,
        timestamp: new Date().toISOString()
      });

      wsHub.broadcastTicketUpdate(nextTicket.id);

      // Dispatch Webhook
      webhookService.dispatchWebhook(tenant, 'ticket.called', {
        ticket: updated,
        counter: counterLabel,
        operator,
        stage: currentStage
      });

      res.json({
        message: 'Paciente chamado com sucesso',
        ticket: updated,
        counter: counterLabel,
        operator
      });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Erro ao chamar próximo da fila' });
    }
  });

  // 3. Rechamar Ticket
  router.post('/tickets/:id/recall', (req, res) => {
    const tenant = req.tenant;
    const ticket = store.getTicketById(req.params.id);
    if (!ticket || ticket.tenant_id !== tenant.id) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    const currentStage = store.getStageById(ticket.current_stage_id);
    const updated = store.updateTicket(ticket.id, {
      status: 'called',
      call_count: (ticket.call_count || 0) + 1,
      called_at: new Date().toISOString()
    });

    store.logEvent({
      ticket_id: ticket.id,
      tenant_id: tenant.id,
      stage_id: ticket.current_stage_id,
      event_type: 'TICKET_CALL_REPEAT',
      payload: {
        counter: ticket.assigned_counter,
        operator: ticket.assigned_operator,
        call_count: updated.call_count,
        source: 'integration_api'
      }
    });

    io.to(`ticket:${ticket.tracking_token}`).emit('ticket_called', {
      ticket: updated,
      counter: ticket.assigned_counter,
      operator: ticket.assigned_operator,
      call_count: updated.call_count,
      isRepeat: true
    });
    io.to(`ticket:${ticket.id}`).emit('ticket_called', {
      ticket: updated,
      counter: ticket.assigned_counter,
      operator: ticket.assigned_operator,
      call_count: updated.call_count,
      isRepeat: true
    });

    io.to(`tenant:${tenant.id}:display`).emit('display:call', {
      ticketId: ticket.id,
      displayCode: ticket.display_code,
      customerName: ticket.customer_name,
      counter: ticket.assigned_counter,
      stageName: currentStage?.name || 'Atendimento',
      priority: ticket.priority,
      isRepeat: true,
      timestamp: new Date().toISOString()
    });

    wsHub.broadcastTicketUpdate(ticket.id);

    webhookService.dispatchWebhook(tenant, 'ticket.recalled', {
      ticket: updated
    });

    res.json({ message: 'Chamada repetida com sucesso', ticket: updated });
  });

  // 4. Iniciar Consulta / Procedimento
  router.post('/tickets/:id/start', (req, res) => {
    const tenant = req.tenant;
    const ticket = store.getTicketById(req.params.id);
    if (!ticket || ticket.tenant_id !== tenant.id) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    const currentStage = store.getStageById(ticket.current_stage_id);
    const updated = store.updateTicket(ticket.id, {
      status: 'in_progress',
      current_stage_started_at: new Date().toISOString()
    });

    store.logEvent({
      ticket_id: ticket.id,
      tenant_id: tenant.id,
      stage_id: ticket.current_stage_id,
      event_type: 'STAGE_STARTED',
      payload: {
        stage_name: currentStage?.name,
        operator: ticket.assigned_operator,
        source: 'integration_api'
      }
    });

    wsHub.broadcastTicketUpdate(ticket.id);

    webhookService.dispatchWebhook(tenant, 'ticket.stage_started', {
      ticket: updated,
      stage: currentStage
    });

    res.json({ message: 'Atendimento iniciado', ticket: updated });
  });

  // 5. Concluir Etapa e Encaminhar para a Próxima (ou Alta)
  router.post('/tickets/:id/complete-stage', (req, res) => {
    const tenant = req.tenant;
    const ticket = store.getTicketById(req.params.id);
    if (!ticket || ticket.tenant_id !== tenant.id) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    const { clinical_notes, skip_to_stage_id } = req.body;
    const stages = store.getStages(ticket.service_id);
    const currentIndex = stages.findIndex(s => s.id === ticket.current_stage_id);
    const currentStage = stages[currentIndex];

    // Build stage clinical notes
    const noteEntry = {
      stage_id: currentStage?.id,
      stage_name: currentStage?.name,
      operator: ticket.assigned_operator || 'Profissional',
      counter: ticket.assigned_counter || 'Sala',
      notes: typeof clinical_notes === 'string' ? clinical_notes : (clinical_notes?.text || 'Etapa concluída'),
      timestamp: new Date().toISOString()
    };

    const updatedNotes = [...(ticket.clinical_notes || []), noteEntry];

    // Determine next stage
    let nextStage = null;
    if (skip_to_stage_id) {
      nextStage = stages.find(s => s.id === skip_to_stage_id);
    } else if (currentIndex < stages.length - 1) {
      nextStage = stages[currentIndex + 1];
    }

    if (nextStage) {
      // Transfer to next queue
      const updated = store.updateTicket(ticket.id, {
        current_stage_id: nextStage.id,
        current_stage_order: nextStage.step_order,
        status: 'waiting',
        assigned_counter: null,
        assigned_operator: null,
        call_count: 0,
        called_at: null,
        current_stage_started_at: null,
        clinical_notes: updatedNotes
      });

      store.logEvent({
        ticket_id: ticket.id,
        tenant_id: tenant.id,
        stage_id: nextStage.id,
        event_type: 'STAGE_TRANSFERRED',
        payload: {
          from_stage: currentStage?.name,
          to_stage: nextStage.name,
          notes: noteEntry.notes,
          source: 'integration_api'
        }
      });

      wsHub.broadcastTicketUpdate(ticket.id);

      webhookService.dispatchWebhook(tenant, 'ticket.stage_transferred', {
        ticket: updated,
        from_stage: currentStage,
        to_stage: nextStage,
        note: noteEntry
      });

      return res.json({
        message: `Paciente transferido para a fila de ${nextStage.name}`,
        status: 'transferred',
        next_stage: nextStage,
        ticket: updated
      });
    } else {
      // Completed ticket (Alta médica / finalizado)
      const updated = store.updateTicket(ticket.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        clinical_notes: updatedNotes
      });

      store.logEvent({
        ticket_id: ticket.id,
        tenant_id: tenant.id,
        stage_id: currentStage?.id,
        event_type: 'TICKET_COMPLETED',
        payload: {
          total_duration_minutes: Math.round((new Date() - new Date(ticket.created_at)) / 60000),
          notes: noteEntry.notes,
          source: 'integration_api'
        }
      });

      wsHub.broadcastTicketUpdate(ticket.id);

      webhookService.dispatchWebhook(tenant, 'ticket.completed', {
        ticket: updated,
        completed_at: updated.completed_at
      });

      return res.json({
        message: 'Atendimento concluído e paciente liberado!',
        status: 'completed',
        ticket: updated
      });
    }
  });

  // 6. Cancelar Ticket
  router.post('/tickets/:id/cancel', (req, res) => {
    const tenant = req.tenant;
    const ticket = store.getTicketById(req.params.id);
    if (!ticket || ticket.tenant_id !== tenant.id) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    const { reason = 'Cancelado via API externa' } = req.body;
    const updated = store.updateTicket(ticket.id, {
      status: 'cancelled',
      completed_at: new Date().toISOString()
    });

    store.logEvent({
      ticket_id: ticket.id,
      tenant_id: tenant.id,
      stage_id: ticket.current_stage_id,
      event_type: 'TICKET_CANCELLED',
      payload: { reason, source: 'integration_api' }
    });

    wsHub.broadcastTicketUpdate(ticket.id);

    webhookService.dispatchWebhook(tenant, 'ticket.cancelled', {
      ticket: updated,
      reason
    });

    res.json({ message: 'Ticket cancelado com sucesso', ticket: updated });
  });

  // 7. Status e Métricas da Fila em Tempo Real (Para telas/dashboards de terceiros)
  router.get('/queue/status', (req, res) => {
    const tenant = req.tenant;
    const services = store.getServices(tenant.id);
    const tickets = store.getTickets(tenant.id);

    const activeTickets = tickets.filter(t => t.status !== 'completed' && t.status !== 'cancelled');

    const serviceSummaries = services.map(srv => {
      const srvTickets = activeTickets.filter(t => t.service_id === srv.id);
      const stages = store.getStages(srv.id);

      const stagesBreakdown = stages.map(st => {
        const waitingCount = srvTickets.filter(t => t.current_stage_id === st.id && t.status === 'waiting').length;
        const inServiceCount = srvTickets.filter(t => t.current_stage_id === st.id && (t.status === 'called' || t.status === 'in_progress')).length;
        return {
          stage_id: st.id,
          stage_name: st.name,
          step_order: st.step_order,
          counter_label: st.counter_label,
          waiting_count: waitingCount,
          in_service_count: inServiceCount,
          default_avg_minutes: st.default_avg_minutes
        };
      });

      return {
        service_id: srv.id,
        service_name: srv.name,
        code_prefix: srv.code_prefix,
        total_active_tickets: srvTickets.length,
        stages: stagesBreakdown
      };
    });

    res.json({
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        buffer_type: tenant.buffer_type,
        buffer_value: tenant.buffer_value
      },
      total_active_queue: activeTickets.length,
      services: serviceSummaries,
      timestamp: new Date().toISOString()
    });
  });

  // 8. Teste de Webhook
  router.post('/webhook/test', async (req, res) => {
    try {
      const result = await webhookService.testWebhook(req.tenant, req.body?.target_url);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
};
