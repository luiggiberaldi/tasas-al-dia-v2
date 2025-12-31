import React, { useState, useRef, useEffect } from 'react';
import { ArrowRightLeft, Check, Copy, Camera, ToggleLeft, ToggleRight, Smartphone, Building2, Bitcoin, Wallet, ArrowLeft, DollarSign, Mic, MicOff, HelpCircle, X, Sparkles, MessageSquare } from 'lucide-react';
import html2canvas from 'html2canvas';

import { useCalculator } from '../hooks/useCalculator'; 
import { formatBs, formatUsd } from '../utils/calculatorUtils'; 
import { Modal } from '../components/Modal';
// ✅ IMPORTANTE: Componente visual corregido
import CalculatorInput from '../components/CalculatorInput';
// ✅ IMPORTANTE: Cerebro de IA
import { interpretVoiceCommandAI, generateSmartMessage } from '../utils/groqClient';

// --- 🛡️ SALVAVIDAS ---
const SAFE_RATES = {
  usdt: { price: 0 },
  bcv: { price: 0 },
  euro: { price: 0 }
};

export default function CalculatorView({ rates, theme }) {
  const calc = useCalculator(rates || SAFE_RATES);
  const [accounts, setAccounts] = useState([]);
  
  // UI States
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [includeRef, setIncludeRef] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false); // Estado de "Pensando"
  
  const captureRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('my_accounts_v2')) || [];
      setAccounts(saved);
    } catch (e) { console.error("Error cargando cuentas", e); }
  }, []);

  // ✅ VISUAL: Mapeamos etiquetas a "USD"
  const modifiedCurrencies = calc.currencies.map(c => ({
    ...c,
    label: (c.label === '$ BCV' || c.id === 'USD' || c.id === 'BCV' || c.label === 'Dolar') ? 'USD' : c.label
  }));

  // --- 🧠 CEREBRO DE VOZ IA ---
  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Tu navegador no soporta voz. Usa Google Chrome.");
        return;
    }
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'es-VE'; 
    recognition.continuous = false;
    
    setIsListening(true);
    recognition.start();

    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        setIsProcessingAI(true);

        // Intentamos usar la IA primero
        const aiResult = await interpretVoiceCommandAI(transcript);
        
        if (aiResult && aiResult.amount) {
            if (aiResult.currency) calc.setFrom(aiResult.currency);
            calc.handleAmountChange(aiResult.amount.toString(), 'top');
        } else {
            // Fallback: Lógica simple si la IA falla o tarda
            const cleanText = transcript.replace(/,/g, '.').replace(/(\d)\s+(\d)/g, '$1$2');
            const numberMatch = cleanText.match(/(\d+[.]?\d*)/);
            if(numberMatch) calc.handleAmountChange(numberMatch[0], 'top');
        }
        
        setIsProcessingAI(false);
    };

    recognition.onerror = () => { setIsListening(false); setIsProcessingAI(false); };
    recognition.onend = () => setIsListening(false);
  };

  // --- HANDLERS ---
  const handleCopy = () => {
    if (!calc.amountBot && !calc.amountTop) return;
    const date = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' });
    const cFrom = modifiedCurrencies.find(c => c.id === calc.from);
    const cTo = modifiedCurrencies.find(c => c.id === calc.to);
    const text = `💰 Cambio del día (${date})\n${calc.amountTop} ${cFrom.label} -> ${calc.amountBot} ${cTo.label}`;
    navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = (msg) => {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
      setIsModalOpen(false); setSelectedAccount(null);
  };

  const handleShareImage = async () => {
    if (captureRef.current) {
        try {
            const canvas = await html2canvas(captureRef.current, { backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', scale: 2, logging: false, useCORS: true });
            const link = document.createElement('a'); link.href = canvas.toDataURL("image/png"); link.download = `Calculo.png`; link.click();
        } catch (e) { console.error(e); }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20">
      
      {/* Header */}
      <div className="px-1 flex justify-between items-end">
          <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  Calculadora 
                  <span className="text-[10px] bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">AI</span>
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium font-mono">1 USDT = {new Intl.NumberFormat('es-VE').format((rates || SAFE_RATES).usdt.price)} Bs</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowVoiceHelp(true)} className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-brand-dark transition-all active:scale-95"><HelpCircle size={20} /></button>
            <button onClick={handleVoiceInput} className={`p-3 rounded-2xl transition-all shadow-lg active:scale-95 ${isListening ? 'bg-red-500 text-white animate-pulse' : isProcessingAI ? 'bg-purple-500 text-white animate-pulse' : 'bg-white dark:bg-slate-800 text-brand-dark dark:text-brand'}`}>
                {isListening ? <MicOff size={20} /> : isProcessingAI ? <Sparkles size={20} className="animate-spin" /> : <Mic size={20} />}
            </button>
          </div>
      </div>
      
      {/* Tarjeta Principal */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
          <div ref={captureRef} className="bg-white dark:bg-slate-900 p-2 rounded-xl"> 
              <CalculatorInput 
                label="Tengo" amount={calc.amountTop} currency={calc.from} currencies={modifiedCurrencies} 
                onAmountChange={(v) => calc.handleAmountChange(v, 'top')} onCurrencyChange={calc.setFrom} onClear={calc.clear}
              />
              <div className="flex justify-center -my-3 relative z-20">
                  <button onClick={calc.handleSwap} className="bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-900 p-2 rounded-full shadow-lg text-brand hover:text-brand-dark dark:text-brand dark:hover:text-white transition-all active:scale-90 active:rotate-180 duration-300">
                      <ArrowRightLeft size={20} strokeWidth={3} />
                  </button>
              </div>
              <CalculatorInput 
                label="Recibo / Equivalente" amount={calc.amountBot} currency={calc.to} currencies={modifiedCurrencies} 
                onAmountChange={(v) => calc.handleAmountChange(v, 'bot')} onCurrencyChange={calc.setTo} onClear={calc.clear}
              >
                  {getVisualEquivalent(calc) && (
                      <div className="flex justify-end animate-in fade-in slide-in-from-top-1 px-1 mt-1">
                          <div className="flex items-center gap-2 px-2 py-1 rounded-lg opacity-60">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Son:</span>
                              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{getVisualEquivalent(calc)} <span className="text-[10px]">Bs</span></span>
                          </div>
                      </div>
                  )}
              </CalculatorInput>

              <div className="flex gap-2 mt-6 justify-center flex-wrap">
                  {[5, 10, 20, 50, 100].map(val => (
                      <button key={val} onClick={() => calc.handleQuickAdd(val)} className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl text-sm font-bold font-mono hover:bg-brand hover:text-slate-900 border border-slate-200 dark:border-slate-700">+{val}</button>
                  ))}
              </div>
          </div>

          <div className="mt-6 flex gap-3 justify-center">
              <button onClick={handleCopy} className="flex-none flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-5 py-3.5 rounded-2xl text-xs font-bold transition-all active:scale-95">
                  {copied ? <Check size={20} className="text-emerald-500"/> : <Copy size={20}/>}
              </button>
              <button onClick={() => { setSelectedAccount(null); setIsModalOpen(true); }} disabled={!calc.amountTop} className="flex-1 flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-slate-900 px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50">
                  <MessageSquare size={20} /> COBRAR
              </button>
              <button onClick={handleShareImage} className="flex-none flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-5 py-3.5 rounded-2xl text-xs font-bold transition-all active:scale-95">
                  <Camera size={20}/>
              </button>
          </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedAccount ? "Confirmar Envío" : "Selecciona Método"}>
         {!selectedAccount ? (
             <AccountSelector accounts={accounts} onSelect={(acc) => { setSelectedAccount(acc); setIncludeRef(true); }} />
         ) : (
             <PaymentSummary 
                selectedAccount={selectedAccount} 
                includeRef={includeRef} 
                onToggleRef={() => setIncludeRef(!includeRef)} 
                onBack={() => setSelectedAccount(null)} 
                onConfirm={handleShareWhatsApp} 
                rates={rates || SAFE_RATES} 
                calc={calc} 
             />
         )}
      </Modal>

      {showVoiceHelp && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowVoiceHelp(false)} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4"><h3 className="font-black dark:text-white text-lg">IA de Voz</h3><button onClick={() => setShowVoiceHelp(false)}><X size={16}/></button></div>
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Habla natural. La IA entiende matemáticas y jerga.</p>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl border border-purple-100 dark:border-purple-800">
                        <ul className="text-sm space-y-2 text-purple-700 dark:text-purple-300 font-medium">
                            <li>✨ "Cien menos veinte dólares" (80)</li>
                            <li>✨ "La mitad de 500 bolos" (250)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTES ---

function AccountSelector({ accounts, onSelect }) {
    const getIcon = (t) => { if(t === 'pago_movil') return <Smartphone size={18} className="text-emerald-500"/>; if(t === 'binance') return <Bitcoin size={18} className="text-amber-500"/>; if(t === 'zelle') return <DollarSign size={18} className="text-purple-500"/>; return <Building2 size={18} className="text-blue-500"/>; };
    const getBg = (t) => { if(t === 'pago_movil') return 'bg-emerald-100'; if(t === 'binance') return 'bg-amber-100'; if(t === 'zelle') return 'bg-purple-100'; return 'bg-blue-100'; };
    if (accounts.length === 0) return (<div className="text-center py-6 text-slate-400"><Wallet size={48} className="mx-auto mb-2 opacity-50"/><p>No tienes cuentas guardadas.</p></div>);
    return (<div className="grid gap-3">{accounts.map(acc => (<button key={acc.id_gen} onClick={() => onSelect(acc)} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-brand dark:hover:border-brand hover:bg-brand/5 transition-all text-left group"><div className={`p-3 rounded-2xl shrink-0 ${getBg(acc.type)}`}>{getIcon(acc.type)}</div><div><h4 className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-brand-dark dark:group-hover:text-brand transition-colors">{acc.alias}</h4><p className="text-xs text-slate-500 font-mono mt-0.5 capitalize">{acc.type.replace('_', ' ')}</p></div></button>))}</div>);
}

// ✅ PAYMENT SUMMARY: FUSIÓN DE LÓGICA DE PAGO + IA DE MENSAJES
function PaymentSummary({ selectedAccount, includeRef, onToggleRef, onBack, onConfirm, rates, calc }) {
    const [zelleRate, setZelleRate] = useState('bcv');
    const [tone, setTone] = useState('standard'); // 'standard' (lógica dura) | 'formal' | 'amigable' | 'cobrador'
    const [isGenerating, setIsGenerating] = useState(false);
    
    const acc = selectedAccount;
    const valTop = calc.safeParse(calc.amountTop);
    const valBot = calc.safeParse(calc.amountBot);
    let amountBs = 0; let amountUsd = 0;
    const safeRates = rates || SAFE_RATES;
    
    // Cálculo seguro
    if (calc.from === 'VES') { amountBs = valTop; amountUsd = valBot; } 
    else if (calc.to === 'VES') { amountBs = valBot; amountUsd = valTop; } 
    else { amountUsd = (calc.from === 'USD' || calc.from === 'USDT') ? valTop : valBot; amountBs = amountUsd * safeRates.bcv.price; }

    // Generador de Mensaje Estándar (Lógica Rigurosa que pediste)
    const generateStandardMsg = () => {
        let msg = "";
        // Datos de cuenta
        if (acc.type === 'pago_movil') msg += `*Datos Pago Móvil*\nBanco: ${acc.bank}\nTel: ${acc.phone}\nCI: ${acc.id}\nTitular: ${acc.holder || acc.alias}`;
        else if (acc.type === 'transferencia') msg += `*Datos Transferencia*\nBanco: ${acc.bank}\nCuenta: ${acc.accountNumber}\nCI/RIF: ${acc.id}\nTitular: ${acc.holder}`;
        else if (acc.type === 'zelle') msg += `*Datos Zelle*\nEmail: ${acc.email}\nTitular: ${acc.holder}`;
        else if (acc.type === 'binance') msg += `*Binance Pay*\nID/Email: ${acc.email}\nAlias: ${acc.holder || acc.alias}`;

        // Lógica de Montos y Referencias
        if (acc.type === 'pago_movil' || acc.type === 'transferencia') {
            msg += `\n\n*Monto: ${formatBs(amountBs)} Bs*`;
            if (includeRef && safeRates.bcv.price > 0) {
                const refUsd = amountBs / safeRates.bcv.price;
                msg += `\n(Ref: $${formatUsd(refUsd)} @ BCV)`;
            }
        } else if (acc.type === 'binance') {
            msg += `\n\n*Monto: ${formatUsd(amountUsd)} USDT*`;
            if (includeRef && safeRates.usdt.price > 0) {
                const refBs = amountUsd * safeRates.usdt.price;
                msg += `\n(Ref: ${formatBs(refBs)} Bs @ Tasa USDT)`;
            }
        } else if (acc.type === 'zelle') {
            msg += `\n\n*Monto: $${formatUsd(amountUsd)}*`;
            if (includeRef) {
                // Selector de tasa para referencia Zelle
                const usedRate = zelleRate === 'bcv' ? safeRates.bcv.price : safeRates.usdt.price;
                if(usedRate > 0) {
                    const refBs = amountUsd * usedRate;
                    msg += `\n(Ref: ${formatBs(refBs)} Bs @ Tasa ${zelleRate.toUpperCase()})`;
                }
            }
        }
        return msg + `\n\n*Por favor enviar capture del comprobante.*`;
    };

    // Handler de Envío
    const handleSend = async () => {
        if (tone === 'standard') {
            onConfirm(generateStandardMsg());
            return;
        }

        setIsGenerating(true);
        // Preparamos datos para la IA
        const amountsData = {
            top: calc.amountTop, from: calc.from,
            bot: calc.amountBot, to: calc.to,
            rate: zelleRate === 'bcv' ? rates.bcv.price : rates.usdt.price
        };

        const aiMsg = await generateSmartMessage(selectedAccount, amountsData, tone);
        setIsGenerating(false);
        onConfirm(aiMsg || generateStandardMsg()); // Si la IA falla, usa el estándar
    };

    const getIcon = (t) => { if(t === 'pago_movil') return <Smartphone size={18} className="text-emerald-500"/>; if(t === 'binance') return <Bitcoin size={18} className="text-amber-500"/>; if(t === 'zelle') return <DollarSign size={18} className="text-purple-500"/>; return <Building2 size={18} className="text-blue-500"/>; };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            
            {/* Toggle Zelle (Solo si es Zelle) */}
            {acc.type === 'zelle' && (
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-2">
                    <button onClick={() => setZelleRate('bcv')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${zelleRate === 'bcv' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400'}`}>Tasa BCV</button>
                    <button onClick={() => setZelleRate('usdt')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${zelleRate === 'usdt' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400'}`}>Tasa USDT</button>
                </div>
            )}

            {/* Selector de Tono IA */}
            <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Tono del Mensaje</span>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {['standard', 'formal', 'amigable', 'cobrador'].map(t => (
                        <button 
                            key={t}
                            onClick={() => setTone(t)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border shrink-0 ${tone === t ? 'bg-brand text-slate-900 border-brand' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                        >
                            {t === 'standard' ? 'Estándar' : t}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Toggle de Referencia (Solo si es Estándar, la IA decide lo demás) */}
            {tone === 'standard' && (
                <div className="bg-slate-100 dark:bg-slate-800 rounded-3xl p-4 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1 leading-tight max-w-[70%]">
                        {includeRef ? "Incluir referencia de tasa" : "Solo enviar datos de cuenta"}
                    </span>
                    <button onClick={onToggleRef} className={`transition-colors duration-200 ${includeRef ? 'text-emerald-500' : 'text-slate-300'}`}>
                        {includeRef ? <ToggleRight size={36} strokeWidth={2} /> : <ToggleLeft size={36} strokeWidth={2} />}
                    </button>
                </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 opacity-75">
                <div className="flex items-center gap-3 mb-2">{getIcon(acc.type)}<span className="font-bold text-sm text-slate-700 dark:text-slate-300">{acc.alias}</span></div>
                <div className="text-[10px] text-slate-400 font-mono break-all">{acc.type === 'pago_movil' ? `${acc.bank} • ${acc.phone}` : acc.type === 'transferencia' ? `${acc.bank} • ${acc.accountNumber.slice(-4)}` : acc.email}</div>
            </div>

            <div className="flex gap-3">
                <button onClick={onBack} className="flex-none p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"><ArrowLeft size={20} /></button>
                <button 
                    onClick={handleSend} 
                    disabled={isGenerating}
                    className="flex-1 bg-brand hover:bg-brand-dark text-slate-900 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-brand/20 transition-all active:scale-95 py-4 flex items-center justify-center gap-2"
                >
                    {isGenerating ? <Sparkles size={20} className="animate-spin" /> : <MessageSquare size={20} />} 
                    {isGenerating ? 'REDACTANDO...' : 'ENVIAR AL CLIENTE'}
                </button>
            </div>
        </div>
    );
}

const getVisualEquivalent = (calc) => { if (!calc.amountBot || calc.to === 'VES') return null; const rateTo = calc.currencies.find(c => c.id === calc.to)?.rate || 0; return formatBs(calc.safeParse(calc.amountBot) * rateTo); };