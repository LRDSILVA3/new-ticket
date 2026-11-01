import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { 
  QrCode, 
  Printer, 
  Smartphone, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  User, 
  Phone, 
  Sparkles,
  HeartPulse,
  Stethoscope,
  FlaskConical,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export default function TotemKiosk({ tenantSlug, onOpenMobileTracker }) {
  const [tenant, setTenant] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [priority, setPriority] = useState('normal'); // 'normal' | 'preferencial' | 'urgente'
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);

  // Load tenant and services
  useEffect(() => {
    loadData();
  }, [tenantSlug]);

  const loadData = async () => {
    try {
      setLoading(true);
      const tenantData = await api.getTenant(tenantSlug);
      setTenant(tenantData);
      const servicesData = await api.getServices(tenantSlug);
      setServices(servicesData);
      if (servicesData.length > 0) {
        setSelectedService(servicesData[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading totem data:', err);
      setLoading(false);
    }
  };

  const handleEmitTicket = async () => {
    if (!selectedService) return;
    try {
      setIssuing(true);
      const res = await api.createTicket({
        tenant_id: tenant.id,
        service_id: selectedService.id,
        customer_name: customerName || 'Paciente / Visitante',
        customer_phone: customerPhone,
        priority
      });
      setCreatedTicket(res);
      setIssuing(false);
    } catch (err) {
      alert(err.message || 'Erro ao gerar senha');
      setIssuing(false);
    }
  };

  const handleReset = () => {
    setCreatedTicket(null);
    setCustomerName('');
    setCustomerPhone('');
    setPriority('normal');
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // --- VIEW 2: TICKET PRINTED & QR CODE PRESENTATION ---
  if (createdTicket) {
    const { ticket, qrCode, waitInfo, trackingUrl } = createdTicket;
    return (
      <div className="max-w-xl mx-auto p-4 animate-fadeIn">
        <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 relative overflow-hidden">
          {/* Top Notch design */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-2 bg-teal-500 rounded-b-xl"></div>

          <div className="text-center pb-4 border-b border-dashed border-slate-300">
            <span className="text-xs uppercase font-extrabold text-teal-600 tracking-wider">
              {tenant?.name}
            </span>
            <h2 className="text-sm text-slate-500 font-medium">{selectedService?.name}</h2>
            
            <div className="mt-4 mb-2">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Sua Ficha de Atendimento</span>
              <div className="text-5xl font-black font-mono tracking-tight text-slate-950 mt-1">
                {ticket.display_code}
              </div>
            </div>

            <div className="inline-block mt-1">
              {ticket.priority === 'urgente' && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-300">
                  ⚠️ URGÊNCIA CLÍNICA
                </span>
              )}
              {ticket.priority === 'preferencial' && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  ♿ ATENDIMENTO PREFERENCIAL
                </span>
              )}
              {ticket.priority === 'normal' && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                  CONVENCIONAL
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 mt-2 font-medium">
              Paciente: <strong>{ticket.customer_name}</strong>
            </p>
          </div>

          {/* QR Code Presentation Box */}
          <div className="py-6 text-center space-y-3 bg-slate-50/80 -mx-6 sm:-mx-8 px-6 my-2 border-y border-dashed border-slate-200">
            <div className="inline-block p-3 bg-white rounded-2xl shadow-md border border-slate-200">
              <img 
                src={qrCode} 
                alt="QR Code para Acompanhamento" 
                className="w-48 h-48 sm:w-56 sm:h-56 mx-auto rounded-lg object-contain"
              />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center justify-center gap-1.5">
                <Smartphone className="w-5 h-5 text-teal-600" />
                Aponte a câmera do seu celular!
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Acompanhe o tempo médio, sua posição na fila e saiba exatamente quando for chamado diretamente pelo smartphone.
              </p>
            </div>
          </div>

          {/* Initial estimated time & stats */}
          <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
            <div className="bg-slate-100 p-3 rounded-xl">
              <span className="text-slate-500 block">Posição inicial:</span>
              <strong className="text-slate-900 text-base">{waitInfo?.positionInQueue || 1}º lugar</strong>
            </div>
            <div className="bg-teal-50 border border-teal-100 p-3 rounded-xl">
              <span className="text-teal-700 block">Tempo estimado:</span>
              <strong className="text-teal-900 text-base">~{waitInfo?.estimatedWaitMinutes || 8} min</strong>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onOpenMobileTracker(ticket.tracking_token)}
              className="flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Smartphone className="w-4 h-4" />
              Abrir no Celular (Simulação)
            </button>
            <button
              onClick={handleReset}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
            >
              Emitir Nova Senha
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW 1: TOTEM KIOSK TOUCHSCREEN SELECTION ---
  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Totem Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div>
            <span className="text-xs uppercase font-extrabold text-teal-400 tracking-wider">
              Totem de Autoatendimento
            </span>
            <h1 className="text-2xl font-black text-white">{tenant?.name}</h1>
            <p className="text-xs text-slate-400 mt-0.5">{tenant?.tagline}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-xl">
            🎫
          </div>
        </div>

        {/* Step 1: Select Service */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            1. Selecione o Serviço Desejado:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((svc) => {
              const isSelected = selectedService?.id === svc.id;
              return (
                <button
                  key={svc.id}
                  onClick={() => setSelectedService(svc)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    isSelected 
                      ? 'bg-teal-500/20 border-teal-500 shadow-lg ring-1 ring-teal-500/30' 
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-teal-300">
                      {svc.code_prefix}
                    </span>
                    {isSelected && <CheckCircle className="w-5 h-5 text-teal-400" />}
                  </div>
                  <h3 className="text-sm font-bold text-white mt-2">{svc.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{svc.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Select Priority */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            2. Tipo de Fila:
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setPriority('normal')}
              className={`p-3.5 rounded-2xl border text-center transition-all ${
                priority === 'normal'
                  ? 'bg-emerald-500/20 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-base font-bold text-white">Convencional</div>
              <span className="text-[11px] text-slate-400 block mt-0.5">Ordem de chegada</span>
            </button>

            <button
              type="button"
              onClick={() => setPriority('preferencial')}
              className={`p-3.5 rounded-2xl border text-center transition-all ${
                priority === 'preferencial'
                  ? 'bg-amber-500/20 border-amber-500 shadow-md ring-1 ring-amber-500/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-base font-bold text-amber-300">Preferencial</div>
              <span className="text-[11px] text-slate-400 block mt-0.5">Idosos, PCD, Gestantes</span>
            </button>

            <button
              type="button"
              onClick={() => setPriority('urgente')}
              className={`p-3.5 rounded-2xl border text-center transition-all ${
                priority === 'urgente'
                  ? 'bg-rose-500/20 border-rose-500 shadow-md ring-1 ring-rose-500/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-base font-bold text-rose-400">Urgência</div>
              <span className="text-[11px] text-slate-400 block mt-0.5">Prioridade médica</span>
            </button>
          </div>
        </div>

        {/* Step 3: Optional Identification */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            3. Identificação do Paciente (Opcional):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input 
                type="text"
                placeholder="Nome do Paciente"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input 
                type="text"
                placeholder="WhatsApp / Telefone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Emit button */}
        <button
          onClick={handleEmitTicket}
          disabled={issuing || !selectedService}
          className="w-full py-4 bg-teal-500 hover:bg-teal-400 active:scale-95 disabled:opacity-50 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-teal-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {issuing ? (
            <>
              <div className="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></div>
              Emitindo Ficha e Gerando QR Code...
            </>
          ) : (
            <>
              <Printer className="w-5 h-5" />
              Emitir Minha Ficha com QR Code
            </>
          )}
        </button>
      </div>
    </div>
  );
}

