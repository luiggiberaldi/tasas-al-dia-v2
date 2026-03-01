import React from 'react';
import { Package, ShoppingBag, X } from 'lucide-react';
import { fromBaseUsd, currencySymbol } from '../../utils/currencyUtils';

/**
 * Formulario de nueva venta + modal de selección de catálogo.
 */
export const SaleFormSection = ({
    // Form state
    selectedProductId, productName, qty, setQty,
    buyPrice, setBuyPrice, sellPrice, setSellPrice,
    error,
    // Catalog modal
    showCatalog, setShowCatalog,
    catalogSearch, setCatalogSearch,
    products, productsLoading, handleSelectProduct,
    // Config
    mainCurrency, rates, ratesReady,
    // Handlers
    onSubmit, triggerHaptic,
}) => {
    const sym = currencySymbol(mainCurrency);

    return (
        <>
            {/* Formulario rápido */}
            <form onSubmit={onSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Package size={12} className="inline mr-1 -mt-0.5" /> Nueva venta
                </p>

                {/* Selector de producto */}
                <div className="space-y-2">
                    <button
                        type="button"
                        onClick={() => { triggerHaptic?.(); setCatalogSearch(''); setShowCatalog(true); }}
                        className={`w-full flex items-center justify-center gap-2 py-3 border rounded-xl text-sm font-bold transition-colors active:scale-[0.98] ${selectedProductId
                            ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-amber-500/50 hover:text-amber-500'
                            }`}
                    >
                        <ShoppingBag size={16} />
                        {selectedProductId ? productName : 'Elegir producto del catálogo'}
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Cant.</label>
                        <input type="number" placeholder="0" value={qty} onChange={e => setQty(e.target.value)} min="0" step="any"
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
                    </div>
                    <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Compra {sym}</label>
                        <input type="number" placeholder="0.00" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} min="0" step="any"
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
                    </div>
                    <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Venta {sym}</label>
                        <input type="number" placeholder="0.00" value={sellPrice} onChange={e => setSellPrice(e.target.value)} min="0" step="any"
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
                    </div>
                </div>

                {error && (
                    <p className="text-xs text-rose-500 font-bold text-center animate-in fade-in duration-200">{error}</p>
                )}

                <button type="submit"
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-sm rounded-xl active:scale-[0.98] transition-all shadow-md shadow-amber-500/20">
                    Registrar Venta
                </button>
            </form>

            {/* Modal Catálogo */}
            {showCatalog && (
                <div
                    className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200"
                    onClick={() => setShowCatalog(false)}
                >
                    <div
                        className="w-full max-w-md bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-5 pb-8 animate-in slide-in-from-bottom duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <ShoppingBag size={16} className="text-amber-500" /> Catálogo
                            </h3>
                            <button onClick={() => setShowCatalog(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        {productsLoading ? (
                            <div className="text-center py-8">
                                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                <p className="text-xs text-slate-400">Cargando catálogo...</p>
                            </div>
                        ) : products.length === 0 ? (
                            <div className="text-center py-8">
                                <ShoppingBag size={28} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                                <p className="text-xs text-slate-400">No tienes productos en el catálogo aún.</p>
                            </div>
                        ) : (
                            <>
                                <div className="relative mb-3">
                                    <input type="text" placeholder="Buscar producto..." value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} autoFocus
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
                                </div>
                                {(() => {
                                    const filtered = products.filter(p =>
                                        p.name.toLowerCase().includes(catalogSearch.toLowerCase())
                                    );
                                    return filtered.length === 0 ? (
                                        <div className="text-center py-6">
                                            <p className="text-xs text-slate-400">No se encontraron productos</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5 max-h-[45vh] overflow-y-auto scrollbar-hide">
                                            {filtered.map(p => (
                                                <button key={p.id} onClick={() => handleSelectProduct(p)}
                                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-amber-500/40 transition-colors text-left active:scale-[0.98]">
                                                    {p.image ? (
                                                        <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0 bg-slate-200 dark:bg-slate-700" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                                            <Package size={16} className="text-slate-400" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{p.name}</p>
                                                        <p className="text-xs text-amber-500 font-bold">
                                                            {ratesReady
                                                                ? `${fromBaseUsd(p.priceUsdt, mainCurrency, rates).toFixed(2)} ${sym}`
                                                                : `${p.priceUsdt} USDT`
                                                            }
                                                        </p>
                                                        {p.costUsdt && (
                                                            <p className="text-[9px] text-rose-400 font-semibold">
                                                                Costo: {ratesReady ? `${fromBaseUsd(p.costUsdt, mainCurrency, rates).toFixed(2)} ${sym}` : `${p.costUsdt} USDT`}
                                                            </p>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
