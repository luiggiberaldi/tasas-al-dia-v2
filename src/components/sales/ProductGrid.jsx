import React, { useState, useMemo, useEffect } from 'react';
import { Search, Package, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { fromBaseUsd, currencySymbol } from '../../utils/currencyUtils';

/**
 * Grid de productos del catálogo para agregar al carrito.
 * Tap en un producto = se agrega al carrito con precios del catálogo.
 */
export default function ProductGrid({ products, isLoading, mainCurrency, rates, ratesReady, onAddToCart, triggerHaptic }) {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const sym = currencySymbol(mainCurrency);
    const PAGE_SIZE = 10;

    const filtered = useMemo(() => {
        if (!search) return products;
        const q = search.toLowerCase();
        return products.filter(p => p.name.toLowerCase().includes(q));
    }, [products, search]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

    // Reset page when search changes
    useEffect(() => { setPage(1); }, [search]);

    if (isLoading) {
        return (
            <div className="space-y-3">
                <div className="skeleton h-11 rounded-xl" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-0 flex-1">
            {/* Search */}
            <div className="relative mb-3 shrink-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                    placeholder="Buscar producto..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-3 border-2 border-dashed border-slate-200 dark:border-slate-700">
                            <Package size={28} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-sm font-bold text-slate-500">Sin productos</p>
                        <p className="text-xs text-slate-400 mt-1">Agrega productos en el catálogo primero</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-slate-400">No se encontró "{search}"</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {paginated.map(p => {
                                const sellDisplay = ratesReady ? fromBaseUsd(p.priceUsdt, mainCurrency, rates).toFixed(2) : p.priceUsdt;
                                const costDisplay = p.costUsdt && ratesReady ? fromBaseUsd(p.costUsdt, mainCurrency, rates).toFixed(2) : null;
                                const margin = costDisplay ? ((sellDisplay - costDisplay) / costDisplay * 100).toFixed(0) : null;

                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => { triggerHaptic?.(); onAddToCart(p); }}
                                        className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 text-left transition-all active:scale-[0.96] hover:border-brand/40 hover:shadow-md group"
                                    >
                                        {/* Add icon */}
                                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Plus size={14} className="text-brand" />
                                        </div>

                                        {/* Image or placeholder */}
                                        {p.image ? (
                                            <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover mb-2 bg-slate-100 dark:bg-slate-800" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-2">
                                                <Package size={16} className="text-slate-300 dark:text-slate-600" />
                                            </div>
                                        )}

                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{p.name}</p>
                                        <p className="text-sm font-black text-brand mt-0.5">{sellDisplay} {sym}</p>
                                        {margin && (
                                            <p className={`text-[9px] font-bold mt-0.5 ${parseFloat(margin) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {parseFloat(margin) >= 0 ? '+' : ''}{margin}% margen
                                            </p>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 mt-3 shrink-0">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 disabled:opacity-30 active:scale-95 transition-all"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 disabled:opacity-30 active:scale-95 transition-all"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
