import React from 'react';
import { ChevronDown, X } from 'lucide-react';

export default function CalculatorInput({ 
  label, 
  amount, 
  currency, 
  onAmountChange, 
  onCurrencyChange, 
  readOnly = false,
  currencies = [], 
  onClear,
  children 
}) {
  // Buscar el objeto de la moneda actual para mostrar su icono correcto
  const currentCurrencyData = currencies.find(c => c.id === currency) || { icon: '💰', label: currency };

  // 🧠 LÓGICA DE AUTO-ESCALADO DE TEXTO
  // Reduce el tamaño de la fuente según la longitud del número
  const getFontSize = (value) => {
    const len = value ? value.toString().length : 0;
    if (len > 12) return 'text-xl';       // Muy pequeño para cifras enormes (Billones)
    if (len > 9) return 'text-2xl';       // Mediano para millones largos
    if (len > 7) return 'text-3xl';       // Grande normal
    return 'text-4xl';                    // Gigante (Default)
  };

  return (
    <div className="flex flex-col gap-2 relative z-10">
      {/* Etiqueta superior (Tengo / Recibo) */}
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
        {label}
      </span>

      {/* Contenedor Principal (Tarjeta) */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 flex items-center justify-between border border-slate-200 dark:border-slate-700 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/20 transition-all duration-300 relative">
        
        {/* LADO IZQUIERDO: Selector de Moneda */}
        <div className="flex items-center gap-2 shrink-0 relative group cursor-pointer p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            {/* Input Select "Fantasma" para funcionalidad nativa en móviles */}
            <select 
                value={currency}
                onChange={(e) => onCurrencyChange && onCurrencyChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                disabled={!onCurrencyChange}
            >
                {currencies.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                ))}
            </select>

            {/* Visual del Selector */}
            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-600 shadow-sm text-lg">
                {currentCurrencyData.icon}
            </div>
            <div className="flex flex-col leading-none">
                <span className="font-bold text-slate-700 dark:text-white text-sm tracking-wide flex items-center gap-1">
                    {currentCurrencyData.id} <ChevronDown size={12} className="opacity-50"/>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{currentCurrencyData.label}</span>
            </div>
        </div>

        {/* LADO DERECHO: Input Numérico */}
        <div className="flex-1 flex flex-col items-end relative min-w-0 ml-2">
            <div className="flex items-center w-full justify-end">
                <input
                    type="text"
                    inputMode="decimal" // Teclado numérico en móviles
                    value={amount}
                    onChange={(e) => {
                         // Validar que sea número válido (solo números, puntos y comas)
                         const val = e.target.value.replace(/[^0-9.,]/g, '');
                         if (onAmountChange) onAmountChange(val);
                    }}
                    placeholder="0"
                    readOnly={readOnly}
                    className={`
                        w-full bg-transparent border-none outline-none 
                        text-right font-mono font-bold transition-all duration-200
                        placeholder-slate-300 dark:placeholder-slate-600
                        ${getFontSize(amount)} 
                        ${readOnly ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-white'}
                    `}
                />
                
                {/* Botón de Borrar (X) - Se oculta si está vacío o es solo lectura */}
                {!readOnly && amount && amount !== '' && (
                    <button 
                        onClick={onClear}
                        className="ml-2 p-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 hover:text-rose-500 transition-colors animate-in zoom-in duration-200 shrink-0"
                    >
                        <X size={14} strokeWidth={3} />
                    </button>
                )}
            </div>
            
            {/* Espacio para hijos (ej: equivalencia en gris pequeño) */}
            {children}
        </div>
      </div>
    </div>
  );
}