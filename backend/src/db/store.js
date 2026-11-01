const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/db.json');

const defaultData = {
  tenants: [
    {
      id: 'clinica-sao-rafael',
      slug: 'clinica-sao-rafael',
      name: 'Hospital & Centro Clínico São Rafael',
      tagline: 'Pronto Atendimento & Consultas Especializadas',
      theme_color: '#0d9488', // teal-600
      buffer_type: 'fixed_minutes', // 'fixed_minutes' | 'percentage'
      buffer_value: 10, // Margem de segurança de +10 min
      contact_phone: '(11) 3456-7890',
      address: 'Av. Paulista, 1500 - São Paulo, SP',
      created_at: new Date().toISOString()
    },
    {
      id: 'clinica-saude-total',
      slug: 'clinica-saude-total',
      name: 'Clínica Integrada Saúde Total',
      tagline: 'Atendimento Rápido e Humanizado',
      theme_color: '#2563eb', // blue-600
      buffer_type: 'percentage',
      buffer_value: 20, // +20% sobre o tempo médio
      contact_phone: '(21) 2233-4455',
      address: 'Rua das Laranjeiras, 300 - Rio de Janeiro, RJ',
      created_at: new Date().toISOString()
    }
  ],
  services: [
    {
      id: 'serv-pa',
      tenant_id: 'clinica-sao-rafael',
      name: 'Pronto Atendimento (PA)',
      description: 'Atendimento de urgência e emergência adulto e pediátrico',
      code_prefix: 'PA',
      active: true,
      stages: ['stg-triagem', 'stg-consulta', 'stg-exames', 'stg-alta']
    },
    {
      id: 'serv-ambulatorio',
      tenant_id: 'clinica-sao-rafael',
      name: 'Consultório Especializado / Eletivo',
      description: 'Consultas agendadas com especialistas (Cardio, Ortopedia, Geral)',
      code_prefix: 'MED',
      active: true,
      stages: ['stg-recepcao', 'stg-consulta', 'stg-alta']
    },
    {
      id: 'serv-lab',
      tenant_id: 'clinica-saude-total',
      name: 'Exames & Diagnósticos Rápidos',
      description: 'Coletas laboratoriais e imagens',
      code_prefix: 'LAB',
      active: true,
      stages: ['stg-lab-recepcao', 'stg-lab-coleta', 'stg-lab-entrega']
    }
  ],
  stages: [
    // Stages for Pronto Atendimento
    {
      id: 'stg-triagem',
      tenant_id: 'clinica-sao-rafael',
      service_id: 'serv-pa',
      step_order: 1,
      name: 'Triagem & Classificação de Risco',
      counter_label: 'Sala de Triagem / Enfermagem',
      default_avg_minutes: 8,
      color: '#3b82f6', // blue
      icon: 'Activity',
      description: 'Aferição de sinais vitais, pressão, saturação e protocolo de Manchester',
      allow_notes: true,
      can_skip: false
    },
    {
      id: 'stg-consulta',
      tenant_id: 'clinica-sao-rafael',
      service_id: 'serv-pa',
      step_order: 2,
      name: 'Consulta Médica',
      counter_label: 'Consultório Médico',
      default_avg_minutes: 18,
      color: '#10b981', // green
      icon: 'Stethoscope',
      description: 'Avaliação clínica completa pelo médico plantonista e conduta terapêutica',
      allow_notes: true,
      can_skip: false
    },
    {
      id: 'stg-exames',
      tenant_id: 'clinica-sao-rafael',
      service_id: 'serv-pa',
      step_order: 3,
      name: 'Exames Rápidos / Medicação',
      counter_label: 'Sala de Procedimentos & Medicação',
      default_avg_minutes: 20,
      color: '#f59e0b', // amber
      icon: 'FlaskConical',
      description: 'Administração de soro/medicação injetável ou exames complementares',
      allow_notes: true,
      can_skip: true
    },
    {
      id: 'stg-alta',
      tenant_id: 'clinica-sao-rafael',
      service_id: 'serv-pa',
      step_order: 4,
      name: 'Conclusão & Alta Médica',
      counter_label: 'Recepção de Alta / Farmácia',
      default_avg_minutes: 5,
      color: '#8b5cf6', // purple
      icon: 'CheckCircle2',
      description: 'Liberação do paciente, entrega de receitas, atestados e orientações',
      allow_notes: true,
      can_skip: false
    },

    // Stages for Ambulatório
    {
      id: 'stg-recepcao',
      tenant_id: 'clinica-sao-rafael',
      service_id: 'serv-ambulatorio',
      step_order: 1,
      name: 'Acolhimento & Cadastro',
      counter_label: 'Guichê de Atendimento',
      default_avg_minutes: 5,
      color: '#6366f1',
      icon: 'UserCheck',
      description: 'Conferência de documentos e abertura de prontuário',
      allow_notes: false,
      can_skip: false
    },

    // Stages for Laboratório
    {
      id: 'stg-lab-recepcao',
      tenant_id: 'clinica-saude-total',
      service_id: 'serv-lab',
      step_order: 1,
      name: 'Check-in e Guia',
      counter_label: 'Guichê Laboratorial',
      default_avg_minutes: 6,
      color: '#06b6d4',
      icon: 'FileText',
      description: 'Validação do pedido médico',
      allow_notes: false,
      can_skip: false
    },
    {
      id: 'stg-lab-coleta',
      tenant_id: 'clinica-saude-total',
      service_id: 'serv-lab',
      step_order: 2,
      name: 'Coleta de Amostras',
      counter_label: 'Box de Coleta',
      default_avg_minutes: 10,
      color: '#f97316',
      icon: 'Syringe',
      description: 'Coleta de sangue e materiais biológicos',
      allow_notes: true,
      can_skip: false
    },
    {
      id: 'stg-lab-entrega',
      tenant_id: 'clinica-saude-total',
      service_id: 'serv-lab',
      step_order: 3,
      name: 'Finalização & Protocolo',
      counter_label: 'Recepção de Saída',
      default_avg_minutes: 4,
      color: '#10b981',
      icon: 'CheckCircle2',
      description: 'Entrega do protocolo de resultados online',
      allow_notes: false,
      can_skip: false
    }
  ],
  tickets: [],
  ticket_events: [],
  operators: [
    { id: 'op-1', tenant_id: 'clinica-sao-rafael', name: 'Enfª. Mariana Souza', role: 'Triagem', default_counter: 'Sala de Triagem 01' },
    { id: 'op-2', tenant_id: 'clinica-sao-rafael', name: 'Dr. Roberto Santos', role: 'Médico', default_counter: 'Consultório 03' },
    { id: 'op-3', tenant_id: 'clinica-sao-rafael', name: 'Dra. Beatriz Lima', role: 'Médico', default_counter: 'Consultório 05' },
    { id: 'op-4', tenant_id: 'clinica-sao-rafael', name: 'Téc. Fernando Alves', role: 'Procedimentos', default_counter: 'Sala de Medicação' }
  ]
};

