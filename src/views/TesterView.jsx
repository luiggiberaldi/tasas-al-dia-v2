import React, { useState, useEffect } from 'react';
import { runAudit } from '../utils/golden_tester';
import { Play, ClipboardList, ShieldAlert, ChevronLeft } from 'lucide-react';

export const TesterView = ({ onBack, rates }) => {
    const [logs, setLogs] = useState([]);
    const [isTesting, setIsTesting] = useState(false);

    const addLog = (msg) => {
        setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg }]);
    };

    const handleStartTest = async () => {
        setLogs([]);
        setIsTesting(true);
        await runAudit(rates, addLog);
        setIsTesting(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                    <ChevronLeft className="dark:text-white" />
                </button>
                <div className="text-center">
                    <h1 className="text-xl font-bold dark:text-white flex items-center gap-2 justify-center">
                        <ShieldAlert className="text-indigo-500" />
                        Golden Tester PDA v3.0
                    </h1>
                    <p className="text-xs text-slate-500 uppercase tracking-widest">Inteligencia Anti-Trampas</p>
                </div>
                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Actions */}
            <div className="flex justify-center mb-6">
                <button
                    onClick={handleStartTest}
                    disabled={isTesting}
                    className={`
                        flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white shadow-lg transition-all
                        ${isTesting
                            ? 'bg-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}
                    `}
                >
                    <Play size={18} fill="currentColor" />
                    {isTesting ? 'Ejecutando Auditoría...' : 'Iniciar Prueba Estándar'}
                </button>
            </div>

            {/* Log Area */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl h-[450px] overflow-y-auto font-mono text-sm">
                <div className="flex items-center gap-2 text-indigo-400 mb-4 border-b border-slate-800 pb-2">
                    <ClipboardList size={16} />
                    <span>DIAGNOSTIC_LOG_STREAM</span>
                </div>
                {logs.length === 0 && !isTesting && (
                    <div className="text-slate-600 italic text-center mt-20">
                        Esperando inicio de auditoría...
                    </div>
                )}
                {logs.map((log, i) => {
                    const isError = log.msg.includes('❌') || log.msg.includes('FAIL') || log.msg.includes('ERROR');
                    const isSuccess = log.msg.includes('✅') || log.msg.includes('PASSED');

                    return (
                        <div key={i} className="mb-1 leading-relaxed border-l-2 border-slate-800 pl-3">
                            <span className="text-slate-500 mr-2 text-[10px] uppercase">[{log.time}]</span>
                            <span className={`
                                ${isError ? 'text-rose-400 font-bold' : ''}
                                ${isSuccess ? 'text-emerald-400' : ''}
                                ${!isError && !isSuccess ? 'text-slate-300' : ''}
                            `}>
                                {log.msg}
                            </span>
                        </div>
                    );
                })}
                {isTesting && (
                    <div className="text-indigo-400 animate-pulse mt-2 ml-3">
                        ▋ Procesando siguiente caso...
                    </div>
                )}
            </div>

            <div className="mt-6 text-center text-[10px] text-slate-500 uppercase tracking-widest ">
                Solo para uso de Auditoría Interna / L.B. Labs
            </div>
        </div>
    );
};
