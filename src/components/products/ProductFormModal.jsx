import React from 'react';
import { Camera, X, Banknote } from 'lucide-react';
import { Modal } from '../Modal';
import { formatBs, formatUsd } from '../../utils/calculatorUtils';
import { CURRENCIES, currencySymbol, fromBaseUsd, toBaseUsd } from '../../utils/currencyUtils';

/**
 * Modal para añadir / editar un producto del catálogo.
 */
export const ProductFormModal = ({
    isOpen, onClose, editingId,
    // Form state
    name, setName,
    priceUsdt, costUsdt, setCostUsdt,
    priceEfectivo, image, setImage,
    fileInputRef,
    // Handlers
    handleImageUpload, handleSave,
    handleEfectivoChange, handleUsdtChange,
    // Config
    showCashPrice, effectiveUsdtRate,
    rates, mainCurrency,
}) => (
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

                {/* Inputs de Precio (Efectivo vs USDT) */}
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
                    <p className="text-[9px] text-slate-400 mt-1 ml-1 leading-tight">¿Cuánto te costó este producto al mayor?<br />Llenarlo te permite calcular tus ganancias exactas en la <b>Zona Revendedor</b>.</p>
                </div>

                {/* Live Conversion Preview */}
                {priceUsdt && !isNaN(priceUsdt) && parseFloat(priceUsdt) > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Previsualización</p>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Total Bs:</span>
                            <span className="font-black text-slate-700 dark:text-white">{formatBs(toBaseUsd(parseFloat(priceUsdt) || 0, mainCurrency, rates) * effectiveUsdtRate)} Bs</span>
                        </div>
                        {mainCurrency !== 'USDT' && rates?.usdt?.price > 0 && (
                            <div className="flex justify-between items-center text-xs text-slate-400">
                                <span>{CURRENCIES[mainCurrency]}:</span>
                                <span className="font-mono text-brand-dark font-bold">{currencySymbol(mainCurrency)}{fromBaseUsd(parseFloat(priceUsdt) || 0, mainCurrency, rates).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-xs text-slate-400">
                            <span>Tasa USDT (Efectiva):</span>
                            <span className="font-mono">{formatBs(effectiveUsdtRate)}</span>
                        </div>
                        <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                        <div className="flex justify-between items-center text-xs text-slate-400">
                            <span>Ref. Dolar (BCV):</span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">${formatUsd((toBaseUsd(parseFloat(priceUsdt) || 0, mainCurrency, rates) * effectiveUsdtRate) / rates.bcv.price).replace('$', '')}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-400">
                            <span>Ref. Euro (BCV):</span>
                            <span className="font-mono">€{formatUsd((toBaseUsd(parseFloat(priceUsdt) || 0, mainCurrency, rates) * effectiveUsdtRate) / rates.euro.price).replace('$', '').replace('€', '')}</span>
                        </div>
                    </div>
                )}
            </div>

            <button onClick={handleSave} className="w-full bg-brand text-slate-900 py-4 rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-brand/20 active:scale-95 transition-transform">
                {editingId ? "Actualizar Producto" : "Guardar Producto"}
            </button>
        </div>
    </Modal>
);
