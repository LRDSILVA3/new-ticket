const store = require('../db/store');

/**
 * Service to calculate real-time estimated waiting time with customizable tenant buffer
 */
class WaitTimeService {
  /**
   * Calculates wait time and queue statistics for a ticket at its current stage
   * @param {Object} ticket
   * @returns {Object} detailed calculation breakdown
   */
  calculateForTicket(ticket) {
    if (!ticket) return null;

    if (ticket.status === 'completed' || ticket.status === 'cancelled') {
      return {
        isWaiting: false,
        positionInQueue: 0,
        estimatedWaitMinutes: 0,
        totalJourneyEstimatedMinutes: 0,
        message: ticket.status === 'completed' ? 'Atendimento concluído' : 'Atendimento cancelado',
        breakdown: null
      };
    }

    if (ticket.status === 'called') {
      return {
        isWaiting: false,
        positionInQueue: 0,
        isCalled: true,
        counter: ticket.assigned_counter,
        operator: ticket.assigned_operator,
        estimatedWaitMinutes: 0,
        totalJourneyEstimatedMinutes: 0,
        message: `Você está sendo chamado(a) no ${ticket.assigned_counter}!`,
        breakdown: null
      };
    }

    if (ticket.status === 'in_progress') {
      return {
        isWaiting: false,
        positionInQueue: 0,
        isInProgress: true,
        counter: ticket.assigned_counter,
        operator: ticket.assigned_operator,
        estimatedWaitMinutes: 0,
        totalJourneyEstimatedMinutes: 0,
        message: `Em atendimento com ${ticket.assigned_operator} no ${ticket.assigned_counter}`,
        breakdown: null
      };
    }

    // Ticket is waiting in queue for current_stage_id
    const tenant = store.getTenantBySlug(ticket.tenant_id);
    const service = store.getServiceById(ticket.service_id);
    const stages = store.getStages(ticket.service_id);
    const currentStage = stages.find(s => s.id === ticket.current_stage_id) || stages[0];

    // Find all active tickets in the same tenant and current stage that are waiting or called
    const allTenantTickets = store.getTickets(ticket.tenant_id);
    const stageQueue = allTenantTickets.filter(t => 
      t.service_id === ticket.service_id &&
      t.current_stage_id === currentStage.id &&
      (t.status === 'waiting' || t.status === 'called')
    );

    // Sort queue by priority and created_at:
    // Urgência (1) > Preferencial (2) > Normal (3)
    const priorityWeight = { urgente: 1, preferencial: 2, normal: 3 };
    stageQueue.sort((a, b) => {
      const pa = priorityWeight[a.priority] || 3;
      const pb = priorityWeight[b.priority] || 3;
      if (pa !== pb) return pa - pb;
      return new Date(a.created_at) - new Date(b.created_at);
    });

    const ticketIndex = stageQueue.findIndex(t => t.id === ticket.id);
    const positionInQueue = ticketIndex >= 0 ? ticketIndex + 1 : 1;
    const peopleAhead = Math.max(0, positionInQueue - 1);

    // Calculate dynamic average service duration for this stage based on recent history
    const recentStageAvg = this.getRecentStageAverage(ticket.tenant_id, currentStage.id, currentStage.default_avg_minutes);

    // Active operators in this tenant/stage (default 1 to prevent div by 0)
    const activeOperators = 1; 

    // Base estimated wait time for this stage
    const baseWaitMinutes = Math.round((peopleAhead * recentStageAvg) / activeOperators);

    // Buffer calculation configured by the tenant (e.g. +10 mins or +20%)
    let bufferAddedMinutes = 0;
    const bufferType = tenant ? tenant.buffer_type : 'fixed_minutes';
    const bufferValue = tenant ? Number(tenant.buffer_value) || 0 : 0;

    if (bufferType === 'percentage') {
      bufferAddedMinutes = Math.round(baseWaitMinutes * (bufferValue / 100));
    } else {
      // 'fixed_minutes'
      bufferAddedMinutes = bufferValue;
    }

    // Total estimated wait for the NEXT call (minimum 2 minutes if someone is ahead, or buffer)
    const estimatedWaitMinutes = peopleAhead > 0 
      ? Math.max(2, baseWaitMinutes + bufferAddedMinutes)
      : Math.max(1, Math.round(bufferAddedMinutes / 2));

    // Calculate total downstream remaining journey (remaining stages)
    const currentStageOrder = currentStage.step_order;
    const remainingStages = stages.filter(s => s.step_order > currentStageOrder);
    const downstreamMinutes = remainingStages.reduce((acc, stg) => acc + (stg.default_avg_minutes || 10), 0);
    const totalJourneyEstimatedMinutes = estimatedWaitMinutes + (currentStage.default_avg_minutes || 8) + downstreamMinutes;

    return {
      isWaiting: true,
      positionInQueue,
      peopleAhead,
      currentStage: {
        id: currentStage.id,
        name: currentStage.name,
        stepOrder: currentStage.step_order,
        totalStages: stages.length,
        counterLabel: currentStage.counter_label,
        color: currentStage.color
      },
      estimatedWaitMinutes,
      totalJourneyEstimatedMinutes,
      breakdown: {
        baseMinutes: baseWaitMinutes,
        bufferType,
        bufferValue,
        bufferAddedMinutes,
        averageStageDuration: recentStageAvg,
        formula: bufferType === 'percentage'
          ? `(${peopleAhead} pessoas à frente × ${recentStageAvg} min) + ${bufferValue}% margem de segurança`
          : `(${peopleAhead} pessoas à frente × ${recentStageAvg} min) + ${bufferValue} min margem de segurança`
      }
    };
  }

  /**
   * Retrieves the moving average duration of completed visits in a stage
   */
  getRecentStageAverage(tenantId, stageId, fallbackMinutes) {
    const events = store.getAllEvents(tenantId, 200);
    const stageCompletions = events.filter(e => 
      e.stage_id === stageId && 
      e.event_type === 'STAGE_COMPLETED' && 
      e.payload && e.payload.durationMinutes
    );

    if (stageCompletions.length >= 3) {
      const sum = stageCompletions.slice(0, 10).reduce((acc, e) => acc + e.payload.durationMinutes, 0);
      return Math.round(sum / Math.min(stageCompletions.length, 10));
    }

    return fallbackMinutes || 10;
  }
}

module.exports = new WaitTimeService();

