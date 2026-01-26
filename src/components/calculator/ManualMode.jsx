import React, { useState, useEffect } from 'react';
import { Check, Copy, MessageSquare, ArrowRightLeft, Clock, History } from 'lucide-react'; // [UPDATED]

// Hooks
import { useCalculator } from '../../hooks/useCalculator';

// Components
import { Modal } from '../../components/Modal';
import CalculatorInput from '../../components/CalculatorInput';
import { AccountSelector } from './AccountSelector';
import { PaymentSummaryChat } from './PaymentSummaryChat';

export const ManualMode = ({ rates, accounts, theme, triggerHaptic }) => {
    const calc = useCalculator(rates);
    const [copied, setCopied] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);

    // [NEW] History State
    const [history, setHistory] = useState([]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('calc_history');
            if (saved) setHistory(JSON.parse(saved));
        } catch (e) {
            console.error(e);
        }
    }, []);

    const addToHistory = () => {
        if (!calc.amountTop || !calc.amountBot) return;

        const newEntry = {
            id: Date.now(),
            from: calc.from,
            to: calc.to,
            in: calc.amountTop,
            out: calc.amountBot,
            ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const newHistory = [newEntry, ...history].slice(0, 5);
        setHistory(newHistory);
        localStorage.setItem('calc_history', JSON.stringify(newHistory));
    };

    const restoreHistory = (item) => {
        triggerHaptic && triggerHaptic();
        calc.setFrom(item.from);
        calc.setTo(item.to);
        calc.handleAmountChange(item.in, 'top');
    };

    const modifiedCurrencies = calc.currencies.map(c => ({
        ...c,
        label: (c.label === '$ BCV' || c.id === 'USD' || c.id === 'BCV') ? 'Dolar' : c.label
    }));

    const handleCopy = () => {
        triggerHaptic && triggerHaptic();
        addToHistory(); // [NEW] Save to history
        if (!calc.amountBot) return;
        const text = `💰 Cambio: ${calc.amountTop} ${calc.from} -> ${calc.amountBot} ${calc.to}`;
        navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000);
    };

    return (
        // CONTENEDOR PRINCIPAL: Usa flex-col para separar scroll de botones fijos
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950/50">

            {/* ÁREA SCROLLABLE (Inputs y Título) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
                <div className="space-y-8 pb-4">

                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Conversión Rápida</h2>
                            <p className="text-sm text-slate-400 font-medium">Calculadora de precisión</p>
                        </div>
                    </div>

                    {/* Inputs Stack */}
                    <div className="relative flex flex-col gap-3">

                        {/* Input TENGO */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm p-1 z-0">
                            <CalculatorInput
                                label="TENGO"
                                amount={calc.amountTop}
                                currency={calc.from}
                                currencies={modifiedCurrencies}
                                onAmountChange={(v) => calc.handleAmountChange(v, 'top')}
                                onCurrencyChange={calc.setFrom}
                                onClear={calc.clear}
                            />
                        </div>

                        {/* Botón Swap (Posicionamiento Absoluto Seguro) */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                            <button
                                onClick={() => { triggerHaptic && triggerHaptic(); calc.handleSwap(); }}
                                className="bg-brand text-slate-900 p-3 rounded-full shadow-xl hover:scale-110 hover:rotate-180 transition-all duration-300 border-[6px] border-slate-50 dark:border-slate-950"
                            >
                                <ArrowRightLeft size={22} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Input RECIBO */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm p-1 z-0">
                            <CalculatorInput
                                label="RECIBO"
                                amount={calc.amountBot}
                                currency={calc.to}
                                currencies={modifiedCurrencies}
                                onAmountChange={(v) => calc.handleAmountChange(v, 'bot')}
                                onCurrencyChange={calc.setTo}
                                onClear={calc.clear}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ÁREA FIJA INFERIOR (Botones de Acción + Historial) */}
            {/* flex-shrink-0 asegura que NUNCA se aplasten */}
            <div className="p-4 sm:p-5 pt-2 flex-shrink-0 z-20 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-slate-950 dark:via-slate-950">

                {/* [NEW] History Bar */}
                {history.length > 0 && (
                    <div className="mb-3 overflow-x-auto pb-1 scrollbar-hide flex gap-2">
                        {history.map(item => (
                            <button
                                key={item.id}
                                onClick={() => restoreHistory(item)}
                                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm active:scale-95 transition-transform"
                            >
                                <History size={10} className="text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                    {item.in} {item.from} <span className="text-slate-300 mx-0.5">→</span> {item.out} {item.to}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex gap-3">

                    {/* Botón Copiar */}
                    <button
                        onClick={handleCopy}
                        className="flex-shrink-0 w-24 h-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95 flex flex-col items-center justify-center gap-1 shadow-sm"
                    >
                        {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
                        <span className="text-[9px] font-bold uppercase tracking-widest">Copiar</span>
                    </button>

                    {/* Botón COBRAR (Principal) */}
                    <button
                        onClick={() => {
                            triggerHaptic && triggerHaptic();
                            addToHistory(); // [NEW] Save to history
                            setSelectedAccount(null);
                            setIsModalOpen(true);
                        }}
                        disabled={!calc.amountTop}
                        className="flex-1 h-20 bg-brand text-slate-900 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-brand/20 hover:shadow-brand/40 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-2"
                    >
                        <MessageSquare size={22} strokeWidth={2.5} />
                        <span>Cobrar</span>
                    </button>
                </div>
            </div>

            {/* MODAL */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Seleccionar Cuenta">
                {!selectedAccount ? <AccountSelector accounts={accounts} onSelect={(acc) => setSelectedAccount(acc)} /> :
                    <PaymentSummaryChat
                        selectedAccount={selectedAccount}
                        chatData={{
                            originalAmount: parseFloat(calc.amountTop || 0),
                            originalSource: calc.from,
                            resultAmount: parseFloat(calc.amountBot || 0),
                            targetCurrency: calc.to
                        }}
                        rates={rates}
                        onBack={() => setSelectedAccount(null)}
                        onConfirm={(msg) => { window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank'); setIsModalOpen(false); }}
                    />}
            </Modal>
        </div>
    );
};