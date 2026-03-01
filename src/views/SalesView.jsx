import React, { useState } from 'react';
import { TrendingUp, Trash2, Globe } from 'lucide-react';
import { useSales } from '../hooks/useSales';
import { useProductsLite } from '../hooks/useProductsLite';
import { useBusinessCurrency } from '../hooks/useBusinessCurrency';
import { CURRENCIES, currencySymbol, fromBaseUsd, toBaseUsd } from '../utils/currencyUtils';
import { formatBs } from '../utils/calculatorUtils';

// Extracted components
import { SaleFormSection } from '../components/sales/SaleFormSection';
import { SalesHistoryList } from '../components/sales/SalesHistoryList';

const fmtUsd = (v) => v.toFixed(2);

export default function SalesView({ theme, triggerHaptic, rates }) {
    const { sales, isLoading, addSale, removeSale, clearAll, getTotals } = useSales();
    const { products, isLoading: productsLoading } = useProductsLite();
    const { mainCurrency, parityMode } = useBusinessCurrency();
    const sym = currencySymbol(mainCurrency);
    const label = CURRENCIES[mainCurrency];
    const ratesReady = rates?.usdt?.price > 0;

    const [productName, setProductName] = useState('');
    const [qty, setQty] = useState('');
    const [buyPrice, setBuyPrice] = useState('');
    const [sellPrice, setSellPrice] = useState('');
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [showCatalog, setShowCatalog] = useState(false);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [error, setError] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    const todayTotals = getTotals('today');
    const todayStr = new Date().toLocaleDateString('es-VE');
    const todaySales = sales.filter(s =>
        new Date(s.createdAt).toLocaleDateString('es-VE') === todayStr
    );

    const handleSelectProduct = (p) => {
        triggerHaptic?.();
        setSelectedProductId(p.id);
        setProductName(p.name);
        setSellPrice(
            ratesReady
                ? fromBaseUsd(p.priceUsdt, mainCurrency, rates).toFixed(2)
                : p.priceUsdt
        );
        setBuyPrice(
            p.costUsdt > 0 && ratesReady
                ? fromBaseUsd(p.costUsdt, mainCurrency, rates).toFixed(2)
                : (p.costUsdt || p.priceUsdt || '')
        );
        setShowCatalog(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        triggerHaptic?.();

        if (!selectedProductId || !qty || !buyPrice || !sellPrice) {
            setError('Selecciona un producto y completa los campos');
            setTimeout(() => setError(''), 2500);
            return;
        }

        const q = parseFloat(qty) || 1;
        const bp = parseFloat(buyPrice) || 0;
        const sp = parseFloat(sellPrice) || 0;

        if (q <= 0 || bp < 0 || sp <= 0) {
            setError('Los valores deben ser mayores a 0');
            setTimeout(() => setError(''), 2500);
            return;
        }

        const buyUsd = ratesReady ? toBaseUsd(bp, mainCurrency, rates) : bp;
        const sellUsd = ratesReady ? toBaseUsd(sp, mainCurrency, rates) : sp;

        const profitUnitUsd = sellUsd - buyUsd;
        const profitTotalUsd = profitUnitUsd * q;

        addSale({
            productId: selectedProductId,
            productName: productName,
            qty: q,
            buyPrice: bp,
            sellPrice: sp,
            buyUsd,
            sellUsd,
            profitUnitUsd,
            profitTotalUsd,
            displayCurrency: mainCurrency,
            displayBuy: bp,
            displaySell: sp,
        });

        setProductName('');
        setQty('');
        setBuyPrice('');
        setSellPrice('');
        setSelectedProductId(null);
    };

    const handleClearAll = () => {
        setDeleteConfirmId({ type: 'all' });
    };

    const confirmDelete = () => {
        if (!deleteConfirmId) return;
        triggerHaptic?.();
        if (deleteConfirmId.type === 'single') {
            removeSale(deleteConfirmId.id);
        } else if (deleteConfirmId.type === 'all') {
            clearAll();
        }
        setDeleteConfirmId(null);
    };

    const getProductNameById = (id) => {
        const p = products.find(x => x.id === id);
        return p ? p.name : null;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-300">

            {/* Header */}
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

            {/* Resumen del día */}
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

            {/* Sale Form + Catalog Modal */}
            <SaleFormSection
                selectedProductId={selectedProductId}
                productName={productName}
                qty={qty} setQty={setQty}
                buyPrice={buyPrice} setBuyPrice={setBuyPrice}
                sellPrice={sellPrice} setSellPrice={setSellPrice}
                error={error}
                showCatalog={showCatalog} setShowCatalog={setShowCatalog}
                catalogSearch={catalogSearch} setCatalogSearch={setCatalogSearch}
                products={products} productsLoading={productsLoading}
                handleSelectProduct={handleSelectProduct}
                mainCurrency={mainCurrency} rates={rates} ratesReady={ratesReady}
                onSubmit={handleSubmit} triggerHaptic={triggerHaptic}
            />

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

            {/* Limpiar historial */}
            {sales.length > 0 && (
                <button onClick={handleClearAll} className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors">
                    Limpiar historial completo ({sales.length} registros)
                </button>
            )}

            {/* Modal Confirmar Eliminación */}
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
