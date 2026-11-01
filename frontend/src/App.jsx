import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MobileTracker from './components/MobileTracker';
import TotemKiosk from './components/TotemKiosk';
import OperatorDesk from './components/OperatorDesk';
import TvDisplay from './components/TvDisplay';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [currentView, setCurrentView] = useState('totem'); // 'totem' | 'desk' | 'display' | 'admin' | 'mobile'
  const [tenantSlug, setTenantSlug] = useState('clinica-sao-rafael');
  const [activeMobileToken, setActiveMobileToken] = useState('');
  const [isStandaloneMobile, setIsStandaloneMobile] = useState(false);

  // Check URL on load (e.g., if scanned via QR code directly: http://<ip>:5173/track/tk_12345678)
  useEffect(() => {
    const pathname = window.location.pathname;
    const match = pathname.match(/\/track\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      setActiveMobileToken(match[1]);
      setCurrentView('mobile');
      setIsStandaloneMobile(true);
    }
  }, []);

  const handleOpenMobileTracker = (token) => {
    setActiveMobileToken(token);
    setCurrentView('mobile');
  };

  // If patient scanned with their real smartphone, show dedicated standalone mobile tracker view
  if (isStandaloneMobile && activeMobileToken) {
    return <MobileTracker initialToken={activeMobileToken} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Interactive Navbar */}
      <Navbar 
        currentView={currentView}
        onViewChange={setCurrentView}
        tenantSlug={tenantSlug}
        onTenantChange={setTenantSlug}
        hasActiveMobileToken={Boolean(activeMobileToken)}
      />

      {/* Main Content Area based on selected View */}
      <main className="flex-1 py-6 px-4 sm:px-6">
        {currentView === 'totem' && (
          <TotemKiosk 
            tenantSlug={tenantSlug} 
            onOpenMobileTracker={handleOpenMobileTracker}
          />
        )}

        {currentView === 'desk' && (
          <OperatorDesk 
            tenantSlug={tenantSlug} 
          />
        )}

        {currentView === 'display' && (
          <TvDisplay 
            tenantSlug={tenantSlug} 
          />
        )}

        {currentView === 'admin' && (
          <AdminPanel 
            tenantSlug={tenantSlug}
            onTenantChange={setTenantSlug}
          />
        )}

        {currentView === 'mobile' && (
          <div>
            {!activeMobileToken ? (
              <div className="max-w-md mx-auto p-6 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto text-teal-400">
                  📱
                </div>
                <h3 className="text-base font-bold text-white">Nenhum Ticket Aberto</h3>
                <p className="text-xs text-slate-400">
                  Emita uma senha na aba <strong>Totem</strong> para simular o acompanhamento pelo celular, ou digite o código do token abaixo:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: tk_abc123"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    id="manualTokenInput"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('manualTokenInput');
                      if (input?.value) setActiveMobileToken(input.value.trim());
                    }}
                    className="px-4 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs"
                  >
                    Abrir
                  </button>
                </div>
                <button
                  onClick={() => setCurrentView('totem')}
                  className="text-xs text-teal-400 hover:underline block mx-auto"
                >
                  Ir para o Totem e Emitir Senha ➜
                </button>
              </div>
            ) : (
              <div className="py-2">
                <div className="max-w-md mx-auto mb-2 text-right">
                  <button
                    onClick={() => setActiveMobileToken('')}
                    className="text-[11px] text-slate-400 hover:text-rose-400"
                  >
                    ✕ Trocar de Ticket
                  </button>
                </div>
                <MobileTracker initialToken={activeMobileToken} />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="bg-slate-950 border-t border-slate-900 py-3 text-center text-[11px] text-slate-500">
        NextQueue Multi-Tenant • Socket.IO Engine • Gestão Inteligente com Margem de Espera
      </footer>
    </div>
  );
}
