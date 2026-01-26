import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Calculator, Wallet, Store, Download } from 'lucide-react'; // [UPDATED]

import MonitorView from './views/MonitorView';
import CalculatorView from './views/CalculatorView';
import { ProductsView } from './views/ProductsView'; // [NEW]
import WalletView from './views/WalletView';

import { useRates } from './hooks/useRates';
import runOneSignal from './OneSignal';

export default function App() {
  // Estado para la vista (monitor, calc, wallet, info -> tienda)
  const [activeTab, setActiveTab] = useState('monitor');
  const [installPrompt, setInstallPrompt] = useState(null);

  const { rates, loading, isOffline, logs, updateData, notificationsEnabled, enableNotifications } = useRates();

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

  // LOGICA THEME (Preservada)
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

  return (
    <div className="font-sans antialiased bg-slate-50 dark:bg-black min-h-screen transition-colors duration-300">

      {/* Viewport */}
      <main className="w-full max-w-md md:max-w-3xl lg:max-w-7xl mx-auto min-h-screen p-3 sm:p-6 relative pb-36">
        {activeTab === 'monitor' && (
          <MonitorView
            rates={rates} loading={loading} isOffline={isOffline}
            onRefresh={updateData} lastLog={logs[logs.length - 1]}
            toggleTheme={toggleTheme} theme={theme}
            notificationsEnabled={notificationsEnabled}
            enableNotifications={enableNotifications}
          />
        )}

        {activeTab === 'calc' && (
          <CalculatorView rates={rates} toggleTheme={toggleTheme} theme={theme} />
        )}

        {activeTab === 'wallet' && (
          <WalletView rates={rates} />
        )}

        {activeTab === 'info' && (
          <ProductsView rates={rates} /> // [MODIFIED]
        )}
      </main>

      {/* Navegación Inferior */}
      <div className="fixed bottom-6 left-0 right-0 px-6 max-w-md mx-auto z-30">
        <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-3xl p-1.5 flex justify-between items-center shadow-2xl shadow-slate-900/30 border border-white/10 ring-1 ring-black/5">
          <TabButton icon={<LayoutDashboard size={20} strokeWidth={activeTab === 'monitor' ? 3 : 2} />} label="Inicio" isActive={activeTab === 'monitor'} onClick={() => setActiveTab('monitor')} />
          <TabButton icon={<Calculator size={20} strokeWidth={activeTab === 'calc' ? 3 : 2} />} label="Calc" isActive={activeTab === 'calc'} onClick={() => setActiveTab('calc')} />

          <TabButton icon={<Wallet size={20} strokeWidth={activeTab === 'wallet' ? 3 : 2} />} label="Cuentas" isActive={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} />

          {installPrompt && activeTab === 'monitor' && (
            <button onClick={handleInstall} className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all duration-300 bg-emerald-500 text-white shadow-md animate-pulse">
              <Download size={20} strokeWidth={3} />
            </button>
          )}

          {/* Nuevo Botón Tienda (reemplaza Info) */}
          <TabButton icon={<Store size={20} strokeWidth={activeTab === 'info' ? 3 : 2} />} label="Tienda" isActive={activeTab === 'info'} onClick={() => setActiveTab('info')} />
        </div>
      </div>
    </div>
  );
}

function TabButton({ icon, label, isActive, onClick }) {
  return (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all duration-300 ${isActive ? 'bg-brand text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
      {icon}
      {isActive && <span className="text-[9px] font-extrabold animate-in zoom-in duration-200">{label}</span>}
    </button>
  );
}