import React from 'react';
import { Bot, Calculator as CalculatorIcon, Volume2, VolumeX, Trash2, Crown } from 'lucide-react'; // [UPDATED]
import { useSecurity } from '../../hooks/useSecurity';

export const CalculatorHeader = ({ viewMode, setViewMode, voiceEnabled, setVoiceEnabled, onClearChat, triggerHaptic }) => {
    const { isPremium } = useSecurity();

    return (
        <div className="flex-shrink-0 px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 shadow-sm z-30 relative">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-2xl shadow-lg transition-colors duration-500 ${viewMode === 'chat' ? 'bg-brand text-slate-900' : 'bg-slate-200 text-slate-500'}`}>
                        {viewMode === 'chat' ? <Bot size={24} strokeWidth={2.5} /> : <CalculatorIcon size={24} strokeWidth={2.5} />}
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 dark:text-white text-lg leading-none tracking-tight flex items-center flex-wrap gap-2">
                            {viewMode === 'chat' ? 'Mister Cambio' : 'Calculadora'}
                            {viewMode === 'chat' && isPremium && (
                                <span className="inline-flex shrink-0 items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-lg shadow-sm shadow-orange-200 dark:shadow-none uppercase">
                                    <Crown size={10} strokeWidth={3} /> VIP
                                </span>
                            )}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                                {isPremium ? 'IA 4.0 TURBO' : 'Online • IA 3.5'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {/* Controles extra para modo Chat */}
                    {viewMode === 'chat' && (
                        <div className="flex gap-1 shrink-0">
                            <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`p-2.5 rounded-xl transition-all ${voiceEnabled ? 'text-brand-dark bg-brand/10' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}>
                                {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                            </button>
                            <button
                                onClick={() => { triggerHaptic && triggerHaptic(); onClearChat(); }}
                                className="p-2.5 text-slate-400 hover:text-rose-500 bg-slate-50 dark:bg-slate-800 rounded-xl"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Switcher */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl relative flex shadow-inner">
                <div className={`absolute top-1 bottom-1 w-[48%] bg-white dark:bg-slate-700 rounded-xl shadow-sm transition-all duration-300 ease-out ${viewMode === 'manual' ? 'left-1' : 'left-[51%]'}`} />
                <button onClick={() => setViewMode('manual')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold relative z-10 transition-colors flex justify-center gap-2 ${viewMode === 'manual' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                    <CalculatorIcon size={16} /> Clásica
                </button>
                <button onClick={() => setViewMode('chat')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold relative z-10 transition-colors flex justify-center gap-2 ${viewMode === 'chat' ? 'text-brand-dark dark:text-brand' : 'text-slate-400'}`}>
                    <Bot size={16} /> Asistente
                </button>
            </div>
        </div>
    );
};