class Store {
  constructor() {
    this.data = defaultData;
    this.init();
  }

  init() {
    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure default properties exist
        if (!this.data.tenants) this.data = defaultData;
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Error initializing store, falling back to default:', err);
      this.data = defaultData;
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving store to disk:', err);
    }
  }

  // --- Tenants ---
  getTenants() {
    return this.data.tenants;
  }

  getTenantBySlug(slug) {
    return this.data.tenants.find(t => t.slug === slug || t.id === slug);
  }

  updateTenant(id, updates) {
    const tenant = this.data.tenants.find(t => t.id === id || t.slug === id);
    if (!tenant) return null;
    Object.assign(tenant, updates);
    this.save();
    return tenant;
  }

  // --- Services ---
  getServices(tenantId) {
    return this.data.services.filter(s => s.tenant_id === tenantId);
  }

  getServiceById(serviceId) {
    return this.data.services.find(s => s.id === serviceId);
  }

  createService(serviceData) {
    this.data.services.push(serviceData);
    this.save();
    return serviceData;
  }

  // --- Stages ---
  getStages(serviceId) {
    return this.data.stages
      .filter(s => s.service_id === serviceId)
      .sort((a, b) => a.step_order - b.step_order);
  }

  getStageById(stageId) {
    return this.data.stages.find(s => s.id === stageId);
  }

  updateStage(stageId, updates) {
    const stage = this.data.stages.find(s => s.id === stageId);
    if (!stage) return null;
    Object.assign(stage, updates);
    this.save();
    return stage;
  }

  createStage(stageData) {
    this.data.stages.push(stageData);
    this.save();
    return stageData;
  }

  deleteStage(stageId) {
    const idx = this.data.stages.findIndex(s => s.id === stageId);
    if (idx !== -1) {
      this.data.stages.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  // --- Tickets ---
  getTickets(tenantId) {
    return this.data.tickets.filter(t => t.tenant_id === tenantId);
  }

  getTicketById(ticketId) {
    return this.data.tickets.find(t => t.id === ticketId);
  }

  getTicketByToken(token) {
    return this.data.tickets.find(t => t.tracking_token === token);
  }

  createTicket(ticket) {
    this.data.tickets.push(ticket);
    this.save();
    return ticket;
  }

  updateTicket(ticketId, updates) {
    const ticket = this.data.tickets.find(t => t.id === ticketId);
    if (!ticket) return null;
    Object.assign(ticket, updates, { updated_at: new Date().toISOString() });
    this.save();
    return ticket;
  }

  // --- Events ---
  logEvent(event) {
    const record = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...event
    };
    this.data.ticket_events.push(record);
    this.save();
    return record;
  }

  getTicketEvents(ticketId) {
    return this.data.ticket_events
      .filter(e => e.ticket_id === ticketId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  getAllEvents(tenantId, limit = 100) {
    return this.data.ticket_events
      .filter(e => e.tenant_id === tenantId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // --- Operators ---
  getOperators(tenantId) {
    return this.data.operators.filter(o => o.tenant_id === tenantId);
  }
}

module.exports = new Store();

