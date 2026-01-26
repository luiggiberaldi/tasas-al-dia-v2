import React, { useState, useRef } from 'react';
import { Upload, Download, AlertTriangle, Check, X, Database } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose }) {
    const [importStatus, setImportStatus] = useState(null); // 'success', 'error', 'loading'
    const [statusMessage, setStatusMessage] = useState('');
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    // --- EXPORTAR BACKUP ---
    const handleExport = () => {
        try {
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                data: {
                    my_products_v1: localStorage.getItem('my_products_v1'),
                    my_accounts_v2: localStorage.getItem('my_accounts_v2'),
                    premium_token: localStorage.getItem('premium_token')
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
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);

                // Validación simple
                if (!json.data || (!json.data.my_products_v1 && !json.data.my_accounts_v2)) {
                    throw new Error('Formato de archivo inválido.');
                }

                // Restaurar datos
                if (json.data.my_products_v1) localStorage.setItem('my_products_v1', json.data.my_products_v1);
                if (json.data.my_accounts_v2) localStorage.setItem('my_accounts_v2', json.data.my_accounts_v2);
                if (json.data.premium_token) localStorage.setItem('premium_token', json.data.premium_token);

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
