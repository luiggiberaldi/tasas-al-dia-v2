import React, { useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, WifiOff, Clock, Bell, BellRing, Maximize, Minimize } from 'lucide-react';

export default function MonitorView({ rates, loading, isOffline, onRefresh, toggleTheme, theme, copyLogs, enableNotifications, notificationsEnabled }) {
  
  const [secretCount, setSecretCount] = useState(0);
  const [kioskMode, setKioskMode] = useState(false);

  const handleSecretDebug = () => {
    const newCount = secretCount + 1;
    setSecretCount(newCount);
    if (newCount === 7) {
        copyLogs && copyLogs(); 
        setSecretCount(0);
    }
    if (newCount === 1) setTimeout(() => setSecretCount(0), 2000);
  };
  
  const formatVES = (amount) => {
    return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  // Cálculo de Brecha Cambiaria (Spread)
  const spread = rates.bcv.price > 0 ? ((rates.usdt.price - rates.bcv.price) / rates.bcv.price) * 100 : 0;
  
  // Cálculo de la Diferencia en Bs
  const diffBs = rates.usdt.price - rates.bcv.price;

  const renderChange = (change) => {
    if (!change || change === 0) return null;
    const isPositive = change > 0;
    return (
      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 border ${isPositive ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30' : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30'}`}>
        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {Math.abs(change).toFixed(2)}%
      </span>
    );
  };

  // --- VISTA KIOSCO (WIDGET PANTALLA COMPLETA) ---
  if (kioskMode) {
      return (
        <div className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col justify-center items-center p-6 animate-in zoom-in duration-300">
            <button 
                onClick={() => setKioskMode(false)} 
                className="absolute top-6 right-6 p-4 bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
            >
                <Minimize size={24}/>
            </button>

            <div className="flex flex-col items-center justify-center space-y-4 mb-16 scale-110">
                {/* Logo en modo kiosco */}
                <img 
                    src="/logodark.png" 
                    alt="TasasAlDía" 
                    className="h-24 sm:h-32 w-auto object-contain animate-in fade-in zoom-in duration-700"
                />

                <h1 className="text-[6.5rem] sm:text-[8rem] font-black font-mono leading-none tracking-tighter text-brand drop-shadow-2xl">
                    {formatVES(rates.usdt.price)}
                </h1>
                <p className="text-xl text-slate-500 font-mono font-medium">1 USDT = {formatVES(rates.usdt.price)} Bs</p>
            </div>

            <div className="flex gap-12 opacity-60">
                <div className="text-center">
                    <p className="text-sm font-bold uppercase text-slate-500 tracking-wider mb-1">BCV OFICIAL</p>
                    <p className="text-3xl font-mono font-bold">{formatVES(rates.bcv.price)}</p>
                </div>
                <div className="text-center">
                    <p className="text-sm font-bold uppercase text-slate-500 tracking-wider mb-1">EURO BCV</p>
                    <p className="text-3xl font-mono font-bold">{formatVES(rates.euro.price)}</p>
                </div>
            </div>
        </div>
      );
  }

  // --- SKELETON LOADING ---
  if (loading && (!rates || !rates.usdt || rates.usdt.price === 0)) {
    return (
        <div className="space-y-8 pt-6 px-1 animate-pulse">
            <div className="flex justify-between items-center mb-8 px-2">
                <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                <div className="flex gap-2">
                    <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                </div>
            </div>
            <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-[2rem]"></div>
            <div className="grid grid-cols-2 gap-4">
                <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-[1.5rem]"></div>
                <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-[1.5rem]"></div>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-24">
      
      {/* --- HEADER --- */}
      <header className="flex items-center justify-between pt-6 pb-2 px-3">
        <button 
            onClick={handleSecretDebug} 
            className="flex flex-col items-start gap-1 active:scale-95 transition-transform outline-none"
        >
            {/* ✅ LOGO REDUCIDO: h-10 (40px) móvil / h-12 (48px) desktop */}
            <img 
                src={theme === 'dark' ? '/logodark.png' : '/logoprincipal.png'} 
                alt="TasasAlDía" 
                className="h-10 sm:h-12 w-auto object-contain animate-in fade-in slide-in-from-left-2 duration-500 drop-shadow-sm" 
            />
            
            {/* Badge ajustado para el nuevo tamaño */}
            <div className="bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm ml-1 mt-0.5">
                <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] leading-none">
                    V3.0 FÉNIX
                </p>
            </div>
        </button>

        <div className="flex items-center gap-2">
            <button 
                onClick={() => setKioskMode(true)} 
                className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-brand-dark dark:hover:text-brand transition-all shadow-sm active:scale-95"
                title="Modo Pantalla Completa"
            >
                <Maximize size={18} strokeWidth={2} />
            </button>
            
            <button 
                onClick={enableNotifications} 
                disabled={notificationsEnabled}
                className={`p-2.5 rounded-2xl border transition-all active:scale-95 shadow-sm 
                    ${notificationsEnabled 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-400 cursor-default' 
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-400 hover:text-brand-dark'
                    }`}
            >
                {notificationsEnabled ? <BellRing size={18} strokeWidth={2.5} /> : <Bell size={18} strokeWidth={2} />}
            </button>

            <button onClick={onRefresh} disabled={loading} className={`p-2.5 rounded-2xl text-slate-900 shadow-lg shadow-brand/10 border border-transparent transition-all active:scale-95 ${loading ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 cursor-not-allowed' : 'bg-brand hover:bg-brand-light border-brand-light/50'}`}>
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} strokeWidth={2.5} />
            </button>
        </div>
      </header>

      {/* Status Bar */}
      {(loading || isOffline) && (
        <div className={`mx-1 rounded-xl p-2.5 flex items-center justify-center gap-2 text-xs font-bold border animate-in zoom-in duration-300 ${isOffline ? 'bg-red-50 border-red-100 text-red-600 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400' : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700'}`}>
           {isOffline ? <WifiOff size={14}/> : <RefreshCw size={14} className="animate-spin"/>}
           <span>{isOffline ? 'Modo Sin Conexión' : 'Sincronizando tasas...'}</span>
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid gap-6">
          <div className="relative group">
             <div className="absolute -inset-0.5 bg-gradient-to-r from-brand/30 to-purple-500/30 rounded-[2.2rem] blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
             <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] p-7 shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
                 
                 <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.02] transform rotate-12 pointer-events-none">
                    <TrendingUp size={140} />
                 </div>

                 <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-400 dark:text-slate-500">Promedio P2P</span>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                            Tasa USDT
                            {rates.usdt.type === 'p2p' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                        </h2>
                    </div>
                    {renderChange(rates.usdt.change)}
                 </div>

                 <div className="flex items-baseline gap-1 mb-6">
                     <span className="text-2xl text-slate-300 dark:text-slate-600 font-bold font-sans transform -translate-y-4">$</span>
                     <div className="text-[4rem] leading-none font-black text-slate-900 dark:text-white tracking-tighter font-mono">
                        {formatVES(rates.usdt.price).split(',')[0]}
                        <span className="text-3xl text-slate-400 dark:text-slate-600">,{formatVES(rates.usdt.price).split(',')[1]}</span>
                     </div>
                     <span className="text-xl font-bold text-slate-400 ml-2">Bs</span>
                 </div>

                 <div className="flex items-center gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                    <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${spread > 10 ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                        Brecha: {spread.toFixed(2)}%
                    </div>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 truncate">
                         Diferencia: {formatVES(diffBs)} Bs
                    </span>
                 </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <RateCardMini title="Dolar BCV Oficial" price={rates.bcv.price} change={rates.bcv.change} icon="🏛️" formatVES={formatVES} renderChange={renderChange} />
              <RateCardMini title="Euro BCV Oficial" price={rates.euro.price} change={rates.euro.change} icon="🇪🇺" formatVES={formatVES} renderChange={renderChange} />
          </div>
      </div>
      
      {/* Footer Clock */}
      <div className="flex justify-center pb-4 opacity-60 hover:opacity-100 transition-opacity">
         <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
            <Clock size={12} className="text-slate-400" />
            <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
                Actualizado: {rates.lastUpdate ? new Date(rates.lastUpdate).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
            </span>
         </div>
      </div>
    </div>
  );
}

function RateCardMini({ title, price, change, icon, formatVES, renderChange }) {
    return (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 duration-300">
            <div className="flex justify-between items-start mb-4">
                <span className="text-xl filter grayscale opacity-80">{icon}</span>
                {change !== 0 ? renderChange(change) : <div className="h-5"></div>}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">{title}</span>
            <div className="text-xl font-black text-slate-800 dark:text-white tracking-tight font-mono">{formatVES(price)}</div>
            <div className="text-[10px] text-slate-400 font-medium">Bs / $</div>
        </div>
    );
}