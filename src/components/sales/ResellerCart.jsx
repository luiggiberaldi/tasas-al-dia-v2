import React from 'react';
import { ShoppingCart, Plus, Minus, Trash2, X } from 'lucide-react';
import { currencySymbol } from '../../utils/currencyUtils';
import { formatBs } from '../../utils/calculatorUtils';

/**
 * Panel de carrito para el revendedor.
 * Muestra items con qty, precio compra/venta, ganancia por línea.
 */
export default function ResellerCart({ cart, mainCurrency, rates, ratesReady, onUpdateQty, onRemoveItem, onClearCart, onCheckout, triggerHaptic }) {
    const sym = currencySymbol(mainCurrency);

    // Totales
    const totalSell = cart.reduce((sum, item) => sum + (item.sellPrice * item.qty), 0);
    const totalBuy = cart.reduce((sum, item) => sum + (item.buyPrice * item.qty), 0);
    const totalProfit = totalSell - totalBuy;
    const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                <h2 className="text-sm font-black flex items-center gap-2 text-slate-800 dark:text-white">
                    <ShoppingCart size={16} className="text-amber-500" />
                    Carrito
                </h2>
                <div className="flex items-center gap-2">
                    <span className="bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold py-0.5 px-2 rounded-full">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </span>
                    {cart.length > 0 && (
                        <button onClick={() => { triggerHaptic?.(); onClearCart(); }} className="p-1 text-slate-400 hover:text-rose-500 transition-colors">
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-2 sm:p-3">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-600 text-center">
                        <ShoppingCart size={40} strokeWidth={1} className="mb-3" />
                        <p className="text-xs font-medium">Toca un producto para agregarlo</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {cart.map(item => {
                            const lineTotal = item.sellPrice * item.qty;
                            const lineProfit = (item.sellPrice - item.buyPrice) * item.qty;
                            return (
                                <div key={item.productId} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 transition-all">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{item.name}</p>
                                            <p className="text-[9px] text-slate-400 mt-0.5">
                                                Compra: {item.buyPrice.toFixed(2)} · Venta: {item.sellPrice.toFixed(2)} {sym}
                                            </p>
                                        </div>
                                        <button onClick={() => { triggerHaptic?.(); onRemoveItem(item.productId); }}
                                            className="shrink-0 p-1 text-slate-300 hover:text-rose-500 transition-colors">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => { triggerHaptic?.(); onUpdateQty(item.productId, item.qty - 1); }}
                                                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-rose-100 hover:text-rose-500 dark:hover:bg-rose-900/20 transition-colors active:scale-90">
                                                <Minus size={14} />
                                            </button>
                                            <span className="w-8 text-center text-sm font-black text-slate-800 dark:text-white">{item.qty}</span>
                                            <button onClick={() => { triggerHaptic?.(); onUpdateQty(item.productId, item.qty + 1); }}
                                                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/20 transition-colors active:scale-90">
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-800 dark:text-white">{lineTotal.toFixed(2)} {sym}</p>
                                            <p className={`text-[9px] font-bold ${lineProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {lineProfit >= 0 ? '+' : ''}{lineProfit.toFixed(2)} ganancia
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer / Totals + Checkout */}
            <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-3">
                {/* Breakdown */}
                <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                        <span>Costo total</span>
                        <span>{totalBuy.toFixed(2)} {sym}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                        <span>Venta total</span>
                        <span>{totalSell.toFixed(2)} {sym}</span>
                    </div>
                    <div className={`flex justify-between font-bold ${totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        <span>Ganancia</span>
                        <span>{totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} {sym}</span>
                    </div>
                </div>

                {/* Bs equivalent */}
                {ratesReady && (
                    <p className="text-[9px] text-center text-slate-400">
                        ≈ {formatBs(totalSell * (rates?.usdt?.price || 0))} Bs en ventas
                    </p>
                )}

                {/* Checkout button */}
                <button
                    onClick={() => { triggerHaptic?.(); onCheckout(); }}
                    disabled={cart.length === 0}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-sm rounded-xl active:scale-[0.98] transition-all shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                    <ShoppingCart size={16} />
                    Registrar Venta ({itemCount})
                </button>
            </div>
        </div>
    );
}
