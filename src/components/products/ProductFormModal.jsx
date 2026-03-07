import React, { useState, useCallback } from 'react';
import { Camera, X, Banknote, ArrowRightLeft } from 'lucide-react';
import { Modal } from '../Modal';
import { formatBs, formatUsd } from '../../utils/calculatorUtils';
import { CURRENCIES, currencySymbol, toBaseUsd } from '../../utils/currencyUtils';

/**
 * Editable preview row — tap to edit, auto-recalculates all currencies.
 * Conversion always flows through Bs as the central anchor.
 */
const EditableRate = ({ label, value, prefix, color, onEdit }) => {
    const [editing, setEditing] = useState(false);
    const [localVal, setLocalVal] = useState('');

    const startEdit = () => {
        setLocalVal(value || '');
        setEditing(true);
    };

    const commitEdit = () => {
        setEditing(false);
        const num = parseFloat(localVal);
        if (!isNaN(num) && num > 0) onEdit(num);
    };

    if (editing) {
        return (
            <div className="flex justify-between items-center text-xs gap-2">
                <span className="text-slate-500 shrink-0">{label}:</span>
                <input
                    type="number"
                    autoFocus
                    value={localVal}
                    onChange={e => setLocalVal(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={e => e.key === 'Enter' && commitEdit()}
                    className={`w-28 text-right p-1.5 rounded-lg border-2 border-brand font-mono font-bold text-sm outline-none ${color || 'text-slate-700 dark:text-white'} bg-white dark:bg-slate-800`}
                />
            </div>
        );
    }

    return (
        <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">{label}:</span>
            <button
                onClick={startEdit}
                className={`font-mono font-bold hover:bg-brand/10 px-2 py-1 rounded-lg transition-colors cursor-text ${color || 'text-slate-600 dark:text-slate-300'}`}
                title="Toca para editar"
            >
                {prefix}{typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
            </button>
        </div>
    );
};

/**
 * Modal para añadir / editar un producto del catálogo.
 */
export const ProductFormModal = ({
    isOpen, onClose, editingId,
    name, setName,
    priceUsdt, costUsdt, setCostUsdt,
    priceEfectivo, image, setImage,
    fileInputRef,
    handleImageUpload, handleSave,
    handleEfectivoChange, handleUsdtChange,
    showCashPrice, effectiveUsdtRate,
    rates, mainCurrency,
}) => {
    // Convert any currency → USDT base via Bs anchor
    const setFromBs = useCallback((bs) => {
        if (effectiveUsdtRate <= 0) return;
        const usdtBase = bs / effectiveUsdtRate;
        // Update the main price input (which is in mainCurrency)
        const inMainCurrency = (() => {
            if (mainCurrency === 'USD_BCV') return bs / (rates?.bcv?.price || 1);
            if (mainCurrency === 'EUR_BCV') return bs / (rates?.euro?.price || 1);
            if (mainCurrency === 'COP_COL') return bs / (rates?.cop?.price || 1);
            return usdtBase; // USDT
        })();
        handleUsdtChange(inMainCurrency.toFixed(mainCurrency === 'COP_COL' ? 0 : 2));
    }, [effectiveUsdtRate, rates, mainCurrency, handleUsdtChange]);

    // Derive all values from the current priceUsdt (which is in mainCurrency)
    const parsedPrice = parseFloat(priceUsdt) || 0;
    const usdtBase = parsedPrice > 0 ? toBaseUsd(parsedPrice, mainCurrency, rates) : 0;
    const totalBs = usdtBase * effectiveUsdtRate;
    const refBcv = rates?.bcv?.price > 0 ? totalBs / rates.bcv.price : 0;
    const refEur = rates?.euro?.price > 0 ? totalBs / rates.euro.price : 0;
    const refCop = rates?.cop?.price > 0 ? totalBs / rates.cop.price : 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editingId ? "Editar Producto" : "Nuevo Producto"}>
            <div className="space-y-4">
                {/* Upload */}
                <div onClick={() => fileInputRef.current.click()} className="h-32 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-brand transition-colors relative overflow-hidden">
                    {image ? <img src={image} className="w-full h-full object-cover" /> : (
                        <>
                            <Camera size={24} className="text-slate-400 mb-2" />
                            <span className="text-xs font-bold text-slate-500">Toca para subir foto</span>
                        </>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    {image && <button onClick={(e) => { e.stopPropagation(); setImage(null); }} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full"><X size={12} /></button>}
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-slate-400 ml-1 mb-1 block uppercase">Nombre</label>
                        <input
                            value={name} onChange={e => setName(e.target.value)}
                            autoFocus
                            placeholder="Ej: Zapatos Nike"
                            className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand/50 capitalize"
                        />
                    </div>

                    {/* Inputs de Precio (Efectivo vs mainCurrency) */}
                    <div className={`grid gap-3 ${showCashPrice ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {showCashPrice && (
                            <div className="relative">
                                <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 ml-1 mb-1 block uppercase flex items-center gap-1">
                                    <Banknote size={12} /> Efectivo
                                </label>
                                <input
                                    type="number"
                                    value={priceEfectivo} onChange={e => handleEfectivoChange(e.target.value)}
                                    placeholder="42.00"
                                    className="w-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 p-4 rounded-xl font-black text-emerald-800 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500/50"
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block uppercase">Precio ({CURRENCIES[mainCurrency]})</label>
                            <input
                                type="number"
                                value={priceUsdt} onChange={e => handleUsdtChange(e.target.value)}
                                placeholder="40.00"
                                className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand/50"
                            />
                        </div>
                    </div>

                    {/* Costo (Opcional) */}
                    <div>
                        <label className="text-[10px] font-bold text-rose-400 ml-1 mb-1 block uppercase">Costo de Compra ({CURRENCIES[mainCurrency]}) <span className="text-slate-400 normal-case">(opcional)</span></label>
                        <input
                            type="number"
                            value={costUsdt} onChange={e => setCostUsdt(e.target.value)}
                            placeholder="Ej: 10.00"
                            className="w-full bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/20 p-4 rounded-xl font-bold text-rose-700 dark:text-rose-400 outline-none focus:ring-2 focus:ring-rose-500/30"
                        />
                        <p className="text-[9px] text-slate-400 mt-1 ml-1 leading-tight">¿Cuanto te costo este producto al mayor?<br />Llenarlo te permite calcular tus ganancias exactas en la <b>Zona Revendedor</b>.</p>
                    </div>

                    {/* Multi-Currency Editor */}
                    {parsedPrice > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <ArrowRightLeft size={12} /> Conversiones <span className="text-[9px] font-normal normal-case">(toca un valor para editar)</span>
                            </p>

                            {/* Bs */}
                            <EditableRate
                                label="Total Bs"
                                value={totalBs}
                                prefix=""
                                color="text-slate-700 dark:text-white font-black"
                                onEdit={(bs) => setFromBs(bs)}
                            />

                            {/* COP (only if not mainCurrency) */}
                            {mainCurrency !== 'COP_COL' && rates?.cop?.price > 0 && (
                                <EditableRate
                                    label="Peso COP"
                                    value={refCop}
                                    prefix="COP "
                                    color="text-amber-600 dark:text-amber-400"
                                    onEdit={(cop) => setFromBs(cop * rates.cop.price)}
                                />
                            )}

                            {/* USDT (only if not mainCurrency) */}
                            {mainCurrency !== 'USDT' && (
                                <EditableRate
                                    label="USDT"
                                    value={usdtBase}
                                    prefix=""
                                    color="text-brand-dark"
                                    onEdit={(usdt) => setFromBs(usdt * effectiveUsdtRate)}
                                />
                            )}

                            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />

                            {/* BCV */}
                            <EditableRate
                                label="Ref. Dolar (BCV)"
                                value={refBcv}
                                prefix="$"
                                color="text-emerald-600 dark:text-emerald-400"
                                onEdit={(bcv) => setFromBs(bcv * rates.bcv.price)}
                            />

                            {/* EUR */}
                            <EditableRate
                                label="Ref. Euro (BCV)"
                                value={refEur}
                                prefix="€"
                                color="text-slate-500"
                                onEdit={(eur) => setFromBs(eur * rates.euro.price)}
                            />

                            <p className="text-[8px] text-slate-400 text-center mt-2">Tasa USDT: {formatBs(effectiveUsdtRate)} Bs</p>
                        </div>
                    )}
                </div>

                <button onClick={handleSave} className="w-full bg-brand text-slate-900 py-4 rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-brand/20 active:scale-95 transition-transform">
                    {editingId ? "Actualizar Producto" : "Guardar Producto"}
                </button>
            </div>
        </Modal>
    );
};
