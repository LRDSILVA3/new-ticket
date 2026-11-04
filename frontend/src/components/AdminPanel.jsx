import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { getSocket } from '../utils/socket';
import { 
  Settings, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Edit3, 
  Activity, 
  Clock, 
  Layers, 
  Radio, 
  CheckCircle,
  HelpCircle,
  Sparkles,
  Building2,
  Save,
  RotateCcw,
  Key,
  Copy,
  Check,
  ExternalLink,
  Palette,
  Webhook,
  Terminal,
  Smartphone,
  Eye,
  AlertCircle,
  Stethoscope,
  FlaskConical,
  UserCheck,
  FileText
} from 'lucide-react';

export default function AdminPanel({ tenantSlug, onTenantChange }) {
  const [activeTab, setActiveTab] = useState('workflow'); // 'workflow' | 'buffer' | 'styling' | 'integration' | 'saas'
  const [tenant, setTenant] = useState(null);
  const [tenantsList, setTenantsList] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [stages, setStages] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Buffer state
  const [bufferType, setBufferType] = useState('fixed_minutes');
  const [bufferValue, setBufferValue] = useState(10);
  const [bufferSaving, setBufferSaving] = useState(false);
  const [bufferSuccess, setBufferSuccess] = useState(false);

  // Styling state
  const [themeColor, setThemeColor] = useState('#0d9488');
  const [accentColor, setAccentColor] = useState('#06b6d4');
  const [logoIcon, setLogoIcon] = useState('🏥');
  const [ticketTheme, setTicketTheme] = useState('dark');
  const [bannerMessage, setBannerMessage] = useState('');
  const [footerMessage, setFooterMessage] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tagline, setTagline] = useState('');
  const [stylingSaving, setStylingSaving] = useState(false);
  const [stylingSuccess, setStylingSuccess] = useState(false);

  // Webhook state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState(null);
  const [webhookSuccess, setWebhookSuccess] = useState(false);

  // Code sample language
  const [codeLang, setCodeLang] = useState('curl'); // 'curl' | 'node' | 'python' | 'csharp'
  const [copiedKey, setCopiedKey] = useState(false);

  // Super Admin: New Tenant Modal
  const [showNewTenantModal, setShowNewTenantModal] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantSlug, setNewTenantSlug] = useState('');
  const [newTenantPhone, setNewTenantPhone] = useState('');
  const [newTenantAddress, setNewTenantAddress] = useState('');
  const [newTenantColor, setNewTenantColor] = useState('#0d9488');
  const [creatingTenant, setCreatingTenant] = useState(false);

  // New Service Modal
  const [showNewServiceModal, setShowNewServiceModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrefix, setNewServicePrefix] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [creatingService, setCreatingService] = useState(false);

  // New Stage Modal
  const [showNewStageModal, setShowNewStageModal] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageCounter, setNewStageCounter] = useState('');
  const [newStageAvgMin, setNewStageAvgMin] = useState(10);
  const [newStageColor, setNewStageColor] = useState('#3b82f6');
  const [newStageIcon, setNewStageIcon] = useState('Activity');
  const [newStageAllowNotes, setNewStageAllowNotes] = useState(true);
  const [newStageCanSkip, setNewStageCanSkip] = useState(false);
  const [creatingStage, setCreatingStage] = useState(false);

  useEffect(() => {
    loadAll();
  }, [tenantSlug]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const allTenants = await api.getTenants();
      setTenantsList(allTenants);

      const currentTenant = await api.getTenant(tenantSlug);
      setTenant(currentTenant);
      setTenantName(currentTenant.name || '');
      setTagline(currentTenant.tagline || '');
      setBufferType(currentTenant.buffer_type || 'fixed_minutes');
      setBufferValue(currentTenant.buffer_value || 10);
      setThemeColor(currentTenant.theme_color || '#0d9488');
      setAccentColor(currentTenant.accent_color || '#06b6d4');
      setLogoIcon(currentTenant.logo_icon || '🏥');
      setTicketTheme(currentTenant.ticket_theme || 'dark');
      setBannerMessage(currentTenant.ticket_banner_message || 'Apresente um documento com foto ao ser chamado(a).');
      setFooterMessage(currentTenant.ticket_footer_message || 'Wi-Fi: Visitantes | Dúvidas? Procure a recepção.');
      setWebhookUrl(currentTenant.webhook_url || '');
      setWebhookSecret(currentTenant.webhook_secret || '');

      const srvList = await api.getServices(tenantSlug);
      setServices(srvList);

      if (srvList.length > 0) {
        setSelectedServiceId(srvList[0].id);
        const stgList = await api.getStages(tenantSlug, srvList[0].id);
        setStages(stgList);
      }

      // Load initial events history
      const initialEvents = await api.getTenantEvents(currentTenant.id);
      setLiveEvents(initialEvents);

      setLoading(false);
    } catch (err) {
      console.error('Error loading admin panel:', err);
      setLoading(false);
    }
  };

  // Switch service to see its stages
  const handleServiceSelect = async (svcId) => {
    setSelectedServiceId(svcId);
    const stgList = await api.getStages(tenantSlug, svcId);
    setStages(stgList);
  };

  // 1. Save safety margin buffer
  const handleSaveBuffer = async () => {
    try {
      setBufferSaving(true);
      const updated = await api.updateTenantBuffer(tenantSlug, bufferType, Number(bufferValue));
      setTenant(updated);
      setBufferSuccess(true);
      setBufferSaving(false);
      setTimeout(() => setBufferSuccess(false), 3000);
    } catch (err) {
      alert(err.message || 'Erro ao salvar margem');
      setBufferSaving(false);
    }
  };

  // 2. Save custom branding & styling
  const handleSaveStyling = async () => {
    try {
      setStylingSaving(true);
      const updated = await api.updateTenantStyling(tenantSlug, {
        name: tenantName,
        tagline,
        theme_color: themeColor,
        accent_color: accentColor,
        logo_icon: logoIcon,
        ticket_theme: ticketTheme,
        ticket_banner_message: bannerMessage,
        ticket_footer_message: footerMessage
      });
      setTenant(updated);
      setStylingSuccess(true);
      setStylingSaving(false);
      setTimeout(() => setStylingSuccess(false), 3000);
    } catch (err) {
      alert(err.message || 'Erro ao salvar personalização');
      setStylingSaving(false);
    }
  };

  // 3. Save Webhook settings
  const handleSaveWebhook = async () => {
    try {
      setWebhookSaving(true);
      const updated = await api.updateTenantWebhook(tenantSlug, {
        webhook_url: webhookUrl,
        webhook_secret: webhookSecret
      });
      setTenant(updated);
      setWebhookSuccess(true);
      setWebhookSaving(false);
      setTimeout(() => setWebhookSuccess(false), 3000);
    } catch (err) {
      alert(err.message || 'Erro ao salvar webhook');
      setWebhookSaving(false);
    }
  };

  // 4. Test Webhook
  const handleTestWebhook = async () => {
    try {
      setWebhookTesting(true);
      setWebhookTestResult(null);
      const result = await api.testTenantWebhook(tenantSlug);
      setWebhookTestResult(result);
      setWebhookTesting(false);
    } catch (err) {
      setWebhookTestResult({ success: false, error: err.message });
      setWebhookTesting(false);
    }
  };

  // 5. Regenerate API Token
  const handleRegenerateToken = async () => {
    if (!confirm('Atenção: Ao regenerar o Token de API, qualquer totem ou integração externa precisará ser atualizado. Continuar?')) return;
    try {
      const res = await api.regenerateTenantToken(tenantSlug);
      setTenant(res.tenant);
      alert('Novo Token de API gerado com sucesso!');
    } catch (err) {
      alert(err.message || 'Erro ao regenerar token');
    }
  };

  // Copy API key to clipboard
  const handleCopyKey = () => {
    if (!tenant?.api_key) return;
    navigator.clipboard.writeText(tenant.api_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  // 6. Super Admin: Create Tenant Account
  const handleCreateTenant = async (e) => {
    e.preventDefault();
    if (!newTenantName) return;
    try {
      setCreatingTenant(true);
      const res = await api.createTenant({
        name: newTenantName,
        slug: newTenantSlug || undefined,
        contact_phone: newTenantPhone,
        address: newTenantAddress,
        theme_color: newTenantColor
      });
      setShowNewTenantModal(false);
      setNewTenantName('');
      setNewTenantSlug('');
      setNewTenantPhone('');
      setNewTenantAddress('');
      setCreatingTenant(false);

      // Switch to the newly created tenant
      onTenantChange(res.tenant.slug);
    } catch (err) {
      alert(err.message || 'Erro ao cadastrar empresa');
      setCreatingTenant(false);
    }
  };

  // 7. Delete Tenant Account
  const handleDeleteTenant = async (slugToDelete, nameToDelete) => {
    if (!confirm(`Deseja realmente EXCLUIR a conta "${nameToDelete}" e todos os seus serviços e tickets? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.deleteTenant(slugToDelete);
      const allTenants = await api.getTenants();
      setTenantsList(allTenants);
      if (allTenants.length > 0) {
        onTenantChange(allTenants[0].slug);
      }
    } catch (err) {
      alert(err.message || 'Erro ao excluir empresa');
    }
  };

  // 8. Create Service
  const handleCreateService = async (e) => {
    e.preventDefault();
    if (!newServiceName) return;
    try {
      setCreatingService(true);
      const created = await api.createService(tenantSlug, {
        name: newServiceName,
        code_prefix: newServicePrefix || 'TK',
        description: newServiceDesc
      });
      setServices(prev => [...prev, created]);
      setSelectedServiceId(created.id);
      setStages([]);
      setShowNewServiceModal(false);
      setNewServiceName('');
      setNewServicePrefix('');
      setNewServiceDesc('');
      setCreatingService(false);
    } catch (err) {
      alert(err.message || 'Erro ao criar serviço');
      setCreatingService(false);
    }
  };

  // 9. Delete Service
  const handleDeleteService = async (serviceId, serviceName) => {
    if (!confirm(`Deseja excluir o serviço "${serviceName}" e todas as suas etapas?`)) return;
    try {
      await api.deleteService(tenantSlug, serviceId);
      const updatedSrv = services.filter(s => s.id !== serviceId);
      setServices(updatedSrv);
      if (updatedSrv.length > 0) {
        setSelectedServiceId(updatedSrv[0].id);
        const stgList = await api.getStages(tenantSlug, updatedSrv[0].id);
        setStages(stgList);
      } else {
        setSelectedServiceId('');
        setStages([]);
      }
    } catch (err) {
      alert(err.message || 'Erro ao excluir serviço');
    }
  };

  // 10. Create Stage
  const handleCreateStage = async (e) => {
    e.preventDefault();
    if (!newStageName || !selectedServiceId) return;

    try {
      setCreatingStage(true);
      const created = await api.createStage(tenantSlug, {
        service_id: selectedServiceId,
        name: newStageName,
        counter_label: newStageCounter || 'Sala de Atendimento',
        default_avg_minutes: Number(newStageAvgMin) || 10,
        color: newStageColor,
        icon: newStageIcon,
        allow_notes: newStageAllowNotes,
        can_skip: newStageCanSkip
      });

      setStages(prev => [...prev, created]);
      setShowNewStageModal(false);
      setNewStageName('');
      setNewStageCounter('');
      setCreatingStage(false);
    } catch (err) {
      alert(err.message || 'Erro ao criar etapa');
      setCreatingStage(false);
    }
  };

  // 11. Delete Stage
  const handleDeleteStage = async (stageId) => {
    if (!confirm('Deseja realmente remover esta etapa do fluxo de atendimento?')) return;
    try {
      await api.deleteStage(tenantSlug, stageId);
      setStages(prev => prev.filter(s => s.id !== stageId));
    } catch (err) {
      alert(err.message || 'Erro ao remover etapa');
    }
  };

  // WebSocket Live Event Stream listener
  useEffect(() => {
    if (!tenant) return;
    const socket = getSocket();
    socket.emit('join_tenant', { tenantId: tenant.id, role: 'admin' });

    const handleEvent = (type, payload) => {
      setLiveEvents(prev => [{
        id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toISOString(),
        event_type: type,
        payload
      }, ...prev.slice(0, 49)]);
    };

    socket.on('ticket_patient_online', (data) => {
      handleEvent('QR_TRACKER_OPENED', { message: `Paciente do ticket ${data.displayCode} abriu o rastreador no celular` });
    });

    socket.on('ticket_created', (data) => {
      handleEvent('TICKET_CREATED', { message: `Novo ticket ${data.ticket.display_code} emitido (${data.ticket.customer_name})` });
    });

    socket.on('display:call', (data) => {
      handleEvent('TICKET_CALLED', { message: `Senha ${data.displayCode} chamada para ${data.counter}` });
    });

    return () => {
      socket.off('ticket_patient_online');
      socket.off('ticket_created');
      socket.off('display:call');
    };
  }, [tenant]);

  // Buffer Simulation
  const sampleBaseMinutes = 20;
  const calculatedWaitSimulation = bufferType === 'percentage'
    ? Math.round(sampleBaseMinutes * (1 + Number(bufferValue) / 100))
    : sampleBaseMinutes + Number(bufferValue);

  const selectedService = services.find(s => s.id === selectedServiceId);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center text-slate-400">
        <Activity className="w-8 h-8 text-teal-400 animate-spin mx-auto mb-3" />
        Carregando painel de gestão do cliente...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* SaaS Suite Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{tenant?.logo_icon || '🏥'}</span>
            <span className="text-xs uppercase font-extrabold text-teal-400 tracking-wider">
              Painel de Administração do Cliente & SaaS
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">{tenant?.name}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {tenant?.tagline || 'Gerenciamento de serviços, etapas, margem de segurança, integração Headless e white-label.'}
          </p>
        </div>

        {/* Tenant Switcher & Quick New Account */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={tenantSlug}
              onChange={(e) => onTenantChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-teal-300 focus:outline-none cursor-pointer"
            >
              {tenantsList.map(t => (
                <option key={t.slug} value={t.slug} className="bg-slate-900 text-white">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowNewTenantModal(true)}
            className="py-2 px-3 bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 shadow-md shadow-teal-500/20 cursor-pointer transition-all"
            title="Cadastrar Nova Conta de Cliente"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Conta
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('workflow')}
          className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'workflow'
              ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20 font-black'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          Serviços & Etapas
        </button>

        <button
          onClick={() => setActiveTab('buffer')}
          className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'buffer'
              ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20 font-black'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Margem de Segurança
        </button>

        <button
          onClick={() => setActiveTab('styling')}
          className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'styling'
              ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20 font-black'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Palette className="w-4 h-4" />
          Estilização & Ticket
        </button>

        <button
          onClick={() => setActiveTab('integration')}
          className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'integration'
              ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20 font-black'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Eventos & Integração API
        </button>

        <button
          onClick={() => setActiveTab('saas')}
          className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'saas'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 font-black'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Key className="w-4 h-4 text-indigo-400" />
          Gestor SaaS (Super Admin)
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: WORKFLOW & ETAPAS                                      */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'workflow' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Services Column (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-400" />
                  <h3 className="text-sm font-bold text-white">Serviços Cadastrados</h3>
                </div>
                <button
                  onClick={() => setShowNewServiceModal(true)}
                  className="p-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 rounded-lg text-xs font-bold flex items-center gap-1 border border-teal-500/30 transition-all cursor-pointer"
                  title="Criar Novo Serviço"
                >
                  <Plus className="w-3.5 h-3.5" /> Novo
                </button>
              </div>

              {services.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Nenhum serviço cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {services.map(svc => (
                    <div
                      key={svc.id}
                      onClick={() => handleServiceSelect(svc.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        selectedServiceId === svc.id
                          ? 'bg-teal-950/40 border-teal-500/60 shadow-md'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono font-bold text-teal-400">
                            {svc.code_prefix}
                          </span>
                          <h4 className="text-sm font-bold text-white">{svc.name}</h4>
                        </div>
                        {svc.description && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{svc.description}</p>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteService(svc.id, svc.name);
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-all"
                        title="Excluir Serviço"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stages Column (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-2">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Etapas de Atendimento: <span className="text-teal-400 font-mono">{selectedService?.name || 'Selecione um serviço'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    O paciente percorre estas salas em sequência. Ao concluir uma etapa, ele é transferido para a próxima fila.
                  </p>
                </div>

                {selectedServiceId && (
                  <button
                    onClick={() => setShowNewStageModal(true)}
                    className="py-2.5 px-4 bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-teal-500/20 cursor-pointer transition-all self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Etapa
                  </button>
                )}
              </div>

              {stages.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Este serviço não possui etapas cadastradas. Clique em "Adicionar Etapa" para iniciar o fluxo.
                </div>
              ) : (
                <div className="space-y-3">
                  {stages.map((st, idx) => (
                    <div
                      key={st.id}
                      className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white font-mono shrink-0 shadow-md"
                          style={{ backgroundColor: st.color || '#3b82f6' }}
                        >
                          {st.step_order || idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white">{st.name}</h4>
                            <span className="text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                              📍 {st.counter_label}
                            </span>
                          </div>
                          {st.description && (
                            <p className="text-xs text-slate-400 mt-0.5">{st.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-teal-400" /> ~{st.default_avg_minutes} min SLA
                            </span>
                            {st.allow_notes && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px]">
                                Prontuário Clínico
                              </span>
                            )}
                            {st.can_skip && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px]">
                                Pode ser pulada
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleDeleteStage(st.id)}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                          title="Remover etapa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: MARGEM DE SEGURANÇA (BUFFER)                           */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'buffer' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              Margem de Tolerância e Segurança do Tempo de Espera
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              A empresa decide se aplica um valor adicional ao tempo médio de espera e quanto (em minutos fixos ou em percentual). O paciente visualiza um tempo realista, evitando ansiedade por atrasos imprevistos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Tipo de Margem:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBufferType('fixed_minutes')}
                    className={`py-3 px-4 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                      bufferType === 'fixed_minutes'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Minutos Fixos (+min)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBufferType('percentage')}
                    className={`py-3 px-4 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                      bufferType === 'percentage'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Porcentagem de Folga (+%)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  {bufferType === 'fixed_minutes' ? 'Minutos Adicionais a Somar:' : 'Percentual Adicional a Somar:'}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max={bufferType === 'fixed_minutes' ? 60 : 100}
                    step={bufferType === 'fixed_minutes' ? 5 : 5}
                    value={bufferValue}
                    onChange={(e) => setBufferValue(Number(e.target.value))}
                    className="flex-1 accent-teal-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
                  />
                  <span className="w-20 text-center font-mono font-bold text-base px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-teal-400">
                    {bufferValue}{bufferType === 'fixed_minutes' ? ' min' : '%'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSaveBuffer}
                disabled={bufferSaving}
                className="w-full py-3.5 bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                {bufferSaving ? 'Salvando...' : bufferSuccess ? 'Salvo com Sucesso! ✓' : 'Salvar Margem de Segurança'}
              </button>
            </div>

            {/* Live Interactive Simulator Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <span className="text-[11px] uppercase tracking-wider text-teal-400 font-extrabold block">
                Simulador ao Vivo (O que o Paciente Vê no Celular)
              </span>
              <p className="text-xs text-slate-400">
                Se a média histórica de espera for <strong>{sampleBaseMinutes} minutos</strong> (ex: 2 pessoas na frente x 10 min):
              </p>

              <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Tempo Exibido no Celular</span>
                  <div className="text-3xl font-black font-mono text-teal-300 mt-0.5">
                    ~{calculatedWaitSimulation} min
                  </div>
                </div>
                <div className="text-right text-xs space-y-1">
                  <div className="text-slate-400 font-mono">
                    Base: <strong>{sampleBaseMinutes} min</strong>
                  </div>
                  <div className="text-teal-400 font-mono font-semibold">
                    {bufferType === 'fixed_minutes' 
                      ? `+${bufferValue} min de folga fixa` 
                      : `+${bufferValue}% (+${Math.round(sampleBaseMinutes * bufferValue / 100)} min)`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: ESTILIZAÇÃO & TICKET (WHITE-LABEL)                     */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'styling' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column (7 Cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-teal-400" />
                Identidade Visual & Personalização do Ticket (White-Label)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Personalize as cores da sua empresa, ícone, mensagens personalizadas e tema visual do ticket que o paciente abre no smartphone.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Name & Tagline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Nome de Exibição:</label>
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-medium focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Slogan / Subtítulo:</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-medium focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Colors & Logo Icon */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Cor Primária:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="w-9 h-9 rounded-lg bg-transparent cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Cor de Destaque:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-9 h-9 rounded-lg bg-transparent cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Ícone / Logo Emoji:</label>
                  <div className="flex items-center gap-1.5">
                    {['🏥', '🩺', '🔬', '🦷', '💊', '🏛️', '🏦', '⚖️'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setLogoIcon(emoji)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border transition-all cursor-pointer ${
                          logoIcon === emoji ? 'bg-teal-500/20 border-teal-500 scale-110' : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ticket Theme Style */}
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Tema Visual do Ticket:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'dark', label: 'Dark Luxury (Padrão)', desc: 'Preto profundo & neon' },
                    { id: 'clean', label: 'Clean Hospital', desc: 'Verde clínico & moderno' },
                    { id: 'light', label: 'Light Mode', desc: 'Card suave & claro' }
                  ].map(th => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setTicketTheme(th.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        ticketTheme === th.id
                          ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <strong className="block text-xs text-white">{th.label}</strong>
                      <span className="text-[10px] text-slate-500">{th.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Ticket Messages */}
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">
                    Mensagem de Aviso do Topo (Exibida no cartão da senha):
                  </label>
                  <input
                    type="text"
                    value={bannerMessage}
                    onChange={(e) => setBannerMessage(e.target.value)}
                    placeholder="Ex: Apresente documento com foto ao ser chamado(a)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-medium focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">
                    Mensagem de Rodapé (Wi-Fi, orientações, etc.):
                  </label>
                  <input
                    type="text"
                    value={footerMessage}
                    onChange={(e) => setFooterMessage(e.target.value)}
                    placeholder="Ex: Wi-Fi gratuito: Clinica_Guest | Dúvidas? Procure a recepção"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-medium focus:border-teal-500"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveStyling}
                disabled={stylingSaving}
                className="w-full py-3.5 bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                {stylingSaving ? 'Salvando...' : stylingSuccess ? 'Estilo Salvo com Sucesso! ✓' : 'Salvar Estilização'}
              </button>
            </div>
          </div>

          {/* Live Mobile Ticket Preview (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <span className="text-xs uppercase font-extrabold text-teal-400 tracking-wider mb-2 flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> Pré-Visualização no Smartphone
            </span>

            {/* Mock Smartphone Frame */}
            <div className="w-[310px] bg-slate-950 border-4 border-slate-800 rounded-[36px] p-4 shadow-2xl relative overflow-hidden text-slate-100">
              <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-3"></div>

              {/* Mock Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider" style={{ color: themeColor }}>
                    Atendimento Digital
                  </span>
                  <h3 className="text-xs font-bold text-white">{tenantName || 'Sua Empresa'}</h3>
                </div>
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs border"
                  style={{ borderColor: themeColor, backgroundColor: `${themeColor}20` }}
                >
                  {logoIcon}
                </div>
              </div>

              {/* Mock Ticket Card */}
              <div 
                className="mt-3 rounded-2xl p-3 border shadow-md relative overflow-hidden"
                style={{ 
                  backgroundColor: ticketTheme === 'light' ? '#f8fafc' : '#0f172a',
                  borderColor: themeColor,
                  color: ticketTheme === 'light' ? '#0f172a' : '#ffffff'
                }}
              >
                <div className="flex justify-between items-center text-[10px] opacity-70">
                  <span>Pronto Atendimento</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">NORMAL</span>
                </div>

                <div className="mt-2 text-center">
                  <span className="text-[10px] uppercase font-semibold opacity-60 block">Sua Senha</span>
                  <div className="text-3xl font-black font-mono tracking-tight my-0.5" style={{ color: themeColor }}>
                    PA-001
                  </div>
                  <span className="text-xs font-semibold">Lucas</span>
                </div>

                {bannerMessage && (
                  <div className="mt-2 p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-[10px] text-teal-300 text-center">
                    ℹ️ {bannerMessage}
                  </div>
                )}

                {footerMessage && (
                  <div className="mt-2 text-[9px] opacity-60 text-center border-t border-slate-800/50 pt-1.5">
                    {footerMessage}
                  </div>
                )}
              </div>

              {/* Mock Wait Status */}
              <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-teal-400 font-bold block">1º na Fila</span>
                <span className="text-base font-extrabold text-white block">~12 min estimados</span>
                <span className="text-[9px] text-slate-500">Etapa: Triagem & Sinais Vitais</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: EVENTOS & INTEGRAÇÃO (HEADLESS API / WEBHOOKS)         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'integration' && (
        <div className="space-y-6">
          {/* API Key Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div>
                <span className="text-xs uppercase font-extrabold text-teal-400 tracking-wider">
                  Chave de Integração Headless (API Token)
                </span>
                <h3 className="text-base font-bold text-white">Autenticação para Totens Externos & ERP / PEP</h3>
              </div>
              <button
                onClick={handleRegenerateToken}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer self-start sm:self-auto"
              >
                Regenerar Chave
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Utilize este token no cabeçalho <code className="bg-slate-950 px-2 py-0.5 rounded text-teal-300">x-api-key</code> para autenticar todas as chamadas da API REST de integração direta, permitindo emitir senhas pelo seu próprio totem ou acionar chamadas diretamente pelo prontuário eletrônico do seu médico.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={tenant?.api_key || 'Chave não gerada'}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-teal-300 font-mono"
              />
              <button
                onClick={handleCopyKey}
                className="py-2.5 px-4 bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-teal-500/20 cursor-pointer transition-all"
              >
                {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedKey ? 'Copiado!' : 'Copiar Chave'}
              </button>
            </div>
          </div>

          {/* Webhooks Configuration Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Webhook className="w-5 h-5 text-teal-400" />
                Webhooks de Saída em Tempo Real (Outbound Events)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cadastre o endpoint do seu sistema para receber notificações HTTP POST instantâneas assinadas via HMAC-SHA256 sempre que um evento ocorrer (senha emitida, paciente leu QR Code, senha chamada, atendimento finalizado).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">URL do Webhook do seu Sistema:</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://seu-erp.com.br/api/webhooks/fila"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Segredo de Assinatura (HMAC Secret):</label>
                <input
                  type="text"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="Chave secreta para validar X-NextQueue-Signature"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleSaveWebhook}
                disabled={webhookSaving}
                className="py-2.5 px-5 bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md shadow-teal-500/20 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                {webhookSaving ? 'Salvando...' : webhookSuccess ? 'Salvo! ✓' : 'Salvar Webhook'}
              </button>

              <button
                onClick={handleTestWebhook}
                disabled={webhookTesting || !webhookUrl}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-50 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 border border-slate-700 cursor-pointer transition-all"
              >
                <Radio className="w-4 h-4 text-teal-400" />
                {webhookTesting ? 'Enviando Ping de Teste...' : 'Testar Disparo de Webhook'}
              </button>
            </div>

            {webhookTestResult && (
              <div className={`p-3 rounded-xl border text-xs font-mono ${
                webhookTestResult.success 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}>
                {webhookTestResult.success ? (
                  <span>✓ Sucesso! Endpoint respondeu com status HTTP {webhookTestResult.status}</span>
                ) : (
                  <span>✕ Erro ao disparar: {webhookTestResult.error || 'Falha de conexão'}</span>
                )}
              </div>
            )}
          </div>

          {/* Quick Integration Developer Hub (Code Samples) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs uppercase font-extrabold text-teal-400 tracking-wider">Documentação de Integração</span>
                <h3 className="text-base font-bold text-white">Como Integrar seu Totem ou Prontuário</h3>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                {['curl', 'node', 'python', 'csharp'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => setCodeLang(lang)}
                    className={`px-3 py-1 rounded-lg uppercase transition-all cursor-pointer ${
                      codeLang === lang ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'csharp' ? 'C# / .NET' : lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Box: Emit Ticket */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block">
                1. Emitir Ticket no Totem Externo (Retorna QR Code em Base64 para impressão térmica):
              </span>
              <pre className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-teal-300 overflow-x-auto leading-relaxed">
{codeLang === 'curl' && `curl -X POST "${origin}/api/v1/integration/tickets" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${tenant?.api_key}" \\
  -d '{
    "service_code": "PA",
    "customer_name": "João da Silva",
    "customer_phone": "(11) 98765-4321",
    "priority": "normal",
    "external_reference_id": "ATEND-99882"
  }'`}
{codeLang === 'node' && `const response = await fetch('${origin}/api/v1/integration/tickets', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${tenant?.api_key}'
  },
  body: JSON.stringify({
    service_code: 'PA',
    customer_name: 'João da Silva',
    priority: 'normal'
  })
});
const { display_code, tracking_url, qr_code_base64, estimated_wait_minutes } = await response.json();
console.log('Senha emitida:', display_code);`}
{codeLang === 'python' && `import requests

url = "${origin}/api/v1/integration/tickets"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "${tenant?.api_key}"
}
payload = {
    "service_code": "PA",
    "customer_name": "João da Silva",
    "priority": "normal"
}

res = requests.post(url, json=payload, headers=headers).json()
print(f"Senha: {res['display_code']} | URL: {res['tracking_url']}")`}
{codeLang === 'csharp' && `using var client = new HttpClient();
client.DefaultRequestHeaders.Add("x-api-key", "${tenant?.api_key}");

var json = "{\\"service_code\\":\\"PA\\", \\"customer_name\\":\\"João da Silva\\"}";
var content = new StringContent(json, Encoding.UTF8, "application/json");

var res = await client.PostAsync("${origin}/api/v1/integration/tickets", content);
var body = await res.Content.ReadAsStringAsync();
Console.WriteLine(body);`}
              </pre>
            </div>

            {/* Code Box: Call Ticket */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block">
                2. Chamar Próximo Paciente pelo Prontuário Médico (Dispara som, vibração e banner no celular):
              </span>
              <pre className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-indigo-300 overflow-x-auto leading-relaxed">
{codeLang === 'curl' && `curl -X POST "${origin}/api/v1/integration/tickets/call-next" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${tenant?.api_key}" \\
  -d '{
    "counter": "Consultório 03",
    "operator_name": "Dra. Camila Santos"
  }'`}
{codeLang === 'node' && `const res = await fetch('${origin}/api/v1/integration/tickets/call-next', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${tenant?.api_key}'
  },
  body: JSON.stringify({
    counter: 'Consultório 03',
    operator_name: 'Dra. Camila Santos'
  })
});
const data = await res.json();
console.log('Chamado:', data.ticket.display_code);`}
{codeLang === 'python' && `requests.post(
    "${origin}/api/v1/integration/tickets/call-next",
    json={"counter": "Consultório 03", "operator_name": "Dra. Camila"},
    headers={"x-api-key": "${tenant?.api_key}"}
)`}
{codeLang === 'csharp' && `var json = "{\\"counter\\":\\"Consultório 03\\", \\"operator_name\\":\\"Dra. Camila\\"}";
await client.PostAsync("${origin}/api/v1/integration/tickets/call-next", new StringContent(json, Encoding.UTF8, "application/json"));`}
              </pre>
            </div>
          </div>

          {/* Live Events Stream & Audit */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <h3 className="text-base font-bold text-white">Feed de Eventos WebSocket ao Vivo</h3>
              </div>
              <span className="text-xs text-slate-400">
                {liveEvents.length} eventos registrados
              </span>
            </div>

            {liveEvents.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Nenhum evento registrado ainda.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {liveEvents.map(evt => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        evt.event_type === 'TICKET_CALLED' 
                          ? 'bg-rose-500/20 text-rose-300' 
                          : evt.event_type === 'QR_TRACKER_OPENED' 
                          ? 'bg-indigo-500/20 text-indigo-300' 
                          : 'bg-teal-500/20 text-teal-300'
                      }`}>
                        {evt.event_type}
                      </span>
                      <span className="text-slate-300">
                        {evt.payload?.message || evt.payload?.notes || JSON.stringify(evt.payload).slice(0, 80)}
                      </span>
                    </div>
                    <span className="text-slate-500 text-[10px] shrink-0 ml-2">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: GESTOR SAAS (SUPER ADMIN - CONTAS DE CLIENTES)          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'saas' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
            <div>
              <span className="text-xs uppercase font-extrabold text-indigo-400 tracking-wider">
                Painel Super Administrador Mestre (SaaS Manager)
              </span>
              <h2 className="text-xl font-black text-white mt-0.5">Gestão de Contas de Clientes (Tenants)</h2>
              <p className="text-xs text-slate-400">
                Cadastre novas clínicas, hospitais ou empresas, gerencie seus tokens de API e acesse os painéis.
              </p>
            </div>

            <button
              onClick={() => setShowNewTenantModal(true)}
              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Nova Empresa
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tenantsList.map(t => (
              <div
                key={t.id}
                className={`p-5 rounded-3xl border transition-all ${
                  t.slug === tenantSlug
                    ? 'bg-indigo-950/20 border-indigo-500/50 shadow-xl'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl border shadow-inner"
                      style={{ backgroundColor: `${t.theme_color || '#0d9488'}20`, borderColor: t.theme_color || '#0d9488' }}
                    >
                      {t.logo_icon || '🏥'}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{t.name}</h4>
                      <span className="text-[11px] font-mono text-slate-400">slug: {t.slug}</span>
                    </div>
                  </div>

                  {t.slug === tenantSlug ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                      ATIVO AGORA
                    </span>
                  ) : (
                    <button
                      onClick={() => onTenantChange(t.slug)}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-all"
                    >
                      Acessar Painel ➔
                    </button>
                  )}
                </div>

                {t.tagline && (
                  <p className="text-xs text-slate-400 mt-3 line-clamp-1">{t.tagline}</p>
                )}

                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Token da API:</span>
                    <span className="font-mono text-teal-400">{t.api_key ? `${t.api_key.slice(0, 20)}...` : 'Sem chave'}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Contato:</span>
                    <span className="text-slate-300">{t.contact_phone || 'Não informado'}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(t.api_key || '');
                        alert('Token copiado para a área de transferência!');
                      }}
                      className="text-xs text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> Copiar Token
                    </button>

                    {tenantsList.length > 1 && (
                      <button
                        onClick={() => handleDeleteTenant(t.slug, t.name)}
                        className="text-xs text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Excluir Conta
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CADASTRAR NOVA CONTA DE CLIENTE (SUPER ADMIN)           */}
      {/* ------------------------------------------------------------- */}
      {showNewTenantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-white mb-1">Cadastrar Nova Conta de Cliente (Tenant)</h3>
            <p className="text-xs text-slate-400 mb-4">
              Cria uma conta isolada para uma nova clínica ou empresa, gerando automaticamente seu Token de API e serviço inicial.
            </p>

            <form onSubmit={handleCreateTenant} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Nome da Empresa / Clínica:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Hospital Samaritano"
                  value={newTenantName}
                  onChange={(e) => {
                    setNewTenantName(e.target.value);
                    if (!newTenantSlug) {
                      setNewTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Slug / Identificador Único:</label>
                <input
                  type="text"
                  placeholder="Ex: hospital-samaritano"
                  value={newTenantSlug}
                  onChange={(e) => setNewTenantSlug(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Telefone de Contato:</label>
                <input
                  type="text"
                  placeholder="Ex: (11) 3344-5566"
                  value={newTenantPhone}
                  onChange={(e) => setNewTenantPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Endereço da Unidade:</label>
                <input
                  type="text"
                  placeholder="Ex: Av. Brasil, 500 - São Paulo, SP"
                  value={newTenantAddress}
                  onChange={(e) => setNewTenantAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Cor Primária da Marca:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newTenantColor}
                    onChange={(e) => setNewTenantColor(e.target.value)}
                    className="w-9 h-9 rounded-lg bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newTenantColor}
                    onChange={(e) => setNewTenantColor(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewTenantModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingTenant}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  {creatingTenant ? 'Cadastrando...' : 'Criar Conta de Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CRIAR NOVO SERVIÇO                                     */}
      {/* ------------------------------------------------------------- */}
      {showNewServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-white mb-1">Criar Novo Serviço de Atendimento</h3>
            <p className="text-xs text-slate-400 mb-4">
              Exemplos: Pronto Atendimento, Pediatria, Exames de Sangue, Consultório Eletivo.
            </p>

            <form onSubmit={handleCreateService} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Nome do Serviço:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Atendimento Cardiológico"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Prefixo da Senha (2 a 4 letras):</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  placeholder="Ex: CAR"
                  value={newServicePrefix}
                  onChange={(e) => setNewServicePrefix(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono uppercase focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Descrição / Instruções:</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Consultas agendadas e retorno de exames"
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-teal-500"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewServiceModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingService}
                  className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl cursor-pointer"
                >
                  {creatingService ? 'Criando...' : 'Criar Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CRIAR NOVA ETAPA                                       */}
      {/* ------------------------------------------------------------- */}
      {showNewStageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-white mb-1">Adicionar Etapa ao Fluxo</h3>
            <p className="text-xs text-slate-400 mb-4">
              Adicione uma nova sala/etapa ao serviço <strong>{selectedService?.name}</strong>.
            </p>

            <form onSubmit={handleCreateStage} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Nome da Etapa:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Exame de Eletrocardiograma"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Rótulo da Sala / Guichê:</label>
                <input
                  type="text"
                  placeholder="Ex: Sala de ECG 02"
                  value={newStageCounter}
                  onChange={(e) => setNewStageCounter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Tempo Médio Estimado Base (Minutos):</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={newStageAvgMin}
                  onChange={(e) => setNewStageAvgMin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:border-teal-500"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={newStageAllowNotes}
                    onChange={(e) => setNewStageAllowNotes(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-teal-500"
                  />
                  Permite anotações clínicas
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={newStageCanSkip}
                    onChange={(e) => setNewStageCanSkip(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-teal-500"
                  />
                  Pode ser pulada
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewStageModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingStage}
                  className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl cursor-pointer"
                >
                  {creatingStage ? 'Criando...' : 'Adicionar Etapa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
