import React from 'react';
import { ChevronDown, X } from 'lucide-react';

export const CalculatorInput = ({ 
  label,           // "Tengo" o "Recibo"
  amount,          // El valor numérico
  currency,        // Moneda seleccionada (ID)
  currencies,      // Lista de monedas disponibles
  onAmountChange,  // Función al escribir número
  onCurrencyChange,// Función al cambiar moneda
  onClear,         // Función para borrar (X)
  isReadOnly,      // Si es el campo calculado (opcional, por si quieres estilos diferentes)
  children         // Para inyectar elementos extra (como la equivalencia visual)
}) => {
  return (
    <div className="relative mb-2 group">
      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2 mb-1 block">
        {label}
      </label>
      
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 h-[4.5rem]"> {/* Altura fija para evitar saltos */}
          
          {/* SELECTOR DE MONEDA */}
          <div className="relative w-[110px] shrink-0 h-full">
            <select 
              value={currency} 
              onChange={onCurrencyChange} 
              className="w-full h-full bg-slate-50 dark:bg-slate-950 rounded-2xl appearance-none font-bold text-slate-700 dark:text-slate-200 px-4 focus:outline-none text-sm border border-transparent focus:border-slate-200 dark:focus:border-slate-700 dark:border-slate-800 cursor-pointer transition-colors truncate pr-6"
            >
              {currencies.map(c => (
                <option key={c.id} value={c.id} className="dark:bg-slate-900">
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
          </div>
          
          {/* INPUT NUMÉRICO */}
          <div className="relative flex-1 min-w-0 h-full">
            <input 
              type="text" 
              inputMode="decimal" 
              value={amount} 
              onChange={onAmountChange} 
              placeholder="0" 
              className="w-full h-full bg-slate-50 dark:bg-slate-950 text-3xl font-bold font-mono text-slate-800 dark:text-white p-4 pl-4 rounded-2xl outline-none focus:ring-2 focus:ring-brand transition-all text-right placeholder:text-slate-300 dark:placeholder:text-slate-700 dark:border dark:border-slate-800"
            />
            
            {/* Botón Borrar (Solo si hay monto) */}
            {amount && (
              <button 
                onClick={onClear} 
                className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 bg-slate-200/50 dark:bg-slate-800/50 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all z-10"
              >
                <X size={14} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>

        {/* Slot para contenido extra (Equivalencia) */}
        {children}
      </div>
    </div>
  );
};