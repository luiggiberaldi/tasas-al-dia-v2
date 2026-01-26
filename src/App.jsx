
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Calculator, Wallet, Store, Download, Search, Key } from 'lucide-react';

import MonitorView from './views/MonitorView';
import CalculatorView from './views/CalculatorView';
import { ProductsView } from './views/ProductsView';
import WalletView from './views/WalletView';

import { useRates } from './hooks/useRates';
import { useSecurity } from './hooks/useSecurity';
import PremiumGuard from './components/security/PremiumGuard';
import runOneSignal from './OneSignal';

export default function App() {
  // Estado para la vista (monitor, calc, wallet, info -> tienda)
  const [activeTab, setActiveTab] = useState('monitor');
  const [installPrompt, setInstallPrompt] = useState(null);

  // Admin Panel States
  const [adminClicks, setAdminClicks] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [clientDeviceId, setClientDeviceId] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  const { rates, loading, isOffline, logs, updateData, notificationsEnabled, enableNotifications } = useRates();
  const { generateCodeForClient } = useSecurity();

  useEffect(() => {
    runOneSignal();
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  // LOGICA THEME
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // HAPTIC FEEDBACK GLOBAL (PDA v1.0)
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  // ADMIN PANEL LOGIC (Hidden)
  const handleLogoClick = () => {
    const now = Date.now();
    // Reset clicks if too slow (more than 1s between clicks)
    if (window.lastClickTime && (now - window.lastClickTime > 1000)) {
      setAdminClicks(1);
    } else {
      setAdminClicks(prev => prev + 1);
    }
    window.lastClickTime = now;

    if (adminClicks + 1 >= 10) {
      setShowAdminPanel(true);
      setAdminClicks(0);
      triggerHaptic();
    }
  };

  const handleGenerateCode = async (e) => {
    e.preventDefault();
    if (!clientDeviceId) return;
    const code = await generateCodeForClient(clientDeviceId);
    setGeneratedCode(code);
  };


  const currentViewProps = {
    triggerHaptic,
    rates,
    toggleTheme,
    theme,
    // Monitor Props
    loading, isOffline, onRefresh: updateData, lastLog: logs[logs.length - 1], notificationsEnabled, enableNotifications,
    // Products Props
    // (Nada extra por ahora, solo rates y haptic)
  };

  return (
    <div className="font-sans antialiased bg-slate-50 dark:bg-black min-h-screen transition-colors duration-300">

      {/* Viewport */}
      <main className="w-full max-w-md md:max-w-3xl lg:max-w-7xl mx-auto min-h-screen p-3 sm:p-6 relative pb-36">

        {/* Hidden Admin Trigger Area (Top Left, invisible) */}
        <div
          className="absolute top-0 left-0 w-20 h-20 z-50 cursor-pointer opacity-0"
          onClick={handleLogoClick}
          title="Ssshh..."
        ></div>

        {activeTab === 'monitor' && (
          <MonitorView {...currentViewProps} />
        )}

        {activeTab === 'calc' && (
          <CalculatorView rates={rates} toggleTheme={toggleTheme} theme={theme} triggerHaptic={triggerHaptic} />
        )}

        {activeTab === 'wallet' && (
          <WalletView rates={rates} triggerHaptic={triggerHaptic} />
        )}

        {activeTab === 'info' && (
          <PremiumGuard featureName="Catálogo & Tienda" isShop={true}>
            <ProductsView rates={rates} triggerHaptic={triggerHaptic} />
          </PremiumGuard>
        )}
      </main>

      {/* Navegación Inferior */}
      <div className="fixed bottom-6 left-0 right-0 px-6 max-w-md mx-auto z-30">
        <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-3xl p-1.5 flex justify-between items-center shadow-2xl shadow-slate-900/30 border border-white/10 ring-1 ring-black/5">
          <TabButton icon={<LayoutDashboard size={20} strokeWidth={activeTab === 'monitor' ? 3 : 2} />} label="Inicio" isActive={activeTab === 'monitor'} onClick={() => { triggerHaptic(); setActiveTab('monitor'); }} />
          <TabButton icon={<Calculator size={20} strokeWidth={activeTab === 'calc' ? 3 : 2} />} label="Calc" isActive={activeTab === 'calc'} onClick={() => { triggerHaptic(); setActiveTab('calc'); }} />
          <TabButton icon={<Wallet size={20} strokeWidth={activeTab === 'wallet' ? 3 : 2} />} label="Cuentas" isActive={activeTab === 'wallet'} onClick={() => { triggerHaptic(); setActiveTab('wallet'); }} />

          {installPrompt && activeTab === 'monitor' && (
            <button onClick={() => { triggerHaptic(); handleInstall(); }} className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all duration-300 bg-emerald-500 text-white shadow-md animate-pulse">
              <Download size={20} strokeWidth={3} />
            </button>
          )}

          <TabButton icon={<Store size={20} strokeWidth={activeTab === 'info' ? 3 : 2} />} label="Tienda" isActive={activeTab === 'info'} onClick={() => { triggerHaptic(); setActiveTab('info'); }} />
        </div>
      </div>

      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Key className="text-amber-500" /> Admin Gen
              </h2>
              <button onClick={() => setShowAdminPanel(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleGenerateCode}>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-2">ID del Cliente</label>
              <input
                type="text"
                value={clientDeviceId}
                onChange={e => setClientDeviceId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white mb-4 font-mono uppercase"
                placeholder="TASAS-XXXX"
              />
              <button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 rounded-lg mb-4">
                Generar Código
              </button>
            </form>

            {generatedCode && (
              <div className="bg-green-900/30 border border-green-500/50 p-4 rounded-lg text-center">
                <p className="text-xs text-green-400 mb-1">Código Generado:</p>
                <p className="text-xl font-mono font-bold text-white tracking-widest selectable select-all">
                  {generatedCode}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

function TabButton({ icon, label, isActive, onClick }) {
  const handleClick = () => {
    // El triggerHaptic se pasa en el onClick del padre, pero por si acaso
    onClick();
  };
  return (
    <button onClick={handleClick} className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all duration-300 ${isActive ? 'bg-brand text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
      {icon}
      {isActive && <span className="text-[9px] font-extrabold animate-in zoom-in duration-200">{label}</span>}
    </button>
  );
}