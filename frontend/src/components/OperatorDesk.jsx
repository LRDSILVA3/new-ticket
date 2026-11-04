import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { getSocket } from '../utils/socket';
import { soundManager } from '../utils/sound';
import { 
  Bell, 
  RotateCw, 
  Play, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  User, 
  Clock, 
  FileText, 
  Send,
  AlertTriangle,
  Stethoscope,
  Activity,
  ArrowRight
} from 'lucide-react';

export default function OperatorDesk({ tenantSlug }) {
  const [tenant, setTenant] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [stages, setStages] = useState([]);
  const [selectedStageId, setSelectedStageId] = useState('');
  const [counterLabel, setCounterLabel] = useState('Sala de Triagem 01');
  const [operatorName, setOperatorName] = useState('Enfª. Mariana Souza');
  const [queueTickets, setQueueTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [skipToStageId, setSkipToStageId] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitial();
  }, [tenantSlug]);

  const loadInitial = async () => {
    try {
      setLoading(true);
      const tenantData = await api.getTenant(tenantSlug);
      setTenant(tenantData);

      const servicesData = await api.getServices(tenantSlug);
      setServices(servicesData);

      if (servicesData.length > 0) {
        const firstService = servicesData[0];
        setSelectedServiceId(firstService.id);
        const stagesData = await api.getStages(tenantSlug, firstService.id);
        setStages(stagesData);
        if (stagesData.length > 0) {
          setSelectedStageId(stagesData[0].id);
          setCounterLabel(stagesData[0].counter_label);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading operator desk:', err);
      setLoading(false);
    }
  };

  // Switch service and fetch its stages
  const handleServiceChange = async (serviceId) => {
    setSelectedServiceId(serviceId);
    const stagesData = await api.getStages(tenantSlug, serviceId);
    setStages(stagesData);
    if (stagesData.length > 0) {
      setSelectedStageId(stagesData[0].id);
      setCounterLabel(stagesData[0].counter_label);
    }
  };

  // Load tickets for current stage and listen to WebSocket events
  useEffect(() => {
    if (!tenant || !selectedStageId) return;

    fetchQueue();

    const socket = getSocket();
    socket.emit('join_tenant', {
      tenantId: tenant.id,
      role: 'desk',
      stageId: selectedStageId,
      operatorName
    });

    socket.on('desk_queue_updated', () => {
      fetchQueue();
    });

    socket.on('ticket_created', (data) => {
      if (data.stageId === selectedStageId) {
        fetchQueue();
      }
    });

    return () => {
      socket.off('desk_queue_updated');
      socket.off('ticket_created');
    };
  }, [tenant, selectedStageId]);

  const fetchQueue = async () => {
    if (!tenant) return;
    try {
      const tickets = await api.getTenantTickets(tenant.id, {
        stage_id: selectedStageId,
        service_id: selectedServiceId
      });

      // Filter active tickets for this desk
      const waiting = tickets.filter(t => t.status === 'waiting');
      const inService = tickets.find(t => t.status === 'called' || t.status === 'in_progress');

      setQueueTickets(waiting);
      setActiveTicket(inService || null);
    } catch (err) {
      console.error('Error fetching stage queue:', err);
    }
  };

  // Call specific ticket from queue
  const handleCallSpecific = async (ticketId) => {
    try {
      setActionLoading(true);
      soundManager.playChime();
      const updated = await api.callTicket(ticketId, counterLabel, operatorName);
      setActiveTicket(updated);
      setClinicalNotes('');
      fetchQueue();
      setActionLoading(false);
    } catch (err) {
      alert(err.message || 'Erro ao chamar paciente');
      setActionLoading(false);
    }
  };

  // Dismiss current ticket from desk to free the counter
  const handleDismiss = () => {
    setActiveTicket(null);
    setClinicalNotes('');
  };

  // Call Next Ticket
  const handleCallNext = async () => {
    if (queueTickets.length === 0) {
      alert('Nenhum paciente aguardando nesta fila no momento.');
      return;
    }
    const nextTicket = queueTickets[0];
    try {
      setActionLoading(true);
      soundManager.playChime();
      const updated = await api.callTicket(nextTicket.id, counterLabel, operatorName);
      setActiveTicket(updated);
      setClinicalNotes('');
      fetchQueue();
      setActionLoading(false);
    } catch (err) {
      alert(err.message || 'Erro ao chamar paciente');
      setActionLoading(false);
    }
  };

  // Recall current ticket
  const handleRecall = async () => {
    if (!activeTicket) return;
    try {
      setActionLoading(true);
      soundManager.playUrgentChime();
      const updated = await api.recallTicket(activeTicket.id);
      setActiveTicket(updated);
      setActionLoading(false);
    } catch (err) {
      alert(err.message);
      setActionLoading(false);
    }
  };

  // Start Consultation
  const handleStart = async () => {
    if (!activeTicket) return;
    try {
      setActionLoading(true);
      const updated = await api.startTicket(activeTicket.id);
      setActiveTicket(updated);
      setActionLoading(false);
    } catch (err) {
      alert(err.message);
      setActionLoading(false);
    }
  };

  // Complete Stage & Transfer to Next Stage
  const handleCompleteStage = async () => {
    if (!activeTicket) return;
    try {
      setActionLoading(true);
      const res = await api.completeStage(activeTicket.id, clinicalNotes, skipToStageId || undefined);
      setActiveTicket(null);
      setClinicalNotes('');
      setSkipToStageId('');
      fetchQueue();
      setActionLoading(false);
    } catch (err) {
      alert(err.message);
      setActionLoading(false);
    }
  };

  // Cancel Ticket
  const handleCancel = async () => {
    if (!activeTicket) return;
    const reason = prompt('Motivo do cancelamento (ex: Não compareceu):', 'Não compareceu');
    if (!reason) return;

    try {
      setActionLoading(true);
      await api.cancelTicket(activeTicket.id, reason);
      setActiveTicket(null);
      setClinicalNotes('');
      fetchQueue();
      setActionLoading(false);
    } catch (err) {
      alert(err.message);
      setActionLoading(false);
    }
  };

  const currentStageObj = stages.find(s => s.id === selectedStageId);
  const remainingStages = stages.filter(s => s.step_order > (currentStageObj?.step_order || 0));

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Top Station Settings Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-extrabold text-teal-400 tracking-wider">
              Painel do Profissional / Operador
            </span>
            <h1 className="text-xl font-black text-white">{tenant?.name}</h1>
          </div>

          {/* Config Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            {/* Service */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Serviço:</label>
              <select
                value={selectedServiceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-medium focus:border-teal-500"
              >
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Stage */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Etapa de Atendimento:</label>
              <select
                value={selectedStageId}
                onChange={(e) => {
                  setSelectedStageId(e.target.value);
                  const stg = stages.find(s => s.id === e.target.value);
                  if (stg) setCounterLabel(stg.counter_label);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-medium focus:border-teal-500"
              >
                {stages.map(st => (
                  <option key={st.id} value={st.id}>{st.step_order}. {st.name}</option>
                ))}
              </select>
            </div>

            {/* Counter */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Sala / Guichê:</label>
              <input
                type="text"
                value={counterLabel}
                onChange={(e) => setCounterLabel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-medium focus:border-teal-500"
              />
            </div>

            {/* Operator */}
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Profissional:</label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-medium focus:border-teal-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: ACTIVE TICKET IN SERVICE (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${activeTicket ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                <h2 className="text-base font-bold text-white">
                  {activeTicket ? 'Paciente em Atendimento' : 'Nenhum Paciente Chamado'}
                </h2>
              </div>
              {activeTicket && (
                <span className="text-xs uppercase font-extrabold px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Status: {activeTicket.status === 'called' ? 'CHAMADO' : 'EM CONSULTA'}
                </span>
              )}
            </div>

            {activeTicket ? (
              <div className="space-y-5">
                {/* Ticket Details Banner */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block">Senha</span>
                    <div className="text-5xl font-black font-mono tracking-tight text-white mt-1">
                      {activeTicket.display_code}
                    </div>
                    <span className="text-sm font-semibold text-teal-400 block mt-1">
                      {activeTicket.customer_name}
                    </span>
                  </div>

                  <div className="text-right space-y-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase inline-block ${
                      activeTicket.priority === 'urgente' 
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                        : activeTicket.priority === 'preferencial' 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {activeTicket.priority}
                    </span>
                    <div className="text-xs text-slate-400">
                      Chamadas: <strong>{activeTicket.call_count || 1}x</strong>
                    </div>
                  </div>
                </div>

                {/* Calling & Progress Actions */}
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={handleRecall}
                    disabled={actionLoading}
                    className="flex-1 py-3 px-4 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 font-bold rounded-xl border border-amber-500/30 text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <RotateCw className="w-4 h-4" />
                    Chamar Novamente ({activeTicket.call_count}ª)
                  </button>

                  {activeTicket.status === 'called' && (
                    <button
                      onClick={handleStart}
                      disabled={actionLoading}
                      className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
                    >
                      <Play className="w-4 h-4" />
                      Iniciar Atendimento
                    </button>
                  )}

                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="py-3 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold rounded-xl border border-rose-500/20 text-xs transition-all"
                    title="Não compareceu ou cancelado"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>

                {/* Clinical Notes / Medical Observations */}
                {currentStageObj?.allow_notes && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-teal-400" />
                      Anotações Clínicas & Conduta (Salvo no prontuário do ticket):
                    </label>
                    <textarea
                      rows={3}
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                      placeholder="Ex: PA 120/80 mmHg, saturação 98%, queixa de cefaleia há 2 dias. Encaminhado para avaliação médica..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                )}

                {/* Next Stage Routing Selector */}
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Destino do Paciente ao Concluir:</span>
                    <span className="text-teal-400 font-medium">
                      {skipToStageId 
                        ? stages.find(s => s.id === skipToStageId)?.name 
                        : remainingStages.length > 0 
                        ? `Próxima: ${remainingStages[0].name}` 
                        : '🏁 Alta / Finalização'}
                    </span>
                  </div>

                  {remainingStages.length > 1 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Desviar fluxo para:</span>
                      <select
                        value={skipToStageId}
                        onChange={(e) => setSkipToStageId(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200"
                      >
                        <option value="">Fluxo Padrão Sequencial</option>
                        {remainingStages.map(st => (
                          <option key={st.id} value={st.id}>{st.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    onClick={handleCompleteStage}
                    disabled={actionLoading}
                    className="w-full py-4 bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 font-black rounded-xl shadow-lg shadow-teal-500/20 text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {remainingStages.length > 0 
                      ? 'Concluir Etapa e Encaminhar para Próxima Fila' 
                      : 'Concluir Atendimento e Liberar Paciente (Alta)'}
                  </button>
                </div>
              </div>
            ) : (
              /* Empty state: Call next button */
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto text-teal-400">
                  <Bell className="w-8 h-8 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Pronto para o Próximo Paciente?</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                    Há <strong>{queueTickets.length}</strong> pessoas aguardando na fila de {currentStageObj?.name}.
                  </p>
                </div>
                <button
                  onClick={handleCallNext}
                  disabled={actionLoading || queueTickets.length === 0}
                  className="py-3.5 px-8 bg-teal-500 hover:bg-teal-400 active:scale-95 disabled:opacity-50 text-slate-950 font-extrabold text-sm rounded-xl shadow-xl shadow-teal-500/20 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  Chamar Próximo da Fila
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: QUEUE WAITING LIST (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Fila de Espera</h3>
                <span className="text-xs text-slate-400">{currentStageObj?.name}</span>
              </div>
              <span className="px-3 py-1 bg-slate-800 text-teal-300 font-mono font-bold text-xs rounded-full">
                {queueTickets.length} na espera
              </span>
            </div>

            {queueTickets.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                Fila vazia no momento.
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-[500px] pr-1">
                {queueTickets.map((tkt, idx) => (
                  <div
                    key={tkt.id}
                    className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 flex items-center justify-between hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 font-mono font-bold text-xs flex items-center justify-center text-slate-300">
                        {idx + 1}º
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-white text-base">
                            {tkt.display_code}
                          </span>
                          {tkt.priority === 'urgente' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                              URGENTE
                            </span>
                          )}
                          {tkt.priority === 'preferencial' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                              PREF
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          {tkt.customer_name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <span className="text-[11px] text-teal-400 font-semibold block">
                          ~{tkt.waitInfo?.estimatedWaitMinutes || 5} min
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          espera estimada
                        </span>
                      </div>
                      <button
                        onClick={() => handleCallSpecific(tkt.id)}
                        disabled={actionLoading}
                        className="py-2 px-3 bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 shadow-md shadow-teal-500/20 cursor-pointer transition-all"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        Chamar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

