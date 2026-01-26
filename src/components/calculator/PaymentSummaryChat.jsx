import React, { useState } from 'react';
import { ArrowLeft, Sparkles, MessageSquare, UserCircle } from 'lucide-react';
import { generateSmartMessage } from '../../utils/aiClient';
import { formatBs, formatUsd } from '../../utils/calculatorUtils';

import { auditor } from '../../utils/SilentAuditor'; // [NEW]

export const PaymentSummaryChat = ({ selectedAccount, chatData, rates, onBack, onConfirm }) => {
    const [tone, setTone] = useState('standard');
    const [clientName, setClientName] = useState(chatData.clientName || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showOptions, setShowOptions] = useState({ ves: true, usd: true, usdt: false, eur: false });
    const acc = selectedAccount;

    // Normalizar base a Bs
    let baseBs = 0;
    if (chatData.originalSource === 'VES') baseBs = chatData.originalAmount;
    else if (chatData.originalSource === 'USDT') baseBs = chatData.originalAmount * rates.usdt.price;
    else if (chatData.originalSource === 'EUR') baseBs = chatData.originalAmount * rates.euro.price;
    else if (chatData.targetCurrency === 'USD' && chatData.originalSource === 'USDT') baseBs = chatData.originalAmount * rates.usdt.price;
    else baseBs = chatData.originalAmount * rates.bcv.price;

    const valVES = baseBs;
    const valUSD = baseBs / rates.bcv.price;
    const valUSDT = baseBs / rates.usdt.price;
    const valEUR = baseBs / rates.euro.price;

    // [AUDITOR] Verify Report Integrity
    auditor.audit({ input: valVES, rate: 1 / rates.bcv.price, output: valUSD, context: 'PaymentChatGen', operation: 'Bs -> USD (BCV)' });
    auditor.audit({ input: valVES, rate: 1 / rates.usdt.price, output: valUSDT, context: 'PaymentChatGen', operation: 'Bs -> USDT' });

    const generateMessageContent = () => {
        let content = "";
        if (showOptions.ves) content += `• ${formatBs(valVES)} Bs\n`;
        if (showOptions.usd) content += `• ${formatUsd(valUSD)} USD (BCV)\n`;
        if (showOptions.usdt) content += `• ${formatUsd(valUSDT)} USDT\n`;
        if (showOptions.eur) content += `• ${formatUsd(valEUR).replace('$', '€')} EUR\n`;
        return content || "Monto pendiente";
    };

    const generateStandardMsg = () => {
        let msg = "";
        if (clientName) msg += `Hola ${clientName}, por aquí te paso los datos de pago:\n\n`; else msg += `Hola, por aquí te paso los datos de pago:\n\n`;
        if (acc.type === 'pago_movil') msg += `*Datos Pago Móvil*\nBanco: ${acc.bank}\nTel: ${acc.phone}\nCI: ${acc.id}\nTitular: ${acc.holder || acc.alias}`;
        else if (acc.type === 'transferencia') msg += `*Datos Transferencia*\nBanco: ${acc.bank}\nCuenta: ${acc.accountNumber}\nCI/RIF: ${acc.id}\nTitular: ${acc.holder}`;
        else if (acc.type === 'zelle') msg += `*Datos Zelle*\nEmail: ${acc.email}\nTitular: ${acc.holder}`;
        else if (acc.type === 'binance') msg += `*Binance Pay*\nID/Email: ${acc.email}\nAlias: ${acc.holder || acc.alias}`;
        msg += `\n\n*Montos a Pagar:*\n${generateMessageContent()}`;
        return msg + `\n*Quedo atento al comprobante. ¡Gracias!*`;
    };

    const handleSend = async () => {
        if (tone === 'standard') { onConfirm(generateStandardMsg()); return; }
        setIsGenerating(true);
        const aiMsg = await generateSmartMessage(selectedAccount, generateMessageContent(), tone, clientName);
        setIsGenerating(false);
        onConfirm(aiMsg || generateStandardMsg());
    };

    const toggleOption = (key) => setShowOptions(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800/30 flex items-center gap-2">
                <UserCircle size={18} className="text-indigo-400" />
                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre Cliente (Opcional)" className="bg-transparent w-full text-sm font-bold text-slate-700 dark:text-white outline-none" />
            </div>
            <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2 block">Incluir en el mensaje</span>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => toggleOption('ves')} className={`p-2 rounded-xl text-xs font-bold border transition-all ${showOptions.ves ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700'}`}>Bolívares</button>
                    <button onClick={() => toggleOption('usd')} className={`p-2 rounded-xl text-xs font-bold border transition-all ${showOptions.usd ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700'}`}>Dólares ($)</button>
                    <button onClick={() => toggleOption('usdt')} className={`p-2 rounded-xl text-xs font-bold border transition-all ${showOptions.usdt ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400' : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700'}`}>USDT</button>
                    <button onClick={() => toggleOption('eur')} className={`p-2 rounded-xl text-xs font-bold border transition-all ${showOptions.eur ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400' : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700'}`}>Euros (€)</button>
                </div>
            </div>
            <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Tono del Mensaje</span>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {['standard', 'formal', 'amigable', 'cobrador'].map(t => (
                        <button key={t} onClick={() => setTone(t)} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize border shrink-0 ${tone === t ? 'bg-brand text-slate-900 border-brand' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}>{t}</button>
                    ))}
                </div>
            </div>
            <div className="flex gap-3">
                <button onClick={onBack} className="flex-none p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"><ArrowLeft size={20} /></button>
                <button onClick={handleSend} disabled={isGenerating} className="flex-1 bg-brand hover:bg-brand-dark text-slate-900 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-brand/20 transition-all active:scale-95 py-4 flex items-center justify-center gap-2">
                    {isGenerating ? <Sparkles size={20} className="animate-spin" /> : <MessageSquare size={20} />} {isGenerating ? 'REDACTANDO...' : 'ENVIAR AL CLIENTE'}
                </button>
            </div>
        </div>
    );
};