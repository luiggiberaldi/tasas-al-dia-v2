import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Share2 } from 'lucide-react';
import { formatBs, formatUsd, smartCashRounding } from '../utils/calculatorUtils';

// Readable toggle labels
const TOGGLE_MAP = {
    showUsdt: { label: 'USDT', icon: '₮' },
    showEfectivo: { label: 'Efectivo', icon: '$' },
    showBs: { label: 'Bolivares', icon: 'Bs' },
    showRefBcv: { label: 'Dolar BCV', icon: '$' },
    showRefEuro: { label: 'Euro BCV', icon: '€' },
    showCop: { label: 'Peso COP', icon: 'COP' },
};

export const ProductShareModal = ({ isOpen, onClose, product, rates, accounts, streetRate, mainCurrency }) => {
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [config, setConfig] = useState({
        showUsdt: true,
        showEfectivo: true,
        showBs: true,
        showRefBcv: false,
        showRefEuro: false,
        showCop: false,
    });

    useEffect(() => {
        if (isOpen && accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(accounts[0].id);
        }
    }, [isOpen, accounts]);

    if (!product) return null;

    const valBs = product.priceUsdt * rates.usdt.price;
    const valEfectivo = streetRate > 0
        ? smartCashRounding(valBs / streetRate)
        : Math.ceil(product.priceUsdt);

    // Presets
    const presets = [
        { id: 'market', label: 'Mercado', color: 'indigo', apply: { showUsdt: true, showEfectivo: true, showBs: true, showRefBcv: false, showRefEuro: false, showCop: false } },
        { id: 'fiscal', label: 'Fiscal', color: 'slate', apply: { showUsdt: false, showEfectivo: false, showBs: true, showRefBcv: true, showRefEuro: false, showCop: false } },
        { id: 'efectivo', label: 'Efectivo', color: 'emerald', apply: { showUsdt: false, showEfectivo: true, showBs: false, showRefBcv: false, showRefEuro: false, showCop: false } },
        { id: 'colombia', label: 'Colombia', color: 'amber', apply: { showUsdt: true, showEfectivo: false, showBs: false, showRefBcv: false, showRefEuro: false, showCop: true } },
    ];

    const generateMessage = () => {
        const lines = [];
        lines.push(`*${product.name.toUpperCase()}*`);
        lines.push('');
        lines.push('PRECIO:');

        if (config.showUsdt) lines.push(`USDT: ${formatUsd(product.priceUsdt)}`);
        if (config.showEfectivo) lines.push(`Efectivo: $${valEfectivo}`);
        if (config.showBs) lines.push(`Bs: ${formatBs(valBs)}`);

        if (config.showRefBcv) {
            const refBcv = valBs / rates.bcv.price;
            lines.push(`Ref. BCV: $${formatUsd(refBcv).replace('$', '')}`);
        }
        if (config.showRefEuro) {
            const refEur = valBs / rates.euro.price;
            lines.push(`Ref. Euro: ${formatUsd(refEur).replace('$', '')} EUR`);
        }
        if (config.showCop && rates?.cop?.price > 0) {
            const refCop = valBs / rates.cop.price;
            lines.push(`COP: ${Math.round(refCop).toLocaleString()}`);
        }

        lines.push('');

        if (selectedAccountId) {
            const acc = accounts.find(a => a.id === selectedAccountId);
            if (acc) {
                const d = acc.data || acc;
                lines.push(`DATOS DE PAGO:`);
                lines.push(`*${acc.alias || 'Cuenta'}*`);

                if (acc.type === 'pago_movil') {
                    lines.push(`Banco: ${d.bankName || d.bank || 'Banco'}`);
                    lines.push(`Tel: ${d.phone}`);
                    lines.push(`CI: ${d.docId || d.id}`);
                } else if (acc.type === 'transfer' || acc.type === 'transferencia') {
                    lines.push(`Banco: ${d.bankName || d.bank || ''}`);
                    lines.push(`Cuenta: ${d.accountNumber}`);
                    lines.push(`Titular: ${d.holder}`);
                    lines.push(`CI/RIF: ${d.docId || d.id}`);
                } else if (acc.type === 'binance') {
                    lines.push(`Email: ${d.email}`);
                    if (d.payId) lines.push(`ID: ${d.payId}`);
                } else if (acc.type === 'nequi') {
                    lines.push(`Celular: ${d.phone}`);
                    lines.push(`Titular: ${d.holder}`);
                    if (d.email) lines.push(`Correo: ${d.email}`);
                } else if (acc.type === 'zelle') {
                    lines.push(`Email: ${d.email}`);
                    lines.push(`Titular: ${d.holder}`);
                }
            }
        }

        return lines.join('\n');
    };

    const handleShare = async () => {
        const text = generateMessage();

        const dataURLtoFile = (dataurl, filename) => {
            let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
                bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
            while (n--) u8arr[n] = bstr.charCodeAt(n);
            return new File([u8arr], filename, { type: mime });
        };

        try {
            if (navigator.share && product.image) {
                const imageFile = dataURLtoFile(product.image, `${product.name.replace(/\s+/g, '_')}.webp`);
                if (navigator.canShare && navigator.canShare({ files: [imageFile] })) {
                    await navigator.share({ text, files: [imageFile] });
                    return;
                }
            }
        } catch (error) {
            console.error("Error sharing with image:", error);
        }

        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const presetColors = {
        indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800',
        slate: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800',
        amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800',
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cotizacion Flash">
            <div className="space-y-5">

                {/* Presets */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-wider">Modo de Cotizacion</label>
                    <div className="grid grid-cols-4 gap-2">
                        {presets.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setConfig(p.apply)}
                                className={`py-2.5 px-2 rounded-xl text-[10px] font-bold border transition-all active:scale-95 ${presetColors[p.color]}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Toggles */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-wider">Incluir en mensaje</label>
                    <div className="flex flex-wrap gap-1.5">
                        {Object.entries(TOGGLE_MAP).map(([key, meta]) => (
                            <button
                                key={key}
                                onClick={() => setConfig(prev => ({ ...prev, [key]: !prev[key] }))}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${config[key]
                                    ? 'bg-brand/10 border-brand/50 text-brand-dark dark:text-brand'
                                    : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-400'
                                    }`}
                            >
                                <span className="text-[9px] opacity-60">{meta.icon}</span>
                                {meta.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cuenta */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block tracking-wider">Cuenta Receptora</label>
                    {accounts.length === 0 ? (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-500 text-center">
                            No tienes cuentas guardadas aun.
                        </div>
                    ) : (
                        <select
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-xs font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-brand/50 border border-slate-200 dark:border-slate-700"
                        >
                            <option value="">-- Sin datos de pago --</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.type === 'pago_movil' ? '📱' : acc.type === 'binance' ? '🟡' : acc.type === 'nequi' ? '💚' : acc.type === 'zelle' ? '💜' : '🏦'} {acc.alias}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Vista Previa */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/30 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                    <p className="text-[9px] text-slate-400 mb-2 uppercase font-bold tracking-wider">Vista Previa</p>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                        {generateMessage()}
                    </p>
                </div>

                {/* Accion */}
                <button
                    onClick={handleShare}
                    className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-green-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <Share2 size={18} /> Enviar WhatsApp
                </button>

            </div>
        </Modal>
    );
};
