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
  RotateCcw
} from 'lucide-react';

export default function AdminPanel({ tenantSlug, onTenantChange }) {
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
  const [bufferSavedSuccess, setBufferSavedSuccess] = useState(false);

  // New stage modal / form
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
      setBufferType(currentTenant.buffer_type || 'fixed_minutes');
      setBufferValue(currentTenant.buffer_value || 10);

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

  // Save safety margin buffer
  const handleSaveBuffer = async () => {
    try {
      setBufferSaving(true);
      const updated = await api.updateTenantBuffer(tenantSlug, bufferType, Number(bufferValue));
      setTenant(updated);
      setBufferSavedSuccess(true);
      setBufferSaving(false);
      setTimeout(() => setBufferSavedSuccess(false), 3000);
    } catch (err) {
      alert(err.message || 'Erro ao salvar buffer');
      setBufferSaving(false);
    }
  };

  // Add new stage to the workflow
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

  // Delete stage
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

    socket.on('ticket_patient_online', (data) => {
      setLiveEvents(prev => [{
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event_type: 'QR_TRACKER_OPENED',
        payload: { message: `Paciente do ticket ${data.displayCode} abriu o rastreador no celular` }
      }, ...prev]);
    });

    socket.on('ticket_created', (data) => {
      setLiveEvents(prev => [{
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event_type: 'TICKET_CREATED',
        payload: { message: `Novo ticket ${data.ticket.display_code} emitido` }
      }, ...prev]);
    });

    return () => {
      socket.off('ticket_patient_online');
      socket.off('ticket_created');
    };
  }, [tenant]);

  // Dynamic simulation for the buffer setting preview
  const sampleBaseMinutes = 20; // 2 people ahead * 10 min
  const calculatedWaitSimulation = bufferType === 'percentage'
    ? Math.round(sampleBaseMinutes * (1 + Number(bufferValue) / 100))
    : sampleBaseMinutes + Number(bufferValue);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Admin Header with Multi-Tenant Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-extrabold text-teal-400 tracking-wider">
            Painel de Gestão Multi-Tenant & Workflow
          </span>
          <h1 className="text-2xl font-black text-white">{tenant?.name}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure margens de tolerância de tempo médio, crie etapas personalizadas e acompanhe eventos WebSocket em tempo real.
          </p>
        </div>

        {/* Tenant Switcher */}
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <select
            value={tenantSlug}
            onChange={(e) => onTenantChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-teal-300 focus:outline-none focus:border-teal-500"
          >
            {tenantsList.map(t => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: BUFFER CONFIGURATION + STAGE BUILDER (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION 1: BUFFER & TEMPO MÉDIO CONFIGURATION (Key User Request!) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Configuração da Margem de Tempo de Espera</h2>
                  <p className="text-xs text-slate-400">
                    Defina o valor a mais e o método de cálculo aplicado sobre a média operacional
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Buffer Type */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Tipo de Margem Adicional:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBufferType('fixed_minutes')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      bufferType === 'fixed_minutes'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    Minutos Fixos (+min)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBufferType('percentage')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      bufferType === 'percentage'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    Porcentagem (+%)
                  </button>
                </div>
              </div>

              {/* Buffer Value */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  {bufferType === 'fixed_minutes' ? 'Minutos a Adicionar:' : 'Percentual de Folga:'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={bufferValue}
                    onChange={(e) => setBufferValue(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-teal-500"
                  />
                  <span className="text-xs text-slate-400 font-bold px-2">
                    {bufferType === 'fixed_minutes' ? 'minutos' : '%'}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Interactive Calculation Simulation */}
            <div className="bg-teal-950/30 border border-teal-500/30 rounded-2xl p-4 text-xs space-y-2">
              <span className="text-xs uppercase font-extrabold text-teal-400 tracking-wider block">
                Simulação em Tempo Real no Celular do Paciente:
              </span>
              <p className="text-slate-300">
                Se a fila estiver com 2 pessoas à frente (média histórica de 10 min = 20 min base operacional):
              </p>
              <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-xl border border-teal-500/20">
                <span className="text-slate-400">
                  Fórmula: 20 min base {bufferType === 'fixed_minutes' ? `+ ${bufferValue} min` : `+ ${bufferValue}%`}
                </span>
                <span className="text-base font-black text-teal-300 font-mono">
                  = ~{calculatedWaitSimulation} min exibidos
                </span>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                As novas margens são recalculadas imediatamente em todas as conexões WebSocket.
              </span>
              <button
                onClick={handleSaveBuffer}
                disabled={bufferSaving}
                className="py-2.5 px-6 bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-500/20"
              >
                {bufferSaving ? (
                  'Salvando...'
                ) : bufferSavedSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-slate-950" />
                    Salvo com Sucesso!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Margem de Espera
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SECTION 2: STAGE WORKFLOW BUILDER (Empresa cria as etapas) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white">Etapas do Atendimento (Workflow da Fila)</h2>
                <p className="text-xs text-slate-400">
                  Configure o percurso do paciente desde a recepção até a alta médica
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedServiceId}
                  onChange={(e) => handleServiceSelect(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                >
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <button
                  onClick={() => setShowNewStageModal(true)}
                  className="py-1.5 px-3 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-bold rounded-xl text-xs border border-teal-500/30 flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" /> Nova Etapa
                </button>
              </div>
            </div>

            {/* Stages List */}
            <div className="space-y-3">
              {stages.map((stg, index) => (
                <div
                  key={stg.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center font-bold font-mono text-teal-400 text-sm">
                      {stg.step_order}º
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{stg.name}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {stg.counter_label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{stg.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 text-xs">
                    <div className="text-right">
                      <span className="text-teal-400 font-bold block">~{stg.default_avg_minutes} min</span>
                      <span className="text-[10px] text-slate-500 block">tempo médio base</span>
                    </div>

                    <button
                      onClick={() => handleDeleteStage(stg.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title="Excluir etapa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: WEBSOCKET LIVE EVENT STREAM & AUDIT (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Eventos WebSocket Ao Vivo
                </h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">conectado</span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[700px] pr-1">
              {liveEvents.length === 0 ? (
                <div className="text-slate-500 text-xs text-center py-12">
                  Aguardando emissão de eventos...
                </div>
              ) : (
                liveEvents.map((evt, idx) => (
                  <div
                    key={evt.id || idx}
                    className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 text-xs space-y-1 hover:border-teal-500/40 transition-all"
                  >
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span className="font-mono text-teal-400 font-bold">{evt.event_type}</span>
                      <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-200 text-xs font-medium">
                      {evt.payload?.message || evt.event_type}
                    </p>
                    {evt.payload?.counter && (
                      <span className="text-[10px] text-slate-400 block">
                        Local: {evt.payload.counter}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE STAGE MODAL */}
      {showNewStageModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Adicionar Nova Etapa ao Fluxo</h3>
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

