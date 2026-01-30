import React from 'react';
import { ChevronLeft, ShieldAlert } from 'lucide-react';

export const TesterView = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 flex flex-col items-center justify-center text-center">
            <ShieldAlert size={64} className="text-slate-300 mb-6" />
            <h1 className="text-2xl font-bold dark:text-white mb-2">Tester Deshabilitado</h1>
            <p className="text-slate-500 mb-8">El módulo de auditoría de IA ha sido removido del sistema.</p>

            <button
                onClick={onBack}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all active:scale-95"
            >
                <ChevronLeft size={20} />
                <span>Volver</span>
            </button>
        </div>
    );
};
