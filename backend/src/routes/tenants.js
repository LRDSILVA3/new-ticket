const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { v4: uuidv4 } = require('uuid');
const webhookService = require('../services/webhookService');

// 1. List all tenants (Master Admin)
router.get('/', (req, res) => {
  const tenants = store.getTenants();
  res.json(tenants);
});

// 2. Create new client account / tenant (Super Admin)
router.post('/', (req, res) => {
  try {
    const { 
      name, 
      slug: customSlug, 
      tagline, 
      contact_phone, 
      address, 
      theme_color = '#0d9488', 
      accent_color = '#06b6d4', 
      ticket_theme = 'dark',
      ticket_banner_message,
      ticket_footer_message,
      logo_icon = '🏥',
      buffer_type = 'fixed_minutes',
      buffer_value = 10
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'O nome da empresa/clínica é obrigatório' });
    }

    // Auto-generate slug if not provided
    const slug = (customSlug || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'))
      .toLowerCase()
      .trim();

    if (store.getTenantBySlug(slug)) {
      return res.status(400).json({ error: `Já existe uma empresa cadastrada com o slug "${slug}"` });
    }

    const tenantId = slug;
    const apiKey = `nq_live_${slug}_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

    const newTenant = {
      id: tenantId,
      slug,
      name,
      tagline: tagline || 'Atendimento Digital Inteligente',
      theme_color,
      accent_color,
      logo_icon,
      buffer_type,
      buffer_value: Number(buffer_value) || 10,
      contact_phone: contact_phone || '',
      address: address || '',
      api_key: apiKey,
      webhook_url: '',
      webhook_secret: `sec_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
      ticket_theme,
      ticket_banner_message: ticket_banner_message || 'Apresente um documento com foto ao ser chamado(a).',
      ticket_footer_message: ticket_footer_message || 'Wi-Fi: Visitantes | Dúvidas? Procure a recepção.',
      created_at: new Date().toISOString()
    };

    store.createTenant(newTenant);

    // Auto-generate an initial starter service with workflow stages
    const serviceId = `serv-${Date.now()}`;
    const initialStages = [
      {
        id: `stg-${Date.now()}-1`,
        tenant_id: tenantId,
        service_id: serviceId,
        step_order: 1,
        name: 'Acolhimento & Triagem',
        counter_label: 'Guichê de Entrada 01',
        default_avg_minutes: 8,
        color: '#3b82f6',
        icon: 'Activity',
        description: 'Conferência de dados, queixa principal e triagem inicial',
        allow_notes: true,
        can_skip: false
      },
      {
        id: `stg-${Date.now()}-2`,
        tenant_id: tenantId,
        service_id: serviceId,
        step_order: 2,
        name: 'Atendimento Especializado',
        counter_label: 'Sala / Consultório 01',
        default_avg_minutes: 15,
        color: '#10b981',
        icon: 'Stethoscope',
        description: 'Atendimento principal pelo profissional responsável',
        allow_notes: true,
        can_skip: false
      }
    ];

    initialStages.forEach(st => store.createStage(st));

    const defaultService = {
      id: serviceId,
      tenant_id: tenantId,
      name: 'Atendimento Geral',
      description: 'Fluxo padrão de atendimento ao cliente / paciente',
      code_prefix: 'AT',
      active: true,
      stages: initialStages.map(s => s.id)
    };

    store.createService(defaultService);

    res.status(201).json({
      tenant: newTenant,
      defaultService,
      stagesCount: initialStages.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro ao criar conta de cliente' });
  }
});

// 3. Get tenant by slug or id
router.get('/:slug', (req, res) => {
  const tenant = store.getTenantBySlug(req.params.slug);
  if (!tenant) return res.status(404).json({ error: 'Empresa/Tenant não encontrada' });
  res.json(tenant);
});

