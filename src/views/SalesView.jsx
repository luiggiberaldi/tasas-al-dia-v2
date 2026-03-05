import React, { useState, useMemo, useCallback } from 'react';
import { TrendingUp, Trash2, Globe, ShoppingCart } from 'lucide-react';
import { useSales } from '../hooks/useSales';
import { useProductsLite } from '../hooks/useProductsLite';
import { useBusinessCurrency } from '../hooks/useBusinessCurrency';
import { CURRENCIES, currencySymbol, fromBaseUsd, toBaseUsd } from '../utils/currencyUtils';
import { formatBs } from '../utils/calculatorUtils';

import ProductGrid from '../components/sales/ProductGrid';
import ResellerCart from '../components/sales/ResellerCart';
import { SalesHistoryList } from '../components/sales/SalesHistoryList';

const fmtUsd = (v) => v.toFixed(2);

export default function SalesView({ theme, triggerHaptic, rates }) {
    const { sales, isLoading, addBatchSale, removeSale, clearAll, getTotals } = useSales();
    const { products, isLoading: productsLoading } = useProductsLite();
    const { mainCurrency, parityMode } = useBusinessCurrency();
    const sym = currencySymbol(mainCurrency);
    const label = CURRENCIES[mainCurrency];
    const ratesReady = rates?.usdt?.price > 0;

    // Cart state
    const [cart, setCart] = useState([]);
    const [showMobileCart, setShowMobileCart] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    const todayTotals = getTotals('today');
    const todayStr = new Date().toLocaleDateString('es-VE');
    const todaySales = useMemo(() =>
        sales.filter(s => new Date(s.createdAt).toLocaleDateString('es-VE') === todayStr),
        [sales, todayStr]
    );

    const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0);

    // ── Cart Actions ──
    const handleAddToCart = useCallback((product) => {
        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                return prev.map(item =>
                    item.productId === product.id ? { ...item, qty: item.qty + 1 } : item
                );
            }
            const sellPrice = ratesReady ? fromBaseUsd(product.priceUsdt, mainCurrency, rates) : product.priceUsdt;
            const buyPrice = product.costUsdt && ratesReady ? fromBaseUsd(product.costUsdt, mainCurrency, rates) : (product.costUsdt || 0);
            return [...prev, {
                productId: product.id,
                productName: product.name,
                name: product.name,
                qty: 1,
                buyPrice: parseFloat(buyPrice) || 0,
                sellPrice: parseFloat(sellPrice) || 0,
            }];
        });
    }, [mainCurrency, rates, ratesReady]);

    const handleUpdateQty = useCallback((productId, newQty) => {
        if (newQty <= 0) {
            setCart(prev => prev.filter(item => item.productId !== productId));
        } else {
            setCart(prev => prev.map(item =>
                item.productId === productId ? { ...item, qty: newQty } : item
            ));
        }
    }, []);

    const handleRemoveItem = useCallback((productId) => {
        setCart(prev => prev.filter(item => item.productId !== productId));
    }, []);

    const handleClearCart = useCallback(() => {
        setCart([]);
    }, []);

    const handleCheckout = useCallback(() => {
        if (cart.length === 0) return;

        // Convert cart items to sale data with USD base prices
        const saleItems = cart.map(item => {
            const buyUsd = ratesReady ? toBaseUsd(item.buyPrice, mainCurrency, rates) : item.buyPrice;
            const sellUsd = ratesReady ? toBaseUsd(item.sellPrice, mainCurrency, rates) : item.sellPrice;
            return {
                productId: item.productId,
                productName: item.name,
                qty: item.qty,
                buyPrice: item.buyPrice,
                sellPrice: item.sellPrice,
                buyUsd,
                sellUsd,
                profitUnitUsd: sellUsd - buyUsd,
                profitTotalUsd: (sellUsd - buyUsd) * item.qty,
                totalUsd: sellUsd * item.qty,
                displayCurrency: mainCurrency,
                displayBuy: item.buyPrice,
                displaySell: item.sellPrice,
            };
        });

        addBatchSale(saleItems);
        setCart([]);
        setShowMobileCart(false);
        triggerHaptic?.();
    }, [cart, ratesReady, mainCurrency, rates, addBatchSale, triggerHaptic]);

    // ── Delete Handlers ──
    const handleClearAll = () => setDeleteConfirmId({ type: 'all' });
    const confirmDelete = () => {
        if (!deleteConfirmId) return;
        triggerHaptic?.();
        if (deleteConfirmId.type === 'single') removeSale(deleteConfirmId.id);
        else if (deleteConfirmId.type === 'all') clearAll();
        setDeleteConfirmId(null);
    };

    const getProductNameById = useCallback((id) => {
        const p = products.find(x => x.id === id);
        return p ? p.name : null;
    }, [products]);

    if (isLoading) {
        return (
            <div className="space-y-3 p-4">
                <div className="skeleton h-8 w-48 rounded-xl" />
                <div className="grid grid-cols-3 gap-2">
                    <div className="skeleton h-20 rounded-xl" />
                    <div className="skeleton h-20 rounded-xl" />
                    <div className="skeleton h-20 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <TrendingUp size={22} className="text-amber-500" />
                        Zona Revendedor
                    </h1>
                    {(!parityMode && mainCurrency !== 'USDT') && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full w-fit mt-1">
                            <Globe size={12} className="text-amber-500" />
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                Trabajando en {label} · Bs como referencia
                            </span>
                        </div>
                    )}
                </div>

                {/* Mobile Cart Button (FAB) */}
                <button
                    onClick={() => setShowMobileCart(true)}
                    className="lg:hidden relative p-3 bg-amber-500 rounded-2xl text-slate-900 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                >
                    <ShoppingCart size={20} />
                    {cartItemCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                            {cartItemCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Daily Summary */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Vendido</p>
                    <p className="text-base font-black text-slate-900 dark:text-white mt-0.5 flex flex-wrap items-center justify-center gap-1">
                        {ratesReady ? fmtUsd(fromBaseUsd(todayTotals.totalSoldUsd, mainCurrency, rates)) : '—'}
                        {ratesReady && mainCurrency !== 'USDT' && <span className="text-[11px] text-amber-500 font-bold">{sym}</span>}
                    </p>
                    {ratesReady && mainCurrency === 'USDT' && <p className="text-[10px] text-amber-500 font-bold mt-0.5">{sym}</p>}
                    {ratesReady && <p className="text-[9px] text-slate-400 mt-0.5">≈ {formatBs(todayTotals.totalSoldUsd * rates.usdt.price)} Bs</p>}
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ganancia</p>
                    <p className={`text-base font-black mt-0.5 flex flex-wrap items-center justify-center gap-1 ${todayTotals.totalProfitUsd >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {ratesReady ? fmtUsd(fromBaseUsd(todayTotals.totalProfitUsd, mainCurrency, rates)) : '—'}
                        {ratesReady && mainCurrency !== 'USDT' && <span className="text-[11px] text-emerald-500 font-bold">{sym}</span>}
                    </p>
                    {ratesReady && mainCurrency === 'USDT' && <p className="text-[10px] text-emerald-500 font-bold mt-0.5">{sym}</p>}
                    {ratesReady && <p className="text-[9px] text-slate-400 mt-0.5">≈ {formatBs(todayTotals.totalProfitUsd * rates.usdt.price)} Bs</p>}
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ventas</p>
                    <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">{todayTotals.count}</p>
                    <p className="text-[9px] text-slate-400 font-bold">hoy</p>
                </div>
            </div>

            {/* POS Layout: Product Grid + Cart */}
            <div className="flex gap-4 min-h-[50vh]">
                {/* Left: Product Grid */}
                <div className="flex-[3] min-w-0">
                    <ProductGrid
                        products={products}
                        isLoading={productsLoading}
                        mainCurrency={mainCurrency}
                        rates={rates}
                        ratesReady={ratesReady}
                        onAddToCart={handleAddToCart}
                        triggerHaptic={triggerHaptic}
                    />
                </div>

                {/* Right: Cart (Desktop only) */}
                <div className="hidden lg:flex flex-[2] bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                    <ResellerCart
                        cart={cart}
                        mainCurrency={mainCurrency}
                        rates={rates}
                        ratesReady={ratesReady}
                        onUpdateQty={handleUpdateQty}
                        onRemoveItem={handleRemoveItem}
                        onClearCart={handleClearCart}
                        onCheckout={handleCheckout}
                        triggerHaptic={triggerHaptic}
                    />
                </div>
            </div>

            {/* Mobile Cart Bottom Sheet */}
            {showMobileCart && (
                <div
                    className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200 lg:hidden"
                    onClick={() => setShowMobileCart(false)}
                >
                    <div
                        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <ResellerCart
                            cart={cart}
                            mainCurrency={mainCurrency}
                            rates={rates}
                            ratesReady={ratesReady}
                            onUpdateQty={handleUpdateQty}
                            onRemoveItem={handleRemoveItem}
                            onClearCart={handleClearCart}
                            onCheckout={handleCheckout}
                            triggerHaptic={triggerHaptic}
                        />
                    </div>
                </div>
            )}

            {/* Sales History */}
            <SalesHistoryList
                todaySales={todaySales}
                mainCurrency={mainCurrency}
                rates={rates}
                ratesReady={ratesReady}
                getProductNameById={getProductNameById}
                onDeleteSale={(id) => setDeleteConfirmId({ type: 'single', id })}
                triggerHaptic={triggerHaptic}
            />

            {/* Clear History */}
            {sales.length > 0 && (
                <button onClick={handleClearAll} className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors">
                    Limpiar historial completo ({sales.length} registros)
                </button>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setDeleteConfirmId(null)}
                >
                    <div
                        className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-center mb-4">
                            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center">
                                <Trash2 size={24} />
                            </div>
                        </div>
                        <h3 className="text-lg font-black text-center text-slate-900 dark:text-white mb-2">
                            {deleteConfirmId.type === 'all' ? 'Eliminar Historial' : 'Eliminar Venta'}
                        </h3>
                        <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6 font-medium">
                            {deleteConfirmId.type === 'all'
                                ? '¿Estás seguro de que quieres eliminar todo el historial de ventas? Esta acción no se puede deshacer.'
                                : '¿Estás seguro de que quieres eliminar esta venta? Esto afectará los totales de ganancia del día.'
                            }
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setDeleteConfirmId(null)}
                                className="py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors active:scale-95">
                                Cancelar
                            </button>
                            <button onClick={confirmDelete}
                                className="py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-colors active:scale-95 shadow-md shadow-rose-500/20">
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
