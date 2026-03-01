import React from 'react';
import { Settings, Banknote, Zap, AlertTriangle } from 'lucide-react';
import { formatBs } from '../../utils/calculatorUtils';

/**
 * Panel desplegable de configuración de tasas (USDT base + calibración de calle).
 */
export const RateConfigPanel = ({
    isConfigOpen, setIsConfigOpen,
    // USDT rate
    useAutoUsdt, setUseAutoUsdt,
    customUsdtPrice, setCustomUsdtPrice,
    effectiveUsdtRate, activeBaseRate,
    rates,
    // Cash / Street
    showCashPrice, setShowCashPrice,
    streetRate, streetPriceInput,
    handleCalibration, applyCalibration,
    // Labels
    rateFieldLabel, cashSectionLabel, cashSectionDescription,
    streetRateLabel, effectivePriceUnit,
    mainCurrency,
    triggerHaptic,
}) => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="w-full flex items-center justify-between p-3 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
            <span className="flex items-center gap-2">
                <Settings size={16} className={(!useAutoUsdt || !showCashPrice) ? "text-indigo-500" : "text-slate-400"} />
                Configuración de Tasas
            </span>
            <div className="flex gap-2">
                {!useAutoUsdt && <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-1 rounded-lg text-[10px]">Manual: {formatBs(activeBaseRate)}</span>}
                {showCashPrice && <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-lg text-[10px]">Efectivo: {streetRate} Bs</span>}
            </div>
        </button>

        {isConfigOpen && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-2">

                {/* SECTION 1: USDT RATE */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Banknote size={12} /> {rateFieldLabel}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">{useAutoUsdt ? <span>Automática · <strong className="text-emerald-600 dark:text-emerald-400">{formatBs(activeBaseRate)} Bs</strong></span> : <span>Manual · <span className="text-slate-500">Ref: <strong className="text-indigo-500">{formatBs(activeBaseRate)} Bs</strong></span></span>}</span>
                            <button
                                onClick={() => {
                                    triggerHaptic && triggerHaptic();
                                    const nextVal = !useAutoUsdt;
                                    setUseAutoUsdt(nextVal);
                                    localStorage.setItem('catalog_use_auto_usdt', JSON.stringify(nextVal));
                                }}
                                className={`relative w-9 h-5 rounded-full transition-colors ${useAutoUsdt ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <span className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${useAutoUsdt ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                    {!useAutoUsdt && (
                        <input
                            type="number"
                            value={customUsdtPrice}
                            onChange={(e) => {
                                setCustomUsdtPrice(e.target.value);
                                localStorage.setItem('catalog_custom_usdt_price', e.target.value);
                            }}
                            onFocus={(e) => e.target.value === '0' && setCustomUsdtPrice('')}
                            className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-indigo-600 dark:text-indigo-400 outline-none focus:border-indigo-500"
                            placeholder="Tasa Manual (Bs)"
                        />
                    )}
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-700" />

                {/* SECTION 2: CASH PRICES */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Zap size={12} /> {cashSectionLabel}</span>
                        <button
                            onClick={() => { triggerHaptic && triggerHaptic(); setShowCashPrice(!showCashPrice); }}
                            className={`relative w-9 h-5 rounded-full transition-colors ${showCashPrice ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                            <span className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${showCashPrice ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>



                    {showCashPrice && (
                        <>
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">{streetRateLabel}</label>
                                    <input
                                        type="number"
                                        value={streetPriceInput}
                                        onChange={(e) => handleCalibration(e.target.value)}
                                        placeholder={streetRate || "0.00"}
                                        className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-brand"
                                    />
                                </div>
                                <button
                                    onClick={applyCalibration}
                                    disabled={!streetPriceInput || parseFloat(streetPriceInput) <= 0}
                                    className="px-4 py-2 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50 hover:opacity-90 transition-opacity"
                                >
                                    Aplicar
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight px-1">
                                {cashSectionDescription}
                            </p>
                            <p className="text-[10px] text-slate-400 leading-tight px-1 mt-1">
                                Vender físico a <strong className="text-slate-600 dark:text-slate-300">{streetPriceInput || streetRate || '...'} Bs</strong> = Valor {effectivePriceUnit} (Digital).
                            </p>
                        </>
                    )}
                </div>
            </div>
        )}
    </div>
);
