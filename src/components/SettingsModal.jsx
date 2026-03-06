import React, { useState, useRef } from 'react';
import { Upload, Download, AlertTriangle, Check, X, Database, Globe, Fingerprint, Copy } from 'lucide-react';
import { storageService } from '../utils/storageService';
import { useBusinessCurrency } from '../hooks/useBusinessCurrency';
import { CURRENCIES } from '../utils/currencyUtils';

import { useSecurity } from '../hooks/useSecurity';

export default function SettingsModal({ isOpen, onClose }) {
    const [importStatus, setImportStatus] = useState(null); // 'success', 'error', 'loading'
    const [statusMessage, setStatusMessage] = useState('');
    const fileInputRef = useRef(null);
    const { mainCurrency, updateMainCurrency, parityMode, updateParityMode } = useBusinessCurrency();
    const { deviceId } = useSecurity();
    const [idCopied, setIdCopied] = useState(false);

    if (!isOpen) return null;

    // --- EXPORTAR BACKUP ---
    const handleExport = async () => {
        try {
            setImportStatus('loading');
            setStatusMessage('Generando backup (puede tomar unos segundos)...');

            const products = await storageService.getItem('my_products_v1', []);
            const accounts = await storageService.getItem('my_accounts_v2', []);

            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                data: {
                    my_products_v1: JSON.stringify(products), // Lo stringificamos para mantener formato legacy
                    my_accounts_v2: JSON.stringify(accounts),
                    premium_token: localStorage.getItem('premium_token'),
                    // [NEW] Manual Rates & Config
                    street_rate_bs: localStorage.getItem('street_rate_bs'),
                    catalog_use_auto_usdt: localStorage.getItem('catalog_use_auto_usdt'),
                    catalog_custom_usdt_price: localStorage.getItem('catalog_custom_usdt_price'),
                    catalog_show_cash_price: localStorage.getItem('catalog_show_cash_price'),
                    monitor_rates_v12: localStorage.getItem('monitor_rates_v12'),
                    business_main_currency: localStorage.getItem('business_main_currency')
                }
            };

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_tasasaldia_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setStatusMessage('Backup descargado correctamente.');
            setImportStatus('success');
            setTimeout(() => setImportStatus(null), 3000);
        } catch (error) {
            console.error(error);
            setStatusMessage('Error al generar backup.');
            setImportStatus('error');
        }
    };

    // --- IMPORTAR BACKUP ---
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                setImportStatus('loading');
                setStatusMessage('Restaurando datos...');
                const json = JSON.parse(e.target.result);

                // Validación simple
                if (!json.data || (!json.data.my_products_v1 && !json.data.my_accounts_v2)) {
                    throw new Error('Formato de archivo inválido.');
                }

                // Restaurar datos pesados en IndexedDB
                if (json.data.my_products_v1) {
                    await storageService.setItem('my_products_v1', typeof json.data.my_products_v1 === 'string' ? JSON.parse(json.data.my_products_v1) : json.data.my_products_v1);
                }
                if (json.data.my_accounts_v2) {
                    await storageService.setItem('my_accounts_v2', typeof json.data.my_accounts_v2 === 'string' ? JSON.parse(json.data.my_accounts_v2) : json.data.my_accounts_v2);
                }
                // NOTA: premium_token y device_id NO se restauran desde el backup.
                // El token de licencia está criptográficamente ligado al device_id de ESTE dispositivo.
                // Sobreescribirlos invalidaría la licencia activa en este equipo.

                // [NEW] Restaurar Tasas Manuales y Config
                if (json.data.street_rate_bs) localStorage.setItem('street_rate_bs', json.data.street_rate_bs);
                if (json.data.catalog_use_auto_usdt) localStorage.setItem('catalog_use_auto_usdt', json.data.catalog_use_auto_usdt);
                if (json.data.catalog_custom_usdt_price) localStorage.setItem('catalog_custom_usdt_price', json.data.catalog_custom_usdt_price);
                if (json.data.catalog_show_cash_price) localStorage.setItem('catalog_show_cash_price', json.data.catalog_show_cash_price);
                if (json.data.monitor_rates_v12) localStorage.setItem('monitor_rates_v12', json.data.monitor_rates_v12);
                if (json.data.business_main_currency) {
                    localStorage.setItem('business_main_currency', json.data.business_main_currency);
                    updateMainCurrency(json.data.business_main_currency);
                }

                setImportStatus('success');
                setStatusMessage('Datos restaurados. Recargando...');

                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (error) {
                console.error(error);
                setImportStatus('error');
                setStatusMessage('Error: El archivo no es válido.');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Database size={18} className="text-slate-500" />
                        Gestión de Datos
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <X size={18} className="text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">

                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-lg flex gap-3">
                        <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                            <strong>Importante:</strong> Al importar un backup, los datos actuales de productos y cuentas serán reemplazados.
                        </p>
                    </div>

                    <div className="grid gap-3">
                        <button
                            onClick={handleExport}
                            className="w-full flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
                        >
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                                <Download size={20} className="text-blue-500 dark:text-blue-400" />
                            </div>
                            <div className="text-left flex-1 pl-1">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Exportar Backup</p>
                                <p className="text-[10px] text-slate-400">Descargar archivo .json</p>
                            </div>
                        </button>

                        <button
                            onClick={handleImportClick}
                            className="w-full flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
                        >
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors">
                                <Upload size={20} className="text-emerald-500 dark:text-emerald-400" />
                            </div>
                            <div className="text-left flex-1 pl-1">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Importar Backup</p>
                                <p className="text-[10px] text-slate-400">Restaurar desde archivo</p>
                            </div>
                        </button>
                    </div>

                    {/* Hidden Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".json"
                        className="hidden"
                    />

                    {/* Moneda de negocio */}
                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Globe size={14} className="text-amber-500" />
                            Moneda de trabajo
                        </label>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            Define si piensas tus precios y ganancias en USDT, Dólar, Euro o Peso COP. Los equivalentes en Bolívares se calculan automáticamente.
                        </p>
                        <div className="flex gap-2">
                            {[
                                {
                                    id: 'USDT',
                                    label: 'USDT',
                                    icon: (
                                        <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="16" cy="16" r="15" fill="#26A17B" />
                                            <path d="M17.9 17.2v-.01c-.1.01-1.02.07-1.9.07-.74 0-1.73-.05-1.9-.07v.01c-3.4-.15-5.95-.75-5.95-1.47s2.55-1.32 5.95-1.47v2.35c.18.01 1.17.07 1.91.07.89 0 1.72-.06 1.89-.07v-2.35c3.39.15 5.93.75 5.93 1.47s-2.54 1.32-5.93 1.47zM17.9 13.4v-2.1H22V8.5H10v2.8h4.1v2.1c-3.83.18-6.7.94-6.7 1.85s2.87 1.67 6.7 1.85v6.6h3.8v-6.6c3.82-.18 6.68-.94 6.68-1.85s-2.86-1.67-6.68-1.85z" fill="white" />
                                        </svg>
                                    ),
                                },
                                {
                                    id: 'USD_BCV',
                                    label: 'Dólar',
                                    icon: (
                                        <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="16" cy="16" r="15" fill="#2563EB" />
                                            <text x="16" y="21" textAnchor="middle" fontSize="16" fontWeight="bold" fontFamily="Georgia, serif" fill="white">$</text>
                                        </svg>
                                    ),
                                },
                                {
                                    id: 'EUR_BCV',
                                    label: 'Euro',
                                    icon: (
                                        <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="16" cy="16" r="15" fill="#4F46E5" />
                                            <text x="16" y="21" textAnchor="middle" fontSize="16" fontWeight="bold" fontFamily="Georgia, serif" fill="white">€</text>
                                        </svg>
                                    ),
                                },
                                {
                                    id: 'COP_COL',
                                    label: 'COP',
                                    icon: (
                                        <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="16" cy="16" r="15" fill="#FCD116" />
                                            <path d="M1 16h30" stroke="#003893" strokeWidth="3" />
                                            <path d="M1 22h30" stroke="#CE1126" strokeWidth="3" />
                                        </svg>
                                    ),
                                }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => updateMainCurrency(opt.id)}
                                    className={`flex-1 py-3 rounded-xl border transition-all active:scale-[0.97] flex flex-col items-center justify-center gap-1 ${mainCurrency === opt.id
                                        ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-md shadow-amber-500/20'
                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-500/40'
                                        }`}
                                >
                                    <span className="block mb-1 flex justify-center">{opt.icon}</span>
                                    <span className="text-[11px] font-bold">{opt.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Paridad Toggle */}
                        {mainCurrency !== 'USDT' && (
                            <div className="mt-4 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2">
                                <div>
                                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Paridad con USDT (1:1)</p>
                                    <p className="text-[9px] text-slate-400 mt-0.5">Muestra el símbolo, pero calcula con la tasa USDT.</p>
                                </div>
                                <button
                                    onClick={() => updateParityMode(!parityMode)}
                                    className={`relative w-9 h-5 rounded-full transition-colors ${parityMode ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                >
                                    <span className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${parityMode ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Device ID para soporte */}
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl">
                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-1 flex items-center gap-1">
                            <Fingerprint size={10} /> ID de Instalación
                        </p>
                        <div className="flex items-center justify-between gap-2">
                            <p className="font-mono text-xs font-black text-slate-600 dark:text-slate-300 select-all">{deviceId || '...'}</p>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(deviceId).then(() => {
                                        setIdCopied(true);
                                        setTimeout(() => setIdCopied(false), 2000);
                                    });
                                }}
                                className="text-slate-400 hover:text-amber-500 transition-colors p-1 rounded"
                            >
                                {idCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                            </button>
                        </div>
                        <p className="text-[8px] text-slate-400 mt-1">Comparte este ID si necesitas soporte técnico.</p>
                    </div>

                    {/* Status Feedback */}
                    {importStatus && (
                        <div className={`mt-2 p-2 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-2 ${importStatus === 'success'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                            {importStatus === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
                            {statusMessage}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
