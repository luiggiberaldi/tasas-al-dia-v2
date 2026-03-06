
import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Calculator, Wallet, Store, Download, Search, Key, TrendingUp } from 'lucide-react';

import MonitorView from './views/MonitorView';
import CalculatorView from './views/CalculatorView';
import { ProductsView } from './views/ProductsView';
import WalletView from './views/WalletView';
import SalesView from './views/SalesView';
import { TesterView } from './views/TesterView';

import { useRates } from './hooks/useRates';
import { useSecurity } from './hooks/useSecurity';
import PremiumGuard from './components/security/PremiumGuard';
import TermsOverlay from './components/TermsOverlay';
import OnboardingOverlay from './components/OnboardingOverlay';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  // Estado para la vista (monitor, calc, wallet, info -> tienda)
  const [activeTab, setActiveTab] = useState('monitor');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIOSInstall, setShowIOSInstall] = useState(false);

  // Detectar iOS Safari (no standalone) para mostrar instrucciones manuales de instalación
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const showIOSButton = isIOS && !isStandalone && !localStorage.getItem('ios_install_dismissed');

  // Admin Panel States
  const [adminClicks, setAdminClicks] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showTester, setShowTester] = useState(false);
  const [clientDeviceId, setClientDeviceId] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  const { rates, loading, isOffline, logs, updateData, notificationsEnabled, enableNotifications } = useRates();
  const { generateCodeForClient, isPremium, isDemo, demoTimeLeft, demoExpiredMsg, dismissExpiredMsg } = useSecurity();

  useEffect(() => {
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

  // LOGICA THEME — factory default siempre es CLARO
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved;
      // Factory default: SIEMPRE claro (ignoramos prefers-color-scheme del sistema)
      return 'light';
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




  // Keyboard/Focus Detection for Mobile (Hides Nav & Actions)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const baseHeight = useRef(0);

  useEffect(() => {
    if (!window.visualViewport) return;

    // Usar window.innerHeight como base — más estable que visualViewport.height en Samsung One UI
    const captureBase = () => {
      baseHeight.current = window.innerHeight;
    };

    // Capturar ahora y de nuevo después de que el browser termine de renderizar
    captureBase();
    const initTimer = setTimeout(captureBase, 500);

    const handleViewport = () => {
      const vh = window.visualViewport.height;
      // Umbral de 150px para evitar falsos positivos por la gesture bar de Samsung
      const isUp = vh < baseHeight.current - 150;
      setIsKeyboardOpen(isUp);
    };

    const handleFocusBack = () => setTimeout(handleViewport, 300);

    // Re-capturar la base en cambios de orientación
    const handleOrientationChange = () => {
      setTimeout(() => {
        captureBase();
        handleViewport();
      }, 400);
    };

    window.visualViewport.addEventListener('resize', handleViewport);
    window.visualViewport.addEventListener('scroll', handleViewport);
    window.addEventListener('focusin', handleFocusBack);
    window.addEventListener('focusout', handleFocusBack);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      clearTimeout(initTimer);
      window.visualViewport?.removeEventListener('resize', handleViewport);
      window.visualViewport?.removeEventListener('scroll', handleViewport);
      window.removeEventListener('focusin', handleFocusBack);
      window.removeEventListener('focusout', handleFocusBack);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);


  const currentViewProps = {
    triggerHaptic,
    rates,
    toggleTheme,
    theme,
    isKeyboardOpen, // Pass down
    // Monitor Props
    loading, isOffline, onRefresh: updateData, lastLog: logs[logs.length - 1], notificationsEnabled, enableNotifications,
    // Products Props
    // (Nada extra por ahora, solo rates y haptic)
  };

  return (
    <div className="font-sans antialiased bg-slate-50 dark:bg-black h-[100dvh] flex flex-col overflow-clip transition-colors duration-300">

      {/* Terms and Conditions Overlay (First Use) */}
      <TermsOverlay />

      {/* Tutorial Onboarding (First Use, after Terms) */}
      <OnboardingOverlay isPremium={isPremium} />

      {/* Demo Banner (discreto) */}
      {isDemo && demoTimeLeft && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-500 pointer-events-none">
          <div className="px-3 py-1.5 bg-slate-900/90 dark:bg-white/10 backdrop-blur-md rounded-full border border-white/10 shadow-xl flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
            <p className="text-[10px] font-semibold text-white tracking-wide">
              Licencia: <span className="text-amber-400 font-bold">{demoTimeLeft}</span>
            </p>
          </div>
        </div>
      )}

      {/* Demo Expired Modal */}
      {demoExpiredMsg && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-5 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 max-w-sm shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⏳</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Prueba finalizada</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              {demoExpiredMsg}
            </p>
            <button
              onClick={() => {
                const msg = `Hola! Quiero adquirir la licencia Premium de PreciosAlDía. Acabo de terminar mi prueba gratuita.`;
                window.open(`https://wa.me/584124051793?text=${encodeURIComponent(msg)}`, '_blank');
              }}
              className="w-full py-3 bg-[#10B981] text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform text-sm mb-2"
            >
              Solicitar Licencia
            </button>
            <button
              onClick={dismissExpiredMsg}
              className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Continuar con versión gratuita
            </button>
          </div>
        </div>
      )}

      {/* Golden Tester View Overlay */}
      {showTester && (
        <div className="fixed inset-0 z-[150] bg-slate-50 dark:bg-slate-950">
          <TesterView rates={rates} onBack={() => setShowTester(false)} />
        </div>
      )}

      {/* Viewport: Flex-1 para ocupar el espacio restante automáticamente */}
      <main className={`flex-1 w-full max-w-md md:max-w-3xl lg:max-w-7xl mx-auto p-3 sm:p-6 relative ${isKeyboardOpen ? 'pb-4' : 'pb-36'} scrollbar-hide flex flex-col overflow-y-auto`}>



        {activeTab === 'monitor' && (
          <MonitorView {...currentViewProps} />
        )}

        {activeTab === 'calc' && (
          <ErrorBoundary>
            <CalculatorView
              rates={rates}
              toggleTheme={toggleTheme}
              theme={theme}
              triggerHaptic={triggerHaptic}
              isKeyboardOpen={isKeyboardOpen} // [NEW] Prop passed
            />
          </ErrorBoundary>
        )}

        {activeTab === 'wallet' && (
          <WalletView rates={rates} triggerHaptic={triggerHaptic} />
        )}

        {activeTab === 'info' && (
          <PremiumGuard featureName="Catálogo & Tienda" isShop={true}>
            <ProductsView rates={rates} triggerHaptic={triggerHaptic} />
          </PremiumGuard>
        )}

        {activeTab === 'sales' && (
          <PremiumGuard featureName="Zona de Ventas">
            <SalesView theme={theme} triggerHaptic={triggerHaptic} rates={rates} />
          </PremiumGuard>
        )}
      </main>

      {/* Navegación Inferior (Hidden when keyboard is open) */}
      {!isKeyboardOpen && (
        <div className="fixed bottom-0 left-0 right-0 px-6 pb-[env(safe-area-inset-bottom)] pt-0 mb-6 max-w-md mx-auto z-30 pointer-events-none animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-3xl p-1.5 flex justify-between items-center shadow-2xl shadow-slate-900/30 border border-white/10 ring-1 ring-black/5 pointer-events-auto">
            <TabButton icon={<LayoutDashboard size={20} strokeWidth={activeTab === 'monitor' ? 3 : 2} />} label="Inicio" isActive={activeTab === 'monitor'} onClick={() => { triggerHaptic(); setActiveTab('monitor'); }} />
            <TabButton icon={<Calculator size={20} strokeWidth={activeTab === 'calc' ? 3 : 2} />} label="Calc" isActive={activeTab === 'calc'} onClick={() => { triggerHaptic(); setActiveTab('calc'); }} />
            <TabButton icon={<Wallet size={20} strokeWidth={activeTab === 'wallet' ? 3 : 2} />} label="Cuentas" isActive={activeTab === 'wallet'} onClick={() => { triggerHaptic(); setActiveTab('wallet'); }} />

            <TabButton icon={<TrendingUp size={20} strokeWidth={activeTab === 'sales' ? 3 : 2} />} label="Ventas" isActive={activeTab === 'sales'} onClick={() => { triggerHaptic(); setActiveTab('sales'); }} />

            {installPrompt && activeTab === 'monitor' && (
              <button onClick={() => { triggerHaptic(); handleInstall(); }} className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all duration-300 bg-emerald-500 text-white shadow-md animate-pulse">
                <Download size={20} strokeWidth={3} />
              </button>
            )}

            {/* iOS: botón manual de instalación */}
            {!installPrompt && showIOSButton && activeTab === 'monitor' && (
              <button onClick={() => { triggerHaptic(); setShowIOSInstall(true); }} className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all duration-300 bg-emerald-500 text-white shadow-md animate-pulse">
                <Download size={20} strokeWidth={3} />
              </button>
            )}

            <TabButton icon={<Store size={20} strokeWidth={activeTab === 'info' ? 3 : 2} />} label="Tienda" isActive={activeTab === 'info'} onClick={() => { triggerHaptic(); setActiveTab('info'); }} />
          </div>
        </div>
      )}

      {/* iOS Install Instructions Modal */}
      {showIOSInstall && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-end justify-center p-0 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-200">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">Instalar App</h3>
                <p className="text-xs text-slate-400 mt-1">Sigue estos pasos en Safari</p>
              </div>
              <button onClick={() => { setShowIOSInstall(false); localStorage.setItem('ios_install_dismissed', '1'); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0 text-blue-600 font-bold text-sm">1</div>
                <p className="text-sm text-slate-600 dark:text-slate-300">Toca el botón <strong>Compartir</strong> <span className="inline-block w-5 h-5 align-middle">⬆️</span> en la barra de Safari</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0 text-blue-600 font-bold text-sm">2</div>
                <p className="text-sm text-slate-600 dark:text-slate-300">Busca y toca <strong>"Agregar a la pantalla de inicio"</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center shrink-0 text-emerald-600 font-bold text-sm">✓</div>
                <p className="text-sm text-slate-600 dark:text-slate-300">¡Listo! La app aparecerá como un ícono en tu teléfono</p>
              </div>
            </div>
            <button onClick={() => { setShowIOSInstall(false); localStorage.setItem('ios_install_dismissed', '1'); }} className="w-full mt-6 py-3 bg-brand text-slate-900 font-bold rounded-xl shadow-lg active:scale-95 transition-transform">
              Entendido
            </button>
          </div>
        </div>
      )}

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

            <button
              onClick={() => { triggerHaptic(); setShowTester(true); setShowAdminPanel(false); }}
              className="w-full bg-indigo-600/20 border border-indigo-500/50 text-indigo-400 font-bold py-2 rounded-lg text-xs uppercase tracking-tighter hover:bg-indigo-600/30 transition-colors"
            >
              🚀 Abrir Golden Tester (PDA v3.0)
            </button>

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