import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { getSocket } from '../utils/socket';
import { soundManager } from '../utils/sound';
import { Volume2, Maximize2, Bell, Clock } from 'lucide-react';

export default function TvDisplay({ tenantSlug }) {
  const [tenant, setTenant] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [soundReady, setSoundReady] = useState(false);

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load tenant
  useEffect(() => {
    api.getTenant(tenantSlug)
      .then(t => setTenant(t))
      .catch(console.error);
  }, [tenantSlug]);

  // WebSocket for TV display
  useEffect(() => {
    if (!tenant) return;

    const socket = getSocket();
    socket.emit('join_tenant', {
      tenantId: tenant.id,
      role: 'display'
    });

    socket.on('display:call', (data) => {
      // Trigger chime and TTS speech
      soundManager.playChime();
      soundManager.speakCall(data.displayCode, data.counter);

      setCurrentCall(data);
      setCallHistory(prev => [data, ...prev.filter(c => c.ticketId !== data.ticketId)].slice(0, 5));
    });

    return () => {
      socket.off('display:call');
    };
  }, [tenant]);

  const handleEnableSound = () => {
    soundManager.init();
    soundManager.playChime();
    setSoundReady(true);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-6 sm:p-8 select-none overflow-hidden">
      {/* TV Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-teal-500/20">
            🏥
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">{tenant?.name || 'Painel de Atendimento'}</h1>
            <p className="text-xs text-teal-400 font-semibold tracking-wider uppercase">Painel de Chamada em Tempo Real</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {!soundReady && (
            <button
              onClick={handleEnableSound}
              className="px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 rounded-xl text-xs font-bold border border-teal-500/30 flex items-center gap-2 animate-bounce-short"
            >
              <Volume2 className="w-4 h-4" /> Ativar Áudio do Painel
            </button>
          )}

          <div className="text-right">
            <div className="text-2xl font-mono font-black text-slate-200">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs text-slate-400 capitalize">
              {currentTime.toLocaleDateString([], { weekday: 'long', day: '2-digit', month: 'long' })}
            </div>
          </div>

          <button 
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800"
            title="Tela Cheia"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Display Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        {/* CURRENT HERO CALL (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col">
          {currentCall ? (
            <div className="flex-1 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/40 border-4 border-teal-500 rounded-3xl p-8 sm:p-12 shadow-2xl flex flex-col justify-between relative overflow-hidden call-pulse animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm uppercase font-extrabold tracking-widest text-teal-400 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center gap-2">
                  <Bell className="w-4 h-4 animate-bounce" /> CHAMADA ATUAL
                </span>
                {currentCall.priority === 'urgente' && (
                  <span className="text-xs sm:text-sm uppercase font-black px-4 py-1.5 rounded-full bg-rose-500 text-white animate-pulse">
                    URGÊNCIA
                  </span>
                )}
                {currentCall.priority === 'preferencial' && (
                  <span className="text-xs sm:text-sm uppercase font-bold px-4 py-1.5 rounded-full bg-amber-500 text-slate-950">
                    PREFERENCIAL
                  </span>
                )}
              </div>

              {/* Huge Ticket Code */}
              <div className="text-center my-8">
                <span className="text-sm sm:text-base font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  SENHA
                </span>
                <div className="text-7xl sm:text-9xl font-black font-mono tracking-wider text-white drop-shadow-[0_10px_20px_rgba(20,184,166,0.3)]">
                  {currentCall.displayCode}
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-teal-300 mt-4">
                  {currentCall.customerName}
                </div>
              </div>

              {/* Destination Room */}
              <div className="bg-slate-950/80 rounded-2xl p-6 sm:p-8 border border-teal-500/40 text-center">
                <span className="text-xs sm:text-sm uppercase font-bold text-slate-400 tracking-wider block">
                  POR FAVOR, DIRIJA-SE PARA:
                </span>
                <div className="text-3xl sm:text-5xl font-black text-white font-mono mt-1">
                  {currentCall.counter}
                </div>
                <span className="text-sm font-semibold text-teal-400 mt-2 block">
                  {currentCall.stageName}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-6">
                <Clock className="w-12 h-12 animate-pulse" />
              </div>
              <h2 className="text-3xl font-black text-white">Aguardando Próxima Chamada</h2>
              <p className="text-slate-400 text-sm max-w-md mt-2">
                Acompanhe as senhas nesta tela ou no seu celular escaneando o QR Code da sua ficha.
              </p>
            </div>
          )}
        </div>

        {/* RECENT CALLS HISTORY (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex-1 flex flex-col shadow-xl">
            <h3 className="text-base font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-3 mb-4">
              Últimas Chamadas
            </h3>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {callHistory.length === 0 ? (
                <div className="text-slate-500 text-xs text-center py-12">
                  Histórico vazio no momento.
                </div>
              ) : (
                callHistory.map((call, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      idx === 0 
                        ? 'bg-teal-500/10 border-teal-500/40' 
                        : 'bg-slate-950/60 border-slate-800/80 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-2xl font-black text-white">
                        {call.displayCode}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-teal-300 mt-1">
                      {call.counter}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {call.customerName}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

