import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LogViewer } from '../components/UI';

export default function InfoView({ logs }) {
  return (
    <div className="space-y-6 pb-32 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="px-1">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white transition-colors">Información</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Estado y Logs del sistema</p>
      </div>
      <LogViewer logs={logs} />
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-6 transition-colors">
        <div className="flex items-start gap-4">
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-2xl text-orange-500 shrink-0"><AlertTriangle size={24}/></div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Aviso Importante</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed text-justify">
              Los datos son referenciales (BCV, Mercados P2P). No somos una entidad financiera.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl text-slate-500 dark:text-slate-400 shrink-0"><CheckCircle2 size={24}/></div>
            <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">Estado</h3>
                <div className="flex flex-col gap-1 mt-1">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> API: Conectada
                    </span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}