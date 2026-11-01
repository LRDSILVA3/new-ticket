import React from 'react';
import { 
  Smartphone, 
  Printer, 
  Stethoscope, 
  Tv, 
  Settings, 
  Building2,
  Activity
} from 'lucide-react';

export default function Navbar({ currentView, onViewChange, tenantSlug, onTenantChange, hasActiveMobileToken }) {
  const views = [
    { id: 'mobile', label: 'Celular (QR Tracker)', icon: Smartphone, badge: hasActiveMobileToken ? 'Ativo' : null },
    { id: 'totem', label: 'Totem de Autoatendimento', icon: Printer },
    { id: 'desk', label: 'Painel do Operador / Médico', icon: Stethoscope },
    { id: 'display', label: 'Painel TV (Chamadas)', icon: Tv },
    { id: 'admin', label: 'Gestão de Etapas & Margem', icon: Settings }
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo / App Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-md shadow-teal-500/20">
              <Activity className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="text-sm font-black tracking-tight text-white block">
                NextQueue <span className="text-teal-400 font-mono text-xs font-normal">v1.0</span>
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">
                Multi-Tenant • Multi-Serviço • WebSocket Live
              </span>
            </div>
          </div>

          {/* View Navigation Switcher */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
            {views.map((v) => {
              const Icon = v.icon;
              const isActive = currentView === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => onViewChange(v.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {v.label}
                  {v.badge && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Tenant Switcher */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 hidden sm:inline">Empresa:</span>
            <select
              value={tenantSlug}
              onChange={(e) => onTenantChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-teal-300 focus:outline-none focus:border-teal-500"
            >
              <option value="clinica-sao-rafael">Hospital São Rafael</option>
              <option value="clinica-saude-total">Clínica Saúde Total</option>
            </select>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-2 border-t border-slate-800/60 no-scrollbar">
          {views.map((v) => {
            const Icon = v.icon;
            const isActive = currentView === v.id;
            return (
              <button
                key={v.id}
                onClick={() => onViewChange(v.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${
                  isActive ? 'bg-teal-500 text-slate-950' : 'bg-slate-950 text-slate-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {v.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

