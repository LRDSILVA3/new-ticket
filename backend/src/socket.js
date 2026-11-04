const store = require('./db/store');
const waitTimeService = require('./services/waitTimeService');

function setupWebSocket(io) {
  io.on('connection', (socket) => {
    // -------------------------------------------------------------
    // 1. PATIENT MOBILE TRACKER (Triggered when QR Code is scanned)
    // -------------------------------------------------------------
    socket.on('join_ticket', ({ trackingToken, userAgent }) => {
      if (!trackingToken) return;

      const ticket = store.getTicketByToken(trackingToken);
      if (!ticket) {
        socket.emit('error', { message: 'Ticket não encontrado.' });
        return;
      }

      socket.join(`ticket:${trackingToken}`);
      socket.join(`ticket:${ticket.id}`);
      console.log(`[WS] Socket ${socket.id} joined rooms for ${ticket.display_code} (${ticket.customer_name})`);

      // Log the event that the patient scanned and opened the QR tracker
      store.logEvent({
        ticket_id: ticket.id,
        tenant_id: ticket.tenant_id,
        stage_id: ticket.current_stage_id,
        event_type: 'QR_TRACKER_OPENED',
        payload: {
          userAgent: userAgent || 'Mobile Browser',
          socketId: socket.id,
          message: 'Paciente abriu o acompanhamento em tempo real via QR-Code'
        }
      });

      // Send immediate snapshot with wait time and workflow
      const fullSnapshot = getFullTicketData(ticket);
      socket.emit('ticket_snapshot', fullSnapshot);

      // Notify admin/desk that patient is online and watching
      io.to(`tenant:${ticket.tenant_id}:admin`).emit('ticket_patient_online', {
        ticketId: ticket.id,
        displayCode: ticket.display_code,
        openedAt: new Date().toISOString()
      });
    });

    // -------------------------------------------------------------
    // 2. TENANT ROOMS (TV Display, Desks, Admin)
    // -------------------------------------------------------------
    socket.on('join_tenant', ({ tenantId, role, stageId, operatorName }) => {
      if (!tenantId) return;

      socket.join(`tenant:${tenantId}:common`);

      if (role === 'display') {
        socket.join(`tenant:${tenantId}:display`);
      } else if (role === 'desk') {
        socket.join(`tenant:${tenantId}:desk`);
        if (stageId) {
          socket.join(`tenant:${tenantId}:stage:${stageId}`);
        }
      } else if (role === 'admin') {
        socket.join(`tenant:${tenantId}:admin`);
      }
    });

    // Change operator stage room
    socket.on('switch_stage_room', ({ tenantId, oldStageId, newStageId }) => {
      if (oldStageId) socket.leave(`tenant:${tenantId}:stage:${oldStageId}`);
      if (newStageId) socket.join(`tenant:${tenantId}:stage:${newStageId}`);
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  // Helper function to assemble complete ticket data
  function getFullTicketData(ticket) {
    const tenant = store.getTenantBySlug(ticket.tenant_id);
    const service = store.getServiceById(ticket.service_id);
    const stages = store.getStages(ticket.service_id);
    const events = store.getTicketEvents(ticket.id);
    const waitInfo = waitTimeService.calculateForTicket(ticket);

    return {
      ticket,
      tenant,
      service,
      stages,
      events,
      waitInfo
    };
  }

  // Broadcast helper when ticket state changes
  function broadcastTicketUpdate(ticketId) {
    const ticket = store.getTicketById(ticketId);
    if (!ticket) return;

    const fullData = getFullTicketData(ticket);

    // 1. Emit to patient's private room
    io.to(`ticket:${ticket.tracking_token}`).emit('ticket_updated', fullData);

    // 2. Emit to operator desks and admin
    io.to(`tenant:${ticket.tenant_id}:desk`).emit('desk_queue_updated', {
      ticketId: ticket.id,
      stageId: ticket.current_stage_id,
      status: ticket.status
    });
    io.to(`tenant:${ticket.tenant_id}:admin`).emit('admin_metric_updated', {
      ticketId: ticket.id,
      status: ticket.status
    });

    // 3. Recalculate and notify all waiting tickets in the same stage queue
    notifyQueueRecalculation(ticket.tenant_id, ticket.service_id, ticket.current_stage_id);
  }

  // Recalculates position and wait times for other patients waiting in the same queue
  function notifyQueueRecalculation(tenantId, serviceId, stageId) {
    const allTickets = store.getTickets(tenantId);
    const waitingTickets = allTickets.filter(t => 
      t.service_id === serviceId && 
      t.current_stage_id === stageId && 
      t.status === 'waiting'
    );

    waitingTickets.forEach(t => {
      const waitInfo = waitTimeService.calculateForTicket(t);
      io.to(`ticket:${t.tracking_token}`).emit('queue_position_updated', {
        ticketId: t.id,
        waitInfo
      });
    });
  }

  return {
    broadcastTicketUpdate,
    notifyQueueRecalculation,
    getFullTicketData
  };
}

module.exports = setupWebSocket;

