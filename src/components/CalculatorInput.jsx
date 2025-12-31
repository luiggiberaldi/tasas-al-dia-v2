import React from 'react';
import { X } from 'lucide-react';

export default function CalculatorInput({ label, amount, currency, currencies, onAmountChange, onCurrencyChange, onClear, children }) {
  
  // LÓGICA DE FUENTE AGRESIVA (Escalado rápido para móviles)
  const getFontSize = (val) => {
    const len = val ? val.toString().length : 0;
    
    // Si tiene más de 10 caracteres (ej: 10.000.000,00), letra muy pequeña
    if (len > 10) return 'text-lg'; 
    
    // Si tiene 9 o 10 caracteres, letra pequeña
    if (len > 8) return 'text-xl';
    
    // Si tiene 7 u 8 caracteres (AQUÍ ESTABA EL PROBLEMA), bajamos a 2xl
    if (len > 6) return 'text-2xl';
    
    // Si tiene 6 caracteres, bajamos un punto a 3xl
    if (len === 6) return 'text-3xl';
    
    // De 1 a 5 caracteres, letra grande
    return 'text-4xl';
  };

  // Visualmente mostramos USD
  const displayCurrency = ['BCV', 'USD', '$ BCV', 'Dolar'].includes(currency) ? 'USD' : currency;

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 relative transition-all focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/20">
      
      {/* Etiqueta Superior */}
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
        {label}
      </span>
      
      <div className="flex items-center gap-2 relative">
        
        {/* Selector de Moneda */}
        <div className="relative shrink-0 z-10">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-700 py-2 px-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-600">
                <span className="font-black text-slate-700 dark:text-white text-sm">
                    {displayCurrency}
                </span>
                <span className="text-[8px] text-slate-400">▼</span>
            </div>
            <select 
                value={currency} 
                onChange={(e) => onCurrencyChange(e.target.value)} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
                {currencies.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
        </div>

        {/* Input Numérico con Tracking Tighter (Letras más pegadas) */}
        <div className="flex-1 min-w-0 relative"> 
            <input
                type="text"
                inputMode="decimal"
                value={amount || ''}
                onChange={(e) => onAmountChange(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                className={`w-full bg-transparent text-right font-black text-slate-800 dark:text-white outline-none placeholder-slate-200 dark:placeholder-slate-700 tracking-tighter transition-all ${getFontSize(amount)}`}
            />
        </div>

        {/* Botón Borrar */}
        {amount && (
            <button 
                onClick={onClear} 
                className="shrink-0 p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-full hover:bg-rose-100 hover:text-rose-500 z-10 transition-colors"
                title="Borrar"
            >
                <X size={16} strokeWidth={3}/>
            </button>
        )}
      </div>

      {children}
    </div>
  );
}