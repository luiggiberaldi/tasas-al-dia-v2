import React from 'react';
import { TrendingUp, Trash2, Calendar } from 'lucide-react';
import { fromBaseUsd, currencySymbol } from '../../utils/currencyUtils';
import { formatBs } from '../../utils/calculatorUtils';

const fmtUsd = (v) => v.toFixed(2);
const fmtTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Lista de ventas de hoy con desglose de ganancia.
 */
export const SalesHistoryList = ({
    todaySales, mainCurrency, rates, ratesReady,
    getProductNameById, onDeleteSale, triggerHaptic,
}) => {
    const sym = currencySymbol(mainCurrency);

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                <Calendar size={12} className="inline mr-1 -mt-0.5" /> Ventas de hoy
            </p>

            {todaySales.length === 0 ? (
                <div className="text-center py-6">
                    <TrendingUp size={28} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs text-slate-400">Sin ventas registradas hoy</p>
                </div>
            ) : (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto scrollbar-hide">
                    {todaySales.map(s => {
                        const catalogName = s.productId ? getProductNameById(s.productId) : null;
                        const saleProfit = typeof s.profitTotalUsd === 'number' ? s.profitTotalUsd : (s.profitUsd || s.profitTotal || 0);
                        const saleSold = typeof s.sellUsd === 'number' ? s.sellUsd * (s.qty || 1) : (s.totalUsd || s.total || 0);

                        return (
                            <div key={s.id} className="flex items-start justify-between gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                        {s.productName}
                                        <span className="text-slate-400 font-normal ml-1 text-xs">
                                            · {s.qty} × {ratesReady ? `${fmtUsd(fromBaseUsd(saleSold / (s.qty || 1), mainCurrency, rates))}` : '—'} = {ratesReady ? `${fmtUsd(fromBaseUsd(saleSold, mainCurrency, rates))} ${sym}` : '—'}
                                        </span>
                                    </p>
                                    <p className={`text-xs font-bold mt-0.5 ${saleProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        Ganancia: {ratesReady ? `+${fmtUsd(fromBaseUsd(saleProfit, mainCurrency, rates))} ${sym}` : '— sin datos base'}
                                    </p>
                                    {ratesReady && (
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            ≈ {formatBs(saleProfit * rates.usdt.price)} Bs
                                        </p>
                                    )}
                                    {catalogName && (
                                        <p className="text-[9px] text-amber-500/70 font-semibold flex items-center gap-1 mt-0.5">
                                            🔗 {catalogName}
                                        </p>
                                    )}
                                    <p className="text-[9px] text-slate-400 mt-0.5">{fmtTime(s.createdAt)}</p>
                                </div>
                                <button
                                    onClick={() => { triggerHaptic?.(); onDeleteSale(s.id); }}
                                    className="shrink-0 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