// 4. Regenerate API Token for tenant
router.post('/:slug/regenerate-token', (req, res) => {
  const tenant = store.getTenantBySlug(req.params.slug);
  if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

  const newKey = `nq_live_${tenant.slug}_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  const updated = store.updateTenant(tenant.id, { api_key: newKey });
  res.json({ api_key: newKey, tenant: updated });
});

// 5. Update tenant styling & branding (White-Label)
router.put('/:slug/styling', (req, res) => {
  const tenant = store.getTenantBySlug(req.params.slug);
  if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

  const {
    theme_color,
    accent_color,
    logo_icon,
    ticket_theme,
    ticket_banner_message,
    ticket_footer_message,
    name,
    tagline
  } = req.body;

  const updates = {};
  if (theme_color) updates.theme_color = theme_color;
  if (accent_color) updates.accent_color = accent_color;
  if (logo_icon) updates.logo_icon = logo_icon;
  if (ticket_theme) updates.ticket_theme = ticket_theme;
  if (ticket_banner_message !== undefined) updates.ticket_banner_message = ticket_banner_message;
  if (ticket_footer_message !== undefined) updates.ticket_footer_message = ticket_footer_message;
  if (name) updates.name = name;
  if (tagline !== undefined) updates.tagline = tagline;

  const updated = store.updateTenant(tenant.id, updates);
  res.json(updated);
});

// 6. Update tenant webhook settings
router.put('/:slug/webhook', (req, res) => {
  const tenant = store.getTenantBySlug(req.params.slug);
  if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

  const { webhook_url, webhook_secret } = req.body;
  const updated = store.updateTenant(tenant.id, {
    webhook_url: webhook_url || '',
    webhook_secret: webhook_secret || tenant.webhook_secret || `sec_${uuidv4().replace(/-/g, '').slice(0, 16)}`
  });

  res.json(updated);
});

// 7. Test webhook dispatch
router.post('/:slug/webhook/test', async (req, res) => {
  const tenant = store.getTenantBySlug(req.params.slug);
  if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

  if (!tenant.webhook_url) {
    return res.status(400).json({ error: 'Configure uma URL de webhook antes de testar' });
  }

  try {
    const result = await webhookService.testWebhook(tenant, req.body?.target_url);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Falha ao testar webhook' });
  }
});

// 8. Delete tenant (Super Admin)
router.delete('/:slug', (req, res) => {
  const tenant = store.getTenantBySlug(req.params.slug);
  if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

  store.deleteTenant(tenant.id);
  res.json({ success: true, message: `Conta ${tenant.name} excluída com sucesso` });
});

// 9. Update tenant buffer settings (se a empresa decide por um valor a mais e quanto a mais)
router.put('/:slug/buffer', (req, res) => {
  const { buffer_type, buffer_value } = req.body;
  if (!['fixed_minutes', 'percentage'].includes(buffer_type)) {
    return res.status(400).json({ error: 'buffer_type deve ser "fixed_minutes" ou "percentage"' });
  }

  const updated = store.updateTenant(req.params.slug, {
    buffer_type,
    buffer_value: Number(buffer_value) || 0
  });

  if (!updated) return res.status(404).json({ error: 'Tenant não encontrado' });
  res.json(updated);
});

// 10. Update tenant general profile
router.put('/:slug', (req, res) => {
  const updated = store.updateTenant(req.params.slug, req.body);
  if (!updated) return res.status(404).json({ error: 'Tenant não encontrado' });
  res.json(updated);
});

// 11. Get services for tenant
router.get('/:slug/services', (req, res) => {
  const tenant = store.getTenantBySlug(req.params.slug);
  if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });
  const services = store.getServices(tenant.id);
  res.json(services);
});

// 12. Create new service
router.post('/:slug/services', (req, res) => {
  const tenant = store.getTenantBySlug(req.params.slug);
  if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

  const { name, description, code_prefix, stages } = req.body;
  const newService = {
    id: `serv-${Date.now()}`,
    tenant_id: tenant.id,
    name: name || 'Novo Serviço',
    description: description || '',
    code_prefix: (code_prefix || 'TK').toUpperCase(),
    active: true,
    stages: stages || []
  };

  store.createService(newService);
  res.status(201).json(newService);
});

// 13. Update service
router.put('/:slug/services/:serviceId', (req, res) => {
  const updated = store.updateService(req.params.serviceId, req.body);
  if (!updated) return res.status(404).json({ error: 'Serviço não encontrado' });
  res.json(updated);
});

// 14. Delete service
router.delete('/:slug/services/:serviceId', (req, res) => {
  const deleted = store.deleteService(req.params.serviceId);
  if (!deleted) return res.status(404).json({ error: 'Serviço não encontrado' });
  res.json({ success: true, message: 'Serviço e suas etapas foram excluídos' });
});

// 15. Get stages for a service or all stages for tenant
router.get('/:slug/stages', (req, res) => {
  const tenant = store.getTenantBySlug(req.params.slug);
  if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

  const serviceId = req.query.service_id;
  if (serviceId) {
    return res.json(store.getStages(serviceId));
  }

  // All stages for all services of this tenant
  const services = store.getServices(tenant.id);
  const serviceIds = services.map(s => s.id);
  const allStages = store.data.stages.filter(stg => serviceIds.includes(stg.service_id) || stg.tenant_id === tenant.id);
  res.json(allStages);
});

// 16. Create stage (empresa cria suas próprias etapas de atendimento)
router.post('/:slug/stages', (req, res) => {
  const tenant = store.getTenantBySlug(req.params.slug);
  if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

  const { service_id, name, counter_label, default_avg_minutes, color, icon, description, step_order, allow_notes, can_skip } = req.body;
  
  const existingStages = store.getStages(service_id);
  const nextOrder = step_order || existingStages.length + 1;

  const newStage = {
    id: `stg-${Date.now()}`,
    tenant_id: tenant.id,
    service_id,
    step_order: nextOrder,
    name: name || 'Nova Etapa',
    counter_label: counter_label || 'Sala de Atendimento',
    default_avg_minutes: Number(default_avg_minutes) || 10,
    color: color || '#3b82f6',
    icon: icon || 'Activity',
    description: description || '',
    allow_notes: allow_notes !== false,
    can_skip: Boolean(can_skip)
  };

  store.createStage(newStage);

  // Also update service stages array
  const service = store.getServiceById(service_id);
  if (service) {
    if (!service.stages) service.stages = [];
    service.stages.push(newStage.id);
    store.save();
  }

  res.status(201).json(newStage);
});

// 17. Update stage
router.put('/:slug/stages/:stageId', (req, res) => {
  const updated = store.updateStage(req.params.stageId, req.body);
  if (!updated) return res.status(404).json({ error: 'Etapa não encontrada' });
  res.json(updated);
});

// 18. Delete stage
router.delete('/:slug/stages/:stageId', (req, res) => {
  const deleted = store.deleteStage(req.params.stageId);
  if (!deleted) return res.status(404).json({ error: 'Etapa não encontrada' });
  res.json({ success: true, message: 'Etapa excluída com sucesso' });
});

// 19. Get operators
router.get('/:slug/operators', (req, res) => {
  const tenant = store.getTenantBySlug(req.params.slug);
  if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });
  res.json(store.getOperators(tenant.id));
});

module.exports = router;
