const express = require('express');
const router = express.Router();
const store = require('../db/store');

// List all tenants
router.get('/', (req, res) => {
  const tenants = store.getTenants();
  res.json(tenants);
});

// Get tenant by slug or id
router.get('/:slug', (req, res) => {
  const tenant = store.getTenantBySlug(req.params.slug);
  if (!tenant) return res.status(404).json({ error: 'Empresa/Tenant não encontrada' });
  res.json(tenant);
});

// Update tenant buffer settings (se a empresa decide por um valor a mais e quanto a mais)
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

// Update tenant profile
router.put('/:slug', (req, res) => {
  const updated = store.updateTenant(req.params.slug, req.body);
  if (!updated) return res.status(404).json({ error: 'Tenant não encontrado' });
  res.json(updated);
});

// Get services for tenant
router.get('/:slug/services', (req, res) => {
  const tenant = store.getTenantBySlug(req.params.slug);
  if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });
  const services = store.getServices(tenant.id);
  res.json(services);
});

// Create new service
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

// Get stages for a service or all stages for tenant
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

// Create stage (empresa cria suas próprias etapas de atendimento)
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

// Update stage
router.put('/:slug/stages/:stageId', (req, res) => {
  const updated = store.updateStage(req.params.stageId, req.body);
  if (!updated) return res.status(404).json({ error: 'Etapa não encontrada' });
  res.json(updated);
});

// Delete stage
router.delete('/:slug/stages/:stageId', (req, res) => {
  const deleted = store.deleteStage(req.params.stageId);
  if (!deleted) return res.status(404).json({ error: 'Etapa não encontrada' });
  res.json({ success: true, message: 'Etapa excluída com sucesso' });
});

// Get operators
router.get('/:slug/operators', (req, res) => {
  const tenant = store.getTenantBySlug(req.params.slug);
  if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });
  res.json(store.getOperators(tenant.id));
});

module.exports = router;

