import React, { useEffect, useState, useRef } from 'react';
import { getSocket } from '../utils/socket';
import { api } from '../utils/api';
import { soundManager } from '../utils/sound';
import confetti from 'canvas-confetti';
import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Stethoscope, 
  FlaskConical, 
  Bell, 
  UserCheck, 
  ChevronRight, 
  Info, 
  ShieldCheck, 
  Smartphone, 
  Volume2, 
  Star,
  MapPin,
  RefreshCw,
  Sparkles
} from 'lucide-react';

const iconMap = {
  Activity,
  Stethoscope,
  FlaskConical,
  CheckCircle2,
  UserCheck,
  AlertCircle
};

export default function MobileTracker({ initialToken }) {
  const [token, setToken] = useState(initialToken || '');
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('status'); // 'status' | 'timeline' | 'clinical'
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [lastCalledStage, setLastCalledStage] = useState(null);
  const [showWaitDetails, setShowWaitDetails] = useState(false);

  const socketRef = useRef(null);

  // Parse token from URL if not provided via props
  useEffect(() => {
    if (!token) {
      const pathParts = window.location.pathname.split('/');
      const urlToken = pathParts[pathParts.length - 1];
      if (urlToken && urlToken.startsWith('tk_')) {
        setToken(urlToken);
      }
    }
  }, [token]);

  // Load ticket and connect WebSocket
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Initial HTTP fetch
    api.trackTicket(token)
      .then(data => {
        setTicketData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Ticket não encontrado');
        setLoading(false);
      });

    // Setup WebSocket connection
    const socket = getSocket();
    socketRef.current = socket;

    // Join the private ticket room (triggers QR_TRACKER_OPENED event on server)
    socket.emit('join_ticket', { 
      trackingToken: token,
      userAgent: navigator.userAgent
    });

    socket.on('ticket_snapshot', (data) => {
      setTicketData(data);
    });

    socket.on('ticket_updated', (data) => {
      setTicketData(data);

      // If status changed to 'called', trigger chime and vibration!
      if (data.ticket?.status === 'called') {
        soundManager.playUrgentChime();
        soundManager.vibrate();
        soundManager.speakCall(data.ticket.display_code, data.ticket.assigned_counter);
        setLastCalledStage(data.ticket.assigned_counter);
      }

      // If completed, trigger confetti!
      if (data.ticket?.status === 'completed') {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    });

    socket.on('queue_position_updated', ({ waitInfo }) => {
      setTicketData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          waitInfo
        };
      });
    });

    return () => {
      socket.off('ticket_snapshot');
      socket.off('ticket_updated');
      socket.off('queue_position_updated');
    };
  }, [token]);

  // User gesture to enable audio context if restricted by browser
  const handleEnableAudio = () => {
    soundManager.init();
    soundManager.playChime();
    setAudioEnabled(true);
  };

  const priorityBadge = (priority) => {
    switch (priority) {
      case 'urgente':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">URGÊNCIA</span>;
      case 'preferencial':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">PREFERENCIAL</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">CONVENCIONAL</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
          <Activity className="w-6 h-6 text-teal-400 absolute inset-0 m-auto" />
        </div>
        <p className="mt-4 text-slate-400 text-sm font-medium animate-pulse">Sincronizando com a fila em tempo real...</p>
      </div>
    );
  }

  if (error || !ticketData) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Ticket Não Encontrado</h2>
        <p className="text-slate-400 text-sm max-w-xs mb-6">
          {error || 'Não encontramos as informações deste ticket. Verifique se o QR Code foi lido corretamente.'}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Tentar Novamente
        </button>
      </div>
    );
  }

  const { ticket, tenant, service, stages, events, waitInfo } = ticketData;
  const currentStage = stages.find(s => s.id === ticket.current_stage_id) || stages[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md mx-auto relative shadow-2xl border-x border-slate-800/60 pb-16">
      {/* Real-time connection & audio bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-emerald-400 font-medium">Ao vivo via WebSocket</span>
        </div>
        {!audioEnabled ? (
          <button 
            onClick={handleEnableAudio}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 rounded-lg text-[11px] font-semibold border border-teal-500/30 transition-all"
          >
            <Volume2 className="w-3.5 h-3.5 text-teal-400" /> Ativar Som de Chamada
          </button>
        ) : (
          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
            <Volume2 className="w-3 h-3 text-emerald-400" /> Alerta sonoro ativo
          </span>
        )}
      </div>

      {/* Tenant Branding Header */}
      <div className="p-4 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400">Atendimento Digital</span>
            <h1 className="text-base font-bold text-white leading-tight">{tenant.name}</h1>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-slate-500" /> {tenant.address || 'Unidade Principal'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold">
            🏥
          </div>
        </div>

        {/* Ticket Big Card */}
        <div className="mt-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">{service.name}</span>
            {priorityBadge(ticket.priority)}
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">Sua Senha</span>
              <div className="text-4xl font-black tracking-tight text-white font-mono mt-0.5">
                {ticket.display_code}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Paciente</span>
              <span className="text-sm font-semibold text-slate-200">{ticket.customer_name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Status Visualizer */}
      <div className="p-4 space-y-4">
        {/* --- STATE 1: CALLED (High Alert Call Banner) --- */}
        {ticket.status === 'called' && (
          <div className="rounded-2xl bg-gradient-to-br from-rose-950/80 via-rose-900/40 to-slate-900 border-2 border-rose-500/80 p-5 shadow-2xl relative overflow-hidden call-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-lg animate-bounce-short">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-rose-400">Atenção! Sua Vez Chegou!</span>
                <h3 className="text-lg font-black text-white">É A SUA VEZ!</h3>
              </div>
            </div>

            <div className="bg-slate-950/80 rounded-xl p-3.5 border border-rose-500/40 mt-2 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Dirija-se para:</span>
                <span className="text-base font-extrabold text-teal-300 font-mono">
                  {ticket.assigned_counter || currentStage.counter_label}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-800/80 pt-2">
                <span className="text-xs text-slate-400">Profissional:</span>
                <span className="text-xs font-semibold text-slate-200">
                  {ticket.assigned_operator || 'Atendente Responsável'}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-800/80 pt-2">
                <span className="text-xs text-slate-400">Etapa Atual:</span>
                <span className="text-xs font-semibold text-rose-300">
                  {currentStage.name}
                </span>
              </div>
            </div>

            <button 
              onClick={() => {
                soundManager.init();
                alert('Obrigado! Por favor, encaminhe-se à sala indicada.');
              }}
              className="w-full mt-4 py-3 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 text-sm transition-all"
            >
              Estou a Caminho da Sala 🏃‍♂️
            </button>
          </div>
        )}

        {/* --- STATE 2: IN PROGRESS --- */}
        {ticket.status === 'in_progress' && (
          <div className="rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/40 p-5 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">Atendimento Iniciado</span>
                <h3 className="text-base font-bold text-white">{currentStage.name}</h3>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Você está sendo atendido por <strong className="text-slate-200">{ticket.assigned_operator}</strong> na <strong className="text-slate-200">{ticket.assigned_counter}</strong>.
            </p>
          </div>
        )}

        {/* --- STATE 3: WAITING IN QUEUE (With Tenant Wait Time & Safety Buffer) --- */}
        {ticket.status === 'waiting' && (
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-400" />
                <span className="text-sm font-semibold text-white">Aguardando Chamada</span>
              </div>
              <span className="text-xs px-2.5 py-1 bg-teal-500/10 text-teal-300 font-semibold rounded-lg border border-teal-500/20">
                Etapa {currentStage.step_order} de {stages.length}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Position in line */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/90 flex flex-col justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Sua Posição</span>
                <div className="text-3xl font-black text-white mt-1">
                  {waitInfo?.positionInQueue ? `${waitInfo.positionInQueue}º` : '1º'}
                </div>
                <span className="text-[11px] text-slate-500 mt-1">
                  {waitInfo?.peopleAhead === 0 ? 'Você é o próximo!' : `${waitInfo?.peopleAhead} à sua frente`}
                </span>
              </div>

              {/* Estimated wait time */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/90 flex flex-col justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Tempo Estimado</span>
                <div className="text-3xl font-black text-teal-400 mt-1">
                  ~{waitInfo?.estimatedWaitMinutes || 5}<span className="text-sm font-semibold text-teal-300/80 ml-0.5">min</span>
                </div>
                <button 
                  onClick={() => setShowWaitDetails(!showWaitDetails)}
                  className="text-[10px] text-teal-400/90 hover:underline flex items-center gap-0.5 mt-1"
                >
                  <Info className="w-3 h-3" /> Ver cálculo com margem
                </button>
              </div>
            </div>

            {/* Safety Margin Calculation breakdown (Requested feature!) */}
            {showWaitDetails && waitInfo?.breakdown && (
              <div className="bg-teal-950/30 border border-teal-500/20 rounded-xl p-3 text-xs text-slate-300 space-y-1.5 animate-fadeIn">
                <div className="flex items-center gap-1.5 font-bold text-teal-300">
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  Margem de Segurança da Empresa
                </div>
                <p className="text-[11px] text-slate-400">
                  Para evitar atrasos indesejados, a administração configurou uma margem protetiva:
                </p>
                <div className="bg-slate-900/80 rounded p-2 font-mono text-[11px] text-teal-200">
                  {waitInfo.breakdown.formula}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                  <span>Tempo base operacional: <strong>{waitInfo.breakdown.baseMinutes} min</strong></span>
                  <span>Margem adicional: <strong>+{waitInfo.breakdown.bufferAddedMinutes} min</strong></span>
                </div>
              </div>
            )}

            {/* Total journey estimation */}
            <div className="bg-slate-950/60 rounded-xl px-3.5 py-2.5 border border-slate-800/70 flex items-center justify-between text-xs">
              <span className="text-slate-400">Tempo estimado total da jornada:</span>
              <span className="font-bold text-slate-200">~{waitInfo?.totalJourneyEstimatedMinutes || 35} minutos</span>
            </div>
          </div>
        )}

        {/* --- STATE 4: COMPLETED (Discharge / Finalization) --- */}
        {ticket.status === 'completed' && (
          <div className="rounded-2xl bg-gradient-to-br from-teal-950/80 via-slate-900 to-slate-900 border border-teal-500/50 p-6 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center mx-auto text-teal-300">
              <Sparkles className="w-8 h-8 text-teal-400 animate-spin" />
            </div>

            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider text-teal-400">Atendimento Finalizado</span>
              <h2 className="text-xl font-black text-white mt-0.5">Todas as etapas foram concluídas!</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Você passou com sucesso por todas as salas e fases do seu atendimento. Tenha um excelente dia!
              </p>
            </div>

            {/* Feedback survey */}
            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800">
              <span className="text-xs font-semibold text-slate-300 block mb-2">
                Como foi sua experiência hoje?
              </span>
              {!feedbackSent ? (
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => {
                        setFeedbackRating(star);
                        setFeedbackSent(true);
                        confetti({ particleCount: 50, spread: 50 });
                      }}
                      className="p-1 hover:scale-125 transition-transform"
                    >
                      <Star className={`w-7 h-7 ${feedbackRating >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-teal-400 font-semibold animate-fadeIn">
                  ⭐ Obrigado pela sua avaliação ({feedbackRating} estrelas)!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 text-xs font-semibold">
          <button 
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-2.5 border-b-2 text-center transition-all ${activeTab === 'status' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            Etapas ({stages.length})
          </button>
          <button 
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 py-2.5 border-b-2 text-center transition-all ${activeTab === 'timeline' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            Linha do Tempo ({events.length})
          </button>
          {ticket.clinical_notes && ticket.clinical_notes.length > 0 && (
            <button 
              onClick={() => setActiveTab('clinical')}
              className={`flex-1 py-2.5 border-b-2 text-center transition-all ${activeTab === 'clinical' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
            >
              Histórico Clínico
            </button>
          )}
        </div>

        {/* TAB 1: STAGES STEPPER */}
        {activeTab === 'status' && (
          <div className="space-y-3 pt-1">
            <div className="text-xs text-slate-400 font-medium px-1">
              Roteiro de Atendimento da Empresa:
            </div>

            <div className="space-y-2.5">
              {stages.map((stg, index) => {
                const isPassed = ticket.status === 'completed' || stg.step_order < ticket.current_stage_order;
                const isCurrent = ticket.status !== 'completed' && stg.id === ticket.current_stage_id;
                const isUpcoming = stg.step_order > ticket.current_stage_order && ticket.status !== 'completed';
                const IconComp = iconMap[stg.icon] || Activity;

                return (
                  <div 
                    key={stg.id}
                    className={`rounded-xl p-3.5 border transition-all ${
                      isCurrent 
                        ? 'bg-slate-900 border-teal-500 shadow-md ring-1 ring-teal-500/30' 
                        : isPassed 
                        ? 'bg-slate-950/60 border-emerald-500/30 opacity-90' 
                        : 'bg-slate-950/40 border-slate-800/80 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div 
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mt-0.5 ${
                            isPassed 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : isCurrent 
                              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/40 animate-pulse' 
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isPassed ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : index + 1}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className={`text-sm font-bold ${isCurrent ? 'text-teal-300' : isPassed ? 'text-slate-200 line-through decoration-emerald-500/50' : 'text-slate-400'}`}>
                              {stg.name}
                            </h4>
                          </div>
                          <span className="text-xs text-slate-400 block mt-0.5">
                            {stg.counter_label}
                          </span>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            {stg.description}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        {isPassed && (
                          <span className="text-[10px] uppercase font-bold text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                            Concluído
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] uppercase font-bold text-teal-300 px-2 py-0.5 bg-teal-500/20 rounded border border-teal-500/40 animate-pulse">
                            Agora
                          </span>
                        )}
                        {isUpcoming && (
                          <span className="text-[10px] text-slate-500">
                            ~{stg.default_avg_minutes} min
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: AUDIT TIMELINE (WebSocket event history) */}
        {activeTab === 'timeline' && (
          <div className="space-y-3 pt-1">
            <div className="text-xs text-slate-400 font-medium px-1">
              Registro auditável de eventos emitidos:
            </div>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {events.map((evt, idx) => (
                <div key={evt.id || idx} className="relative group">
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-teal-500 border-2 border-slate-950 group-hover:scale-125 transition-all"></div>
                  <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5 text-xs">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                      <span className="font-mono text-teal-400/90 font-semibold">{evt.event_type}</span>
                      <span>{new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-300 font-medium">
                      {evt.payload?.message || evt.event_type}
                    </p>
                    {evt.payload?.counter && (
                      <span className="inline-block mt-1 text-[11px] text-slate-400">
                        📍 {evt.payload.counter} {evt.payload.operator ? `(${evt.payload.operator})` : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CLINICAL NOTES */}
        {activeTab === 'clinical' && (
          <div className="space-y-3 pt-1">
            <div className="text-xs text-slate-400 font-medium px-1">
              Anotações registradas pelos profissionais:
            </div>

            <div className="space-y-2.5">
              {ticket.clinical_notes?.map((note, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-teal-300">{note.stage_name}</span>
                    <span className="text-[10px] text-slate-500">{new Date(note.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-slate-300 italic bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                    "{note.notes}"
                  </p>
                  <span className="text-[10px] text-slate-400 block text-right">
                    Profissional: {note.operator} ({note.counter})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Footer info */}
      <div className="mt-auto px-4 py-3 bg-slate-950 border-t border-slate-900 text-center text-[11px] text-slate-500">
        Pode aguardar confortavelmente onde desejar. Seu celular vibrará e emitirá sinal sonoro quando você for chamado!
      </div>
    </div>
  );
}

