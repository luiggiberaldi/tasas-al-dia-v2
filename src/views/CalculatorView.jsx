import React, { useState, useEffect, useRef } from 'react';
import { ArrowRightLeft, Check, Copy, Camera, ToggleLeft, ToggleRight, Smartphone, Building2, Bitcoin, Wallet, ArrowLeft } from 'lucide-react';
import html2canvas from 'html2canvas';

// Hooks y Componentes
import { useWallet } from '../hooks/useWallet'; 
import { Modal } from '../components/Modal';   
import { CalculatorInput } from '../components/CalculatorInput'; 

export default function CalculatorView({ rates, theme }) {
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const captureRef = useRef(null);
  const { accounts } = useWallet(); 
  
  // --- ESTADOS COBRO ---
  const [selectedAccount, setSelectedAccount] = useState(null); 
  const [includeRef, setIncludeRef] = useState(true);
  
  // --- ESTADOS CALCULADORA ---
  const [amountTop, setAmountTop] = useState('');
  const [amountBot, setAmountBot] = useState('');
  const [from, setFrom] = useState('USDT');
  const [to, setTo] = useState('VES');
  const [lastEdited, setLastEdited] = useState('top');

  const currencies = [
    { id: 'VES', label: 'Bs.', icon: '🇻🇪', rate: 1 },
    { id: 'USDT', label: 'USDT', icon: '💵', rate: rates.usdt.price },
    { id: 'BCV', label: '$ BCV', icon: '🏛️', rate: rates.bcv.price },
    { id: 'EUR', label: 'Euro', icon: '💶', rate: rates.euro.price },
  ];

  // --- HELPERS FORMATO ---
  const formatBs = (val) => new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 }).format(Math.ceil(val));
  const formatUsd = (val) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  const safeParse = (val) => (!val || val === '.') ? 0 : parseFloat(val.replace(/,/g, '.'));

  // --- LÓGICA MATEMÁTICA ---
  useEffect(() => {
    const rateFrom = currencies.find(c => c.id === from)?.rate || 0;
    const rateTo = currencies.find(c => c.id === to)?.rate || 0;
    if (rateTo === 0 || rateFrom === 0) return;

    if (lastEdited === 'top') {
        if (!amountTop) { setAmountBot(''); return; }
        const res = (safeParse(amountTop) * rateFrom) / rateTo;
        setAmountBot(res.toFixed(2));
    } else {
        if (!amountBot) { setAmountTop(''); return; }
        const res = (safeParse(amountBot) * rateTo) / rateFrom;
        setAmountTop(res.toFixed(2));
    }
  }, [amountTop, amountBot, from, to, rates, lastEdited]);

  // --- HANDLERS CALCULADORA ---
  const handleAmountChange = (val, setSelf, source) => {
    if (/^\d*\.?\d{0,2}$/.test(val.replace(/,/g, '.'))) { setSelf(val); setLastEdited(source); }
  };
  const handleCurrencyChange = (val, setCurrency) => { setCurrency(val); setLastEdited('top'); };
  const handleSwap = () => { setFrom(to); setTo(from); setAmountTop(amountBot); setLastEdited('top'); };
  const handleQuickAdd = (val) => {
      const current = safeParse(amountTop); setAmountTop((current + val).toFixed(0)); setLastEdited('top');
  };

  // --- HELPERS VISUALES ---
  const getVisualEquivalent = () => {
      if (!amountBot || to === 'VES') return null;
      const rateTo = currencies.find(c => c.id === to)?.rate || 0;
      return formatBs(safeParse(amountBot) * rateTo); 
  };

  const copyToClipboard = () => {
    if (!amountBot && !amountTop) return;
    const date = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' });
    const cFrom = currencies.find(c => c.id === from);
    const cTo = currencies.find(c => c.id === to);
    const fmtTop = cFrom.id === 'VES' ? formatBs(safeParse(amountTop)) : formatUsd(safeParse(amountTop));
    const fmtBot = cTo.id === 'VES' ? formatBs(safeParse(amountBot)) : formatUsd(safeParse(amountBot));
    const eq = getVisualEquivalent();
    const extra = eq ? `\n(≈ ${eq} Bs)` : '';
    const text = `💰 *Cambio al día (${date})*\n\n${cFrom.icon} ${fmtTop} ${cFrom.label}\n⬇️\n${cTo.icon} *${fmtBot} ${cTo.label}*${extra}`;
    navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // --- LÓGICA DE COBRO ---
  const handleAccountSelect = (acc) => {
      setSelectedAccount(acc);
      setIncludeRef(true); 
  };

  const executeShare = () => {
    if (!selectedAccount) return;

    const valTop = safeParse(amountTop);
    const valBot = safeParse(amountBot);
    const rateTo = currencies.find(c => c.id === to)?.rate;
    const rateFrom = currencies.find(c => c.id === from)?.rate;
    
    // Regla: Si es cuenta en Bs -> Usa BCV. Si es Binance -> Usa Monitor.
    const isBsAccount = selectedAccount.currency === 'VES';
    const automaticRefRate = isBsAccount ? rates.bcv.price : rates.usdt.price;

    let totalBsRaw = 0;
    if (to === 'VES') totalBsRaw = valBot;
    else if (from === 'VES') totalBsRaw = valTop;
    else totalBsRaw = (lastEdited === 'top' ? valTop * rateFrom : valBot * rateTo);

    const totalUsdRaw = totalBsRaw / automaticRefRate;

    let header = '';
    const strBs = formatBs(totalBsRaw);
    const strUsd = formatUsd(totalUsdRaw);

    if (isBsAccount) {
        header = `Total: *${strBs} Bs*`;
        if (includeRef) header += ` (Ref: ${strUsd} $)`; 
    } else {
        header = `Total: *${strUsd} USDT*`;
        const refBs = formatBs(totalUsdRaw * automaticRefRate);
        if (includeRef) header += ` (Ref: ${refBs} Bs)`;
    }

    let details = '';
    if (selectedAccount.type === 'pago_movil') {
        details = `🏦 *Pago Móvil*\nBanco: ${selectedAccount.data.bankCode} - ${selectedAccount.data.bankName}\nTel: ${selectedAccount.data.phone}\nCI: ${selectedAccount.data.docId}`;
    } else if (selectedAccount.type === 'transfer') {
        const tipoCuenta = selectedAccount.data.accountType === 'C' ? 'Corriente' : 'Ahorro';
        details = `🏦 *Transferencia Bancaria*\nBanco: ${selectedAccount.data.bankName}\nCuenta: ${selectedAccount.data.accountNumber}\nTipo: ${tipoCuenta}\nTitular: ${selectedAccount.data.holder}\nCI/RIF: ${selectedAccount.data.docId}`;
    } else if (selectedAccount.type === 'binance') {
        details = `🟡 *Binance Pay*\nEmail: ${selectedAccount.data.email}\nID: ${selectedAccount.data.payId || 'No especificado'}`;
    }

    const msg = `Hola 👋, ${header}\n\nPuedes realizar el pago a:\n${details}\n\n_Generado con TasasAlDía_`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    setIsModalOpen(false);
    setSelectedAccount(null);
  };

  const handleShareImage = async () => { 
    if (captureRef.current) {
        const canvas = await html2canvas(captureRef.current, { backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', scale: 2, logging: false, useCORS: true });
        const link = document.createElement('a'); link.href = canvas.toDataURL("image/png"); link.download = `Calculo.png`; link.click();
    }
  };

  const getIcon = (t) => t === 'pago_movil' ? <Smartphone size={18} className="text-emerald-500"/> : t === 'binance' ? <Bitcoin size={18} className="text-amber-500"/> : <Building2 size={18} className="text-blue-500"/>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Header */}
      <div className="px-1">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white transition-colors tracking-tight">Calculadora</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium font-mono">1 USDT = {new Intl.NumberFormat('es-VE').format(rates.usdt.price)} Bs</p>
      </div>
      
      {/* Tarjeta Principal */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 transition-colors duration-300">
          <div ref={captureRef} className="bg-white dark:bg-slate-900 p-1 rounded-xl"> 
              <CalculatorInput 
                label="Tengo" amount={amountTop} currency={from} currencies={currencies}
                onAmountChange={(e) => handleAmountChange(e.target.value, setAmountTop, 'top')}
                onCurrencyChange={(e) => handleCurrencyChange(e.target.value, setFrom)}
                onClear={() => { setAmountTop(''); setAmountBot(''); }}
              />
              <div className="flex justify-center -my-3 relative z-10">
                  <button onClick={handleSwap} className="bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-900 p-2 rounded-full shadow-lg text-slate-400 hover:text-brand-dark dark:text-slate-400 dark:hover:text-brand transition-all active:scale-90 active:rotate-180 duration-300">
                      <ArrowRightLeft size={16} strokeWidth={3} />
                  </button>
              </div>
              <CalculatorInput 
                label="Recibo / Equivalente" amount={amountBot} currency={to} currencies={currencies}
                onAmountChange={(e) => handleAmountChange(e.target.value, setAmountBot, 'bot')}
                onCurrencyChange={(e) => handleCurrencyChange(e.target.value, setTo)}
                onClear={() => { setAmountBot(''); setAmountTop(''); }}
              >
                  {getVisualEquivalent() && (
                      <div className="flex justify-end animate-in fade-in slide-in-from-top-1 px-1">
                          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Son:</span>
                              <span className="text-sm font-mono font-bold text-slate-600 dark:text-slate-300">
                                  {getVisualEquivalent()} <span className="text-[10px] text-slate-400">Bs</span>
                              </span>
                          </div>
                      </div>
                  )}
              </CalculatorInput>
              <div className="flex gap-2 mt-6 justify-center flex-wrap">
                  {[5, 10, 20, 50, 100].map(val => (
                      <button key={val} onClick={() => handleQuickAdd(val)} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-bold font-mono hover:bg-brand hover:text-slate-900 dark:hover:bg-brand dark:hover:text-slate-900 transition-all active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700">+{val}</button>
                  ))}
              </div>
          </div>

          <div className="mt-6 flex gap-3 justify-center">
              <button onClick={copyToClipboard} className="flex-none flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-5 py-3.5 rounded-2xl text-xs font-bold transition-all active:scale-95 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700">
                  {copied ? <Check size={20}/> : <Copy size={20}/>}
              </button>
              
              {/* BOTÓN COBRAR CON LOGO WHATSAPP */}
              <button 
                onClick={() => { setSelectedAccount(null); setIsModalOpen(true); }} 
                disabled={!amountTop}
                className="flex-1 flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-slate-900 px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-brand/20 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  <WhatsAppIcon size={20} /> COBRAR POR WHATSAPP
              </button>

              <button onClick={handleShareImage} className="flex-none flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-5 py-3.5 rounded-2xl text-xs font-bold transition-all active:scale-95 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700">
                  <Camera size={20}/>
              </button>
          </div>
      </div>

      {/* --- MODAL CONFIRMACIÓN --- */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedAccount ? "Confirmar Envío" : "Selecciona Método"}>
         
         {!selectedAccount ? (
             /* VISTA LISTA DE CUENTAS */
             <div className="grid gap-3">
                 {accounts.length === 0 ? (
                     <div className="text-center py-6 text-slate-400">
                         <Wallet size={48} className="mx-auto mb-2 opacity-50"/>
                         <p>No tienes cuentas guardadas.</p>
                         <p className="text-xs mt-1">Ve a la pestaña "Wallet" para agregar una.</p>
                     </div>
                 ) : (
                     accounts.map(acc => (
                         <button key={acc.id} onClick={() => handleAccountSelect(acc)} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-brand dark:hover:border-brand hover:bg-brand/5 transition-all text-left group">
                            <div className={`p-3 rounded-2xl shrink-0 ${acc.type === 'pago_movil' ? 'bg-emerald-100 text-emerald-600' : acc.type === 'binance' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                {getIcon(acc.type)}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-brand-dark dark:group-hover:text-brand transition-colors">{acc.alias}</h4>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">{acc.type === 'pago_movil' ? acc.data.bankName : acc.type === 'binance' ? 'Binance Pay' : 'Transferencia'}</p>
                            </div>
                         </button>
                     ))
                 )}
             </div>
         ) : (
             /* VISTA CONFIRMACIÓN (TOGGLE CALCULADO) */
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                
                {/* --- TOGGLE CON CÁLCULO AUTOMÁTICO --- */}
                {(() => {
                    const valTop = safeParse(amountTop);
                    const valBot = safeParse(amountBot);
                    const rateTo = currencies.find(c => c.id === to)?.rate;
                    const rateFrom = currencies.find(c => c.id === from)?.rate;
                    
                    const isBsAccount = selectedAccount.currency === 'VES';
                    const automaticRefRate = isBsAccount ? rates.bcv.price : rates.usdt.price;

                    let totalBsRaw = 0;
                    if (to === 'VES') totalBsRaw = valBot;
                    else if (from === 'VES') totalBsRaw = valTop;
                    else totalBsRaw = (lastEdited === 'top' ? valTop * rateFrom : valBot * rateTo);

                    const totalUsdRaw = totalBsRaw / automaticRefRate;

                    let labelText = '';
                    if (isBsAccount) {
                        labelText = `Incluir referencia en Dólares ($${formatUsd(totalUsdRaw)})`;
                    } else {
                        const refBs = totalUsdRaw * automaticRefRate;
                        labelText = `Incluir referencia en Bolívares (${formatBs(refBs)} Bs)`;
                    }

                    return (
                        <div className="bg-slate-100 dark:bg-slate-800 rounded-3xl p-4 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1">
                                {labelText}
                            </span>
                            <button onClick={() => setIncludeRef(!includeRef)} className={`transition-colors duration-200 ${includeRef ? 'text-emerald-500' : 'text-slate-300'}`}>
                                {includeRef ? <ToggleRight size={36} strokeWidth={2} /> : <ToggleLeft size={36} strokeWidth={2} />}
                            </button>
                        </div>
                    );
                })()}

                {/* Resumen de cuenta seleccionada */}
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 opacity-75">
                    <div className="flex items-center gap-3 mb-2">
                        {getIcon(selectedAccount.type)}
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{selectedAccount.alias}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono break-all">
                        {selectedAccount.type === 'binance' ? selectedAccount.data.email : `${selectedAccount.data.bankName} • ${selectedAccount.type === 'pago_movil' ? selectedAccount.data.phone : selectedAccount.data.accountNumber}`}
                    </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3">
                    <button onClick={() => setSelectedAccount(null)} className="flex-none p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    {/* BOTÓN ENVIAR CON LOGO WHATSAPP */}
                    <button onClick={executeShare} className="flex-1 bg-brand hover:bg-brand-dark text-slate-900 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-brand/20 transition-all active:scale-95 py-4 flex items-center justify-center gap-2">
                        <WhatsAppIcon size={20} /> ENVIAR AL CLIENTE
                    </button>
                </div>
             </div>
         )}
      </Modal>
    </div>
  );
}

// --- Componente de Icono WhatsApp Personalizado (Estilo Lucide) ---
function WhatsAppIcon({ size = 24, className }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
    </svg>
  );
}