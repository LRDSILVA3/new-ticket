const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const store = require('../db/store');
const waitTimeService = require('../services/waitTimeService');

function getLocalIp() {
  const nets = os.networkInterfaces();
  // Prefer Wi-Fi or Ethernet
  for (const name of Object.keys(nets)) {
    if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('ethernet') || name.toLowerCase().includes('wlan')) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) return net.address;
      }
    }
  }
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('172.')) return net.address;
    }
  }
  return 'localhost';
}

module.exports = function (io, wsHub) {
  // 1. Create a new Ticket (Kiosk / Totem / Reception / Virtual)
  router.post('/create', async (req, res) => {
    try {
      const { tenant_id, service_id, customer_name, customer_phone, priority = 'normal' } = req.body;

      const tenant = store.getTenantBySlug(tenant_id);
      if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

      const service = store.getServiceById(service_id);
      if (!service) return res.status(404).json({ error: 'Serviço não encontrado' });

      const stages = store.getStages(service.id);
      if (stages.length === 0) {
        return res.status(400).json({ error: 'Serviço não possui etapas configuradas' });
      }

      const initialStage = stages[0];

      // Sequential display number for today
      const today = new Date().toISOString().slice(0, 10);
      const todayTickets = store.data.tickets.filter(t => 
        t.tenant_id === tenant.id && 
        t.service_id === service.id && 
        t.created_at.startsWith(today)
      );
      const sequence = todayTickets.length + 1;
      const displayCode = `${service.code_prefix}-${String(sequence).padStart(3, '0')}`;

      // Generate secure unique tracking token
      const trackingToken = `tk_${uuidv4().replace(/-/g, '').slice(0, 8)}`;

      // Frontend tracking URL encoded in the QR code:
      // If accessed via Cloudflare Tunnel / public domain, use that public HTTPS URL!
      // Otherwise fallback to local Wi-Fi IP.
      let clientUrl = process.env.CLIENT_URL;
      if (!clientUrl) {
        const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host;
        const forwardedProto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
        if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1')) {
          clientUrl = `${forwardedProto}://${forwardedHost}`;
        } else {
          const hostIp = getLocalIp();
          const port = process.env.PORT || 5000;
          clientUrl = `http://${hostIp}:${port}`;
        }
      }
      const trackingUrl = `${clientUrl}/track/${trackingToken}`;

      // Generate QR Code data URL
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
        priority: priority || 'normal', // 'normal' | 'preferencial' | 'urgente'
        current_stage_id: initialStage.id,
        current_stage_order: initialStage.step_order,
        status: 'waiting', // 'waiting' | 'called' | 'in_progress' | 'transferred' | 'completed' | 'cancelled'
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

      // Log ticket creation event
      store.logEvent({
        ticket_id: newTicket.id,
        tenant_id: tenant.id,
        stage_id: initialStage.id,
        event_type: 'TICKET_CREATED',
        payload: {
          display_code: displayCode,
          service_name: service.name,
          initial_stage_name: initialStage.name,
          priority,
          message: `Ticket ${displayCode} emitido com sucesso para ${initialStage.name}`
        }
      });

      // Calculate initial wait time
      const waitInfo = waitTimeService.calculateForTicket(newTicket);

      // Broadcast to operator desk and admin
      io.to(`tenant:${tenant.id}:desk`).emit('ticket_created', {
        ticket: newTicket,
        stageId: initialStage.id
      });
      io.to(`tenant:${tenant.id}:admin`).emit('ticket_created', {
        ticket: newTicket
      });

      res.status(201).json({
        ticket: newTicket,
        qrCode: qrCodeDataUrl,
        trackingUrl,
        waitInfo
      });
    } catch (err) {
      console.error('Error generating ticket:', err);
      res.status(500).json({ error: 'Falha ao emitir ticket' });
    }
  });

  // 2. Track ticket by token (Public endpoint for patient QR code scan)
  router.get('/track/:token', (req, res) => {
    const ticket = store.getTicketByToken(req.params.token);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado ou expirado' });

    const fullData = wsHub.getFullTicketData(ticket);
    res.json(fullData);
  });

  // 3. List tickets for a tenant (with optional stage / status filters)
  router.get('/tenant/:tenantId', (req, res) => {
    const tenant = store.getTenantBySlug(req.params.tenantId);
    if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

    let tickets = store.getTickets(tenant.id);
    const { stage_id, status, service_id } = req.query;

    if (stage_id) tickets = tickets.filter(t => t.current_stage_id === stage_id);
    if (status) tickets = tickets.filter(t => t.status === status);
    if (service_id) tickets = tickets.filter(t => t.service_id === service_id);

    // Enrich each ticket with wait calculation
    const enriched = tickets.map(t => ({
      ...t,
      waitInfo: waitTimeService.calculateForTicket(t)
    }));

    res.json(enriched);
  });

  // 4. Operator calls a ticket to counter/room
  router.post('/call', (req, res) => {
    const { ticketId, counter, operatorName } = req.body;
    const ticket = store.getTicketById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

    const currentStage = store.getStageById(ticket.current_stage_id);
    const counterLabel = counter || (currentStage ? currentStage.counter_label : 'Guichê de Atendimento');
    const operator = operatorName || 'Atendente Responsável';

    const updated = store.updateTicket(ticket.id, {
      status: 'called',
      assigned_counter: counterLabel,
      assigned_operator: operator,
      call_count: (ticket.call_count || 0) + 1,
      called_at: new Date().toISOString()
    });

    // Log call event
    store.logEvent({
      ticket_id: ticket.id,
      tenant_id: ticket.tenant_id,
      stage_id: ticket.current_stage_id,
      event_type: 'TICKET_CALLED',
      payload: {
        counter: counterLabel,
        operator,
        stage_name: currentStage ? currentStage.name : 'Atendimento',
        call_count: updated.call_count,
        message: `${ticket.display_code} chamado para ${counterLabel} (${operator})`
      }
    });

    // Broadcast to public TV display
    io.to(`tenant:${ticket.tenant_id}:display`).emit('display:call', {
      ticketId: ticket.id,
      displayCode: ticket.display_code,
      customerName: ticket.customer_name,
      counter: counterLabel,
      stageName: currentStage ? currentStage.name : 'Atendimento',
      priority: ticket.priority,
      timestamp: new Date().toISOString()
    });

    // Update patient mobile & desks via WebSocket
    wsHub.broadcastTicketUpdate(ticket.id);

    res.json(updated);
  });

  // 5. Operator re-calls ticket (chime again)
  router.post('/recall', (req, res) => {
    const { ticketId } = req.body;
    const ticket = store.getTicketById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

    const currentStage = store.getStageById(ticket.current_stage_id);

    const updated = store.updateTicket(ticket.id, {
      call_count: (ticket.call_count || 0) + 1,
      called_at: new Date().toISOString()
    });

    store.logEvent({
      ticket_id: ticket.id,
      tenant_id: ticket.tenant_id,
      stage_id: ticket.current_stage_id,
      event_type: 'TICKET_CALL_REPEAT',
      payload: {
        counter: ticket.assigned_counter,
        operator: ticket.assigned_operator,
        call_count: updated.call_count,
        message: `Chamada repetida (${updated.call_count}ª vez) para ${ticket.assigned_counter}`
      }
    });

    // Broadcast urgent chime to TV
    io.to(`tenant:${ticket.tenant_id}:display`).emit('display:call', {
      ticketId: ticket.id,
      displayCode: ticket.display_code,
      customerName: ticket.customer_name,
      counter: ticket.assigned_counter,
      stageName: currentStage ? currentStage.name : 'Atendimento',
      priority: ticket.priority,
      isRepeat: true,
      timestamp: new Date().toISOString()
    });

    wsHub.broadcastTicketUpdate(ticket.id);
    res.json(updated);
  });

  // 6. Operator starts consultation/procedure
  router.post('/start', (req, res) => {
    const { ticketId } = req.body;
    const ticket = store.getTicketById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

    const currentStage = store.getStageById(ticket.current_stage_id);

    const updated = store.updateTicket(ticket.id, {
      status: 'in_progress',
      current_stage_started_at: new Date().toISOString()
    });

    store.logEvent({
      ticket_id: ticket.id,
      tenant_id: ticket.tenant_id,
      stage_id: ticket.current_stage_id,
      event_type: 'STAGE_STARTED',
      payload: {
        counter: ticket.assigned_counter,
        operator: ticket.assigned_operator,
        stage_name: currentStage ? currentStage.name : 'Atendimento',
        message: `Atendimento iniciado na etapa ${currentStage ? currentStage.name : ''}`
      }
    });

    wsHub.broadcastTicketUpdate(ticket.id);
    res.json(updated);
  });

  // 7. Operator completes current stage and advances or finishes
  router.post('/complete-stage', (req, res) => {
    const { ticketId, notes, skipToStageId } = req.body;
    const ticket = store.getTicketById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

    const stages = store.getStages(ticket.service_id);
    const currentStage = stages.find(s => s.id === ticket.current_stage_id);

    // Compute stage duration in minutes
    const startedAt = ticket.current_stage_started_at ? new Date(ticket.current_stage_started_at) : new Date(ticket.called_at || ticket.created_at);
    const durationMinutes = Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60000));

    // Save clinical note if present
    const updatedNotes = [...(ticket.clinical_notes || [])];
    if (notes && notes.trim()) {
      updatedNotes.push({
        stage_id: currentStage ? currentStage.id : 'unknown',
        stage_name: currentStage ? currentStage.name : 'Atendimento',
        operator: ticket.assigned_operator || 'Profissional',
        counter: ticket.assigned_counter || 'Sala',
        notes: notes.trim(),
        timestamp: new Date().toISOString()
      });
    }

    // Log completion of current stage
    store.logEvent({
      ticket_id: ticket.id,
      tenant_id: ticket.tenant_id,
      stage_id: ticket.current_stage_id,
      event_type: 'STAGE_COMPLETED',
      payload: {
        stage_name: currentStage ? currentStage.name : '',
        durationMinutes,
        notes: notes || '',
        message: `Etapa ${currentStage ? currentStage.name : ''} concluída (${durationMinutes} min)`
      }
    });

    // Determine next stage
    let nextStage = null;
    if (skipToStageId) {
      nextStage = stages.find(s => s.id === skipToStageId);
    } else {
      const currentOrder = currentStage ? currentStage.step_order : 1;
      nextStage = stages.find(s => s.step_order === currentOrder + 1);
    }

    if (nextStage) {
      // Advance to next stage queue
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

      // Log transfer event
      store.logEvent({
        ticket_id: ticket.id,
        tenant_id: ticket.tenant_id,
        stage_id: nextStage.id,
        event_type: 'STAGE_TRANSFERRED',
        payload: {
          previous_stage: currentStage ? currentStage.name : '',
          next_stage: nextStage.name,
          message: `Encaminhado para a fila de ${nextStage.name}`
        }
      });

      wsHub.broadcastTicketUpdate(ticket.id);
      return res.json({ ticket: updated, finished: false, nextStage });
    } else {
      // Completed all stages! Ticket finished!
      const updated = store.updateTicket(ticket.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        clinical_notes: updatedNotes
      });

      store.logEvent({
        ticket_id: ticket.id,
        tenant_id: ticket.tenant_id,
        stage_id: ticket.current_stage_id,
        event_type: 'TICKET_COMPLETED',
        payload: {
          totalStages: stages.length,
          message: `Atendimento integralmente concluído com sucesso!`
        }
      });

      wsHub.broadcastTicketUpdate(ticket.id);
      return res.json({ ticket: updated, finished: true });
    }
  });

  // 8. Cancel Ticket
  router.post('/cancel', (req, res) => {
    const { ticketId, reason } = req.body;
    const ticket = store.getTicketById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

    const updated = store.updateTicket(ticket.id, {
      status: 'cancelled',
      completed_at: new Date().toISOString()
    });

    store.logEvent({
      ticket_id: ticket.id,
      tenant_id: ticket.tenant_id,
      stage_id: ticket.current_stage_id,
      event_type: 'TICKET_CANCELLED',
      payload: {
        reason: reason || 'Cancelado pelo operador ou ausência do paciente',
        message: `Ticket cancelado (${reason || 'Não compareceu'})`
      }
    });

    wsHub.broadcastTicketUpdate(ticket.id);
    res.json(updated);
  });

  // 9. Get full event audit trail for a ticket
  router.get('/events/:ticketId', (req, res) => {
    const events = store.getTicketEvents(req.params.ticketId);
    res.json(events);
  });

  // 10. Get all events for tenant (real-time stream/audit)
  router.get('/tenant/:tenantId/events', (req, res) => {
    const tenant = store.getTenantBySlug(req.params.tenantId);
    if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });
    const events = store.getAllEvents(tenant.id, 100);
    res.json(events);
  });

  return router;
};
