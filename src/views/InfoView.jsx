import React, { useState } from 'react';
import { Shield, FileText, AlertTriangle, Server, ChevronRight, Terminal, Copy, ArrowLeft, CreditCard, Calculator, BellRing, TrendingUp, Info, Sun, Moon } from 'lucide-react';

export default function InfoView({ logs, toggleTheme, theme }) {
  const [showLogs, setShowLogs] = useState(false);
  const [legalView, setLegalView] = useState(null); 

  const handleCopyLogs = () => {
    const text = logs.map(l => `[${l.time}] ${l.msg}`).join('\n');
    navigator.clipboard.writeText(text);
    alert("Registros copiados al portapapeles");
  };

  // --- VISTAS LEGALES (LAYOUT MEJORADO) ---
  if (legalView) {
    const isTerms = legalView === 'terms';
    return (
      <LegalDocLayout 
        title={isTerms ? "Términos y Condiciones" : "Política de Privacidad"} 
        onBack={() => setLegalView(null)}
      >
        {isTerms ? (
           /* TEXTO ORIGINAL DE TÉRMINOS */
           <div className="space-y-4">
              <p><strong>Última actualización:</strong> Diciembre 2025</p>
              <h4>1. Aceptación de los Términos</h4>
              <p>Al descargar, acceder o utilizar la aplicación "TasasAlDía" (en adelante, "la Aplicación"), usted acepta estar sujeto a estos Términos y Condiciones.</p>
              <h4>2. Naturaleza Informativa</h4>
              <p>La Aplicación tiene como único propósito proporcionar información referencial sobre las tasas de cambio en Venezuela. <strong>TasasAlDía no es una entidad financiera.</strong></p>
              <h4>3. Exención de Responsabilidad</h4>
              <p>Los desarrolladores no garantizan la exactitud inmediata de los datos. <strong>Usted asume toda la responsabilidad por el uso de esta Aplicación.</strong></p>
              <h4>4. Propiedad Intelectual</h4>
              <p>Todo el contenido y código fuente son propiedad exclusiva de TasasAlDía.</p>
           </div>
        ) : (
           /* TEXTO ORIGINAL DE PRIVACIDAD */
           <div className="space-y-4">
              <p><strong>Última actualización:</strong> Diciembre 2025</p>
              <h4>1. Recopilación de Datos</h4>
              <p><strong>No recopilamos, almacenamos ni compartimos sus datos personales</strong> en servidores externos.</p>
              <h4>2. Almacenamiento Local</h4>
              <p>Utilizamos el almacenamiento de su dispositivo (`localStorage`) para guardar sus preferencias y cuentas bancarias configuradas.</p>
              <h4>3. Servicios de Terceros</h4>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>OneSignal:</strong> Para notificaciones push anónimas.</li>
                  <li><strong>Google Apps Script:</strong> Para consultar tasas públicas.</li>
              </ul>
           </div>
        )}
      </LegalDocLayout>
    );
  }

  // --- VISTA PRINCIPAL ---
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pt-6 pb-24">
      
      {/* HEADER CON BOTÓN DE TEMA */}
      <div className="flex items-center gap-3 px-2">
         <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <Info size={24} className="text-brand-dark dark:text-brand stroke-[2.5]" />
         </div>
         <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none">
                Información
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                TasasAlDía <span className="text-brand-dark dark:text-brand">v3.0 Fénix</span>
            </p>
         </div>

         {/* ✅ BOTÓN DE TEMA AGREGADO AQUÍ (Alineado a la derecha) */}
         <button 
            onClick={toggleTheme} 
            className="ml-auto p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-brand-dark dark:hover:text-brand transition-all active:scale-95 shadow-sm"
         >
            {theme === 'dark' ? <Sun size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
         </button>
      </div>

      {/* AVISO IMPORTANTE (Diseño Tarjeta) */}
      <div className="relative overflow-hidden bg-amber-50 dark:bg-slate-800/50 border border-amber-100 dark:border-amber-900/30 p-5 rounded-[1.5rem]">
        <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-amber-200/20 dark:bg-amber-500/10 rounded-full blur-xl"></div>
        <div className="relative z-10 flex gap-4">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-600 dark:text-amber-500 shrink-0 h-fit">
                <AlertTriangle size={20} strokeWidth={2.5} />
            </div>
            <div className="space-y-1">
                <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">Aviso Importante</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed text-justify">
                    Esta aplicación no está afiliada ni tiene relación oficial con el Banco Central de Venezuela. 
                    No somos una entidad financiera. Los datos son referenciales.
                </p>
            </div>
        </div>
      </div>

      {/* --- ECOSISTEMA (Grid) --- */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-2">
            <h3 className="font-black text-lg text-slate-800 dark:text-white">Ecosistema</h3>
            <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 uppercase">Todo en uno</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
            <FeatureCard 
                icon={<TrendingUp size={18} strokeWidth={2.5} />} 
                title="Monitor Híbrido" 
                desc="Tasas BCV y USDT (P2P) actualizadas en tiempo real."
                bgClass="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
            />
            <FeatureCard 
                icon={<CreditCard size={18} strokeWidth={2.5} />} 
                title="Mis Cuentas" 
                desc="Guarda tus datos de Pago Móvil/Zelle y compártelos."
                bgClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
            />
            <FeatureCard 
                icon={<Calculator size={18} strokeWidth={2.5} />} 
                title="Calculadora Smart" 
                desc="Conversiones instantáneas entre todas las monedas."
                bgClass="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
            />
            <FeatureCard 
                icon={<BellRing size={18} strokeWidth={2.5} />} 
                title="Alertas Push" 
                desc="Notificaciones automáticas cuando cambia la tasa."
                bgClass="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
            />
        </div>
      </div>

      {/* FUENTE DE DATOS */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400">
            <Server size={20} strokeWidth={2} />
        </div>
        <div>
            <h4 className="font-bold text-slate-800 dark:text-white text-sm">Transparencia de Datos</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                Datos obtenidos vía API pública del BCV y promedios ponderados de Binance P2P.
            </p>
        </div>
      </div>

      {/* DOCUMENTOS LEGALES (Botones) */}
      <div className="space-y-3">
        <LegalButton icon={<FileText size={18}/>} title="Términos y Condiciones" onClick={() => setLegalView('terms')} />
        <LegalButton icon={<Shield size={18}/>} title="Política de Privacidad" onClick={() => setLegalView('privacy')} />
      </div>

      {/* FOOTER & LOGS */}
      <div className="pt-4 flex flex-col items-center gap-4">
          <div className="text-center opacity-40">
            <p className="text-xs font-bold text-slate-900 dark:text-white">© 2025 TasasAlDía</p>
          </div>
          
          <button 
            onClick={() => setShowLogs(!showLogs)} 
            className="flex items-center gap-2 text-[10px] text-slate-400 hover:text-brand-dark dark:hover:text-brand transition-colors bg-slate-100 dark:bg-slate-800/50 px-4 py-2 rounded-full font-mono"
          >
            <Terminal size={12} />
            {showLogs ? 'OCULTAR REGISTROS' : 'DEPURACIÓN DEL SISTEMA'}
          </button>
      </div>

      {/* CONSOLA DE LOGS (Estilo Terminal) */}
      {showLogs && (
        <div className="bg-[#0f172a] dark:bg-black rounded-xl p-4 font-mono text-[10px] border border-slate-800 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-2">
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-bold tracking-widest text-[9px]">CONSOLE</span>
                    <button onClick={handleCopyLogs} className="text-slate-500 hover:text-white transition-colors"><Copy size={12}/></button>
                </div>
            </div>
            <div className="h-32 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700 pr-2">
                {logs.length === 0 ? <span className="text-slate-600 italic">> Esperando actividad...</span> : logs.map((log, i) => (
                    <div key={i} className="flex gap-2 text-slate-300">
                        <span className="text-slate-600 shrink-0 select-none">[{log.time}]</span>
                        <span className={log.type === 'error' ? 'text-rose-400' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-300'}>
                            {log.msg}
                        </span>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTES UI ---

function FeatureCard({ icon, title, desc, bgClass }) {
    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300">
            <div className={`w-fit p-2.5 rounded-xl mb-3 ${bgClass}`}>
                {icon}
            </div>
            <h4 className="font-bold text-slate-800 dark:text-white text-xs mb-1 uppercase tracking-wide">{title}</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{desc}</p>
        </div>
    );
}

function LegalButton({ icon, title, onClick }) {
    return (
        <button onClick={onClick} className="w-full flex justify-between items-center p-4 bg-white dark:bg-slate-900 rounded-[1.2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.99] transition-all group">
            <div className="flex items-center gap-4">
                <div className="text-slate-400 group-hover:text-brand-dark dark:group-hover:text-brand transition-colors">{icon}</div>
                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{title}</span>
            </div>
            <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-dark dark:group-hover:text-brand transition-colors" />
        </button>
    );
}

function LegalDocLayout({ title, onBack, children }) {
    return (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
                <button onClick={onBack} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">{title}</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6 pb-32">
                <div className="prose prose-sm dark:prose-invert prose-slate max-w-none text-slate-600 dark:text-slate-300">
                    {children}
                </div>
            </div>
        </div>
    );
}