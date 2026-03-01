import React from 'react';
import { Tag, Banknote, Share2, Pencil, Trash2 } from 'lucide-react';
import { formatBs, formatUsd } from '../../utils/calculatorUtils';
import { currencySymbol, fromBaseUsd } from '../../utils/currencyUtils';

/**
 * Tarjeta individual de producto en el grid del catálogo.
 */
export const ProductCard = ({
    product: p,
    valBs, refBcv, refEur, efectivoPrecio,
    mainCurrency, rates,
    onShare, onEdit, onDelete,
}) => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden group">

        {/* Imagen compacta */}
        <div className="w-full h-24 bg-slate-100 dark:bg-slate-800 overflow-hidden relative shrink-0">
            {p.image ? (
                <img src={p.image} className="w-full h-full object-contain p-1" alt={p.name} loading="lazy" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                    <Tag size={24} />
                </div>
            )}
            {efectivoPrecio && (
                <div className="absolute bottom-1 left-1 bg-emerald-500/90 backdrop-blur-sm text-white text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Banknote size={9} />
                    {efectivoPrecio}
                </div>
            )}
        </div>

        <div className="p-2 flex flex-col flex-1">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-[11px] leading-snug line-clamp-2 mb-1">{p.name}</h3>
            <p className="text-base font-black text-brand-dark leading-none">
                {rates?.usdt?.price > 0
                    ? formatUsd(fromBaseUsd(p.priceUsdt, mainCurrency, rates))
                    : '—'
                } <span className="text-[9px] font-bold text-slate-400">{currencySymbol(mainCurrency)}</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{formatBs(valBs)} Bs</p>

            {/* Dynamic Currency References */}
            {mainCurrency === 'USDT' && (
                <>
                    <p className="text-[9px] text-slate-400">Ref BCV: <span className="font-semibold text-slate-500 dark:text-slate-300">${formatUsd(refBcv).replace('$', '')}</span></p>
                    <p className="text-[9px] text-slate-400">Ref EUR: <span className="font-semibold text-slate-500 dark:text-slate-300">€{formatUsd(refEur).replace('$', '').replace('€', '')}</span></p>
                </>
            )}
            {mainCurrency === 'USD_BCV' && (
                <>
                    <p className="text-[9px] text-slate-400">Ref EUR: <span className="font-semibold text-slate-500 dark:text-slate-300">€{formatUsd(refEur).replace('$', '').replace('€', '')}</span></p>
                </>
            )}
            {mainCurrency === 'EUR_BCV' && (
                <>
                    <p className="text-[9px] text-slate-400">Ref BCV: <span className="font-semibold text-slate-500 dark:text-slate-300">${formatUsd(refBcv).replace('$', '')}</span></p>
                </>
            )}
        </div>

        {/* Acciones */}
        <div className="flex border-t border-slate-100 dark:border-slate-800">
            <button onClick={() => onShare(p)} className="flex-1 py-1.5 flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-indigo-500 transition-colors"><Share2 size={12} /></button>
            <button onClick={() => onEdit(p)} className="flex-1 py-1.5 flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-amber-500 transition-colors"><Pencil size={12} /></button>
            <button onClick={() => onDelete(p.id)} className="flex-1 py-1.5 flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors"><Trash2 size={12} /></button>
        </div>
    </div>
);
