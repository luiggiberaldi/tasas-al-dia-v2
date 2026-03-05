import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Send, CreditCard, X, QrCode, Crown } from 'lucide-react';
import { useSecurity } from '../hooks/useSecurity';
import { storageService } from '../utils/storageService';

// Extracted components
import { AccountCard } from '../components/wallet/AccountCard';
import { AccountFormModal } from '../components/wallet/AccountFormModal';

const INITIAL_FORM = {
    type: 'pago_movil',
    alias: '',
    bank: '',
    phone: '',
    id: '',
    email: '',
    holder: '',
    accountNumber: ''
};

export default function WalletView({ rates }) {
    const { isPremium } = useSecurity();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // Estado de Cuentas — loaded async from storageService (IndexedDB)
    const [accounts, setAccounts] = useState([]);
    const isLoaded = useRef(false);

    // Load accounts from storageService on mount
    useEffect(() => {
        let mounted = true;
        storageService.getItem('my_accounts_v2', []).then(saved => {
            if (mounted) {
                setAccounts(saved || []);
                isLoaded.current = true;
            }
        });
        return () => { mounted = false; };
    }, []);

    // Estados de Interfaz
    const [showForm, setShowForm] = useState(false);
    const [showShareModal, setShowShareModal] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [shareMode, setShareMode] = useState('text');

    // Estado del Formulario
    const [newAccount, setNewAccount] = useState(INITIAL_FORM);

    // Estado del Modal de Cobro
    const [amountBs, setAmountBs] = useState('');
    const [selectedRate, setSelectedRate] = useState('bcv');

    // Save accounts to storageService (IndexedDB) whenever they change
    useEffect(() => {
        if (isLoaded.current) {
            storageService.setItem('my_accounts_v2', accounts);
        }
    }, [accounts]);

    // --- LÓGICA CRUD ---
    const openCreateModal = () => {
        if (!isPremium && accounts.length >= 2) {
            setShowUpgradeModal(true);
            return;
        }
        setEditingId(null);
        setNewAccount(INITIAL_FORM);
        setShowForm(true);
    };

    const openEditModal = (acc, e) => {
        e.stopPropagation();
        setEditingId(acc.id_gen);
        setNewAccount(acc);
        setShowForm(true);
    };

    const handleSaveAccount = (e) => {
        e.preventDefault();
        if (editingId) {
            setAccounts(accounts.map(acc =>
                acc.id_gen === editingId ? { ...newAccount, id_gen: editingId } : acc
            ));
        } else {
            setAccounts([...accounts, { ...newAccount, id_gen: Date.now() }]);
        }
        setShowForm(false);
        setEditingId(null);
    };

    const handleDelete = (id, e) => {
        e.stopPropagation();
        setDeleteConfirmId(id);
    };

    const confirmDelete = () => {
        if (deleteConfirmId) {
            setAccounts(accounts.filter(a => a.id_gen !== deleteConfirmId));
            setDeleteConfirmId(null);
        }
    };

    // --- HELPERS ---
    const getQRData = (account) => {
        if (account.type === 'pago_movil') return `PAGO MÓVIL\nBanco: ${account.bank}\nTel: ${account.phone}\nCI: ${account.id}\nTitular: ${account.holder}`;
        if (account.type === 'transferencia') return `TRANSFERENCIA\nBanco: ${account.bank}\nCuenta: ${account.accountNumber}\nRIF/CI: ${account.id}\nTitular: ${account.holder}`;
        if (account.type === 'zelle') return `ZELLE\nEmail: ${account.email}\nTitular: ${account.holder}`;
        if (account.type === 'binance') return `BINANCE PAY\nID/Email: ${account.email}\nAlias: ${account.holder || account.alias}`;
        return "Datos de cuenta";
    };

    const handleShare = () => {
        const account = showShareModal;
        let message = "";
        const fmt = (n) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(n);

        if (account.type === 'pago_movil') {
            message = `📌 *Datos Pago Móvil*\n\n🏦 Banco: ${account.bank}\n📱 Teléfono: ${account.phone}\n🆔 C.I: ${account.id}\n👤 Titular: ${account.holder || account.alias}\n\n`;
            if (amountBs) message += `💰 Monto a pagar: ${fmt(amountBs)} Bs`;
        } else if (account.type === 'transferencia') {
            message = `🏦 *Datos Transferencia*\n\n🏛️ Banco: ${account.bank}\n🔢 Cuenta: ${account.accountNumber}\n🆔 C.I/RIF: ${account.id}\n👤 Titular: ${account.holder}\n\n`;
            if (amountBs) message += `💰 Monto a pagar: ${fmt(amountBs)} Bs`;
        } else if (account.type === 'zelle') {
            message = `🇺🇸 *Datos Zelle*\n\n✉️ Correo: ${account.email}\n👤 Titular: ${account.holder}\n\n`;
            if (amountBs && rates) {
                const rateVal = selectedRate === 'bcv' ? rates.bcv.price : rates.usdt.price;
                if (rateVal > 0) {
                    const amountUSD = parseFloat(amountBs) / rateVal;
                    message += `💵 Monto a enviar: $${amountUSD.toFixed(2)}\n(Ref: ${fmt(amountBs)} Bs a tasa ${selectedRate.toUpperCase()} ${fmt(rateVal)})`;
                }
            }
        } else if (account.type === 'binance') {
            message = `🟡 *Datos Binance Pay*\n\n🆔 Pay ID / Correo: ${account.email}\n👤 Alias: ${account.holder || account.alias}\n\n`;
            if (amountBs && rates) {
                const rateVal = selectedRate === 'bcv' ? rates.bcv.price : rates.usdt.price;
                if (rateVal > 0) {
                    const amountUSD = parseFloat(amountBs) / rateVal;
                    message += `💵 Monto a enviar: ${amountUSD.toFixed(2)} USDT\n(Ref: ${fmt(amountBs)} Bs a tasa ${selectedRate.toUpperCase()} ${fmt(rateVal)})`;
                }
            }
        }

        message += `\n\n📸 *Por favor enviar capture del comprobante de pago.*`;

        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
        setShowShareModal(null);
        setAmountBs('');
    };

    return (
        <div className="space-y-6 pt-6">

            {/* CABECERA */}
            <div className="flex justify-between items-center mb-4 px-2">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Mis Cuentas</h2>
                    <p className="text-xs font-medium text-slate-400">Guarda y comparte tus datos de pago</p>
                </div>
                <button onClick={openCreateModal} className="p-3 bg-brand hover:bg-brand-dark text-slate-900 rounded-xl shadow-lg shadow-brand/20 active:scale-95 transition-all">
                    <Plus size={24} strokeWidth={2.5} />
                </button>
            </div>

            {/* LISTA DE CUENTAS */}
            <div className="space-y-3 pb-20">
                {accounts.length === 0 ? (
                    <div className="text-center py-10 opacity-50">
                        <CreditCard size={48} className="mx-auto mb-3 text-slate-300" />
                        <p className="text-sm text-slate-500">No tienes cuentas guardadas.</p>
                    </div>
                ) : (
                    accounts.map(acc => (
                        <AccountCard
                            key={acc.id_gen}
                            account={acc}
                            onSelect={(a) => { setShowShareModal(a); setShareMode('text'); }}
                            onEdit={openEditModal}
                            onDelete={handleDelete}
                        />
                    ))
                )}
            </div>

            {/* FORMULARIO (CREAR / EDITAR) */}
            <AccountFormModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                editingId={editingId}
                formData={newAccount}
                setFormData={setNewAccount}
                onSubmit={handleSaveAccount}
            />

            {/* MODAL COBRO */}
            {showShareModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-200 max-h-[90dvh] overflow-y-auto">

                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white">Cobrar con {showShareModal.alias}</h3>
                                <p className="text-xs text-slate-400">Selecciona el método de visualización</p>
                            </div>
                            <button onClick={() => setShowShareModal(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X size={18} /></button>
                        </div>

                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
                            <button
                                onClick={() => setShareMode('text')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${shareMode === 'text' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-400'}`}
                            >
                                <Send size={14} /> WhatsApp
                            </button>
                            <button
                                onClick={() => setShareMode('qr')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${shareMode === 'qr' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-400'}`}
                            >
                                <QrCode size={14} /> Código QR
                            </button>
                        </div>

                        {shareMode === 'text' ? (
                            <div className="space-y-4 animate-in fade-in pb-2">
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Bs</span>
                                    <input type="number" autoFocus placeholder="Monto (Opcional)" value={amountBs} onChange={e => setAmountBs(e.target.value)} className="w-full pl-12 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-lg font-bold outline-none focus:ring-2 focus:ring-brand" />
                                </div>

                                {(showShareModal.type === 'zelle' || showShareModal.type === 'binance') && amountBs && rates && (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-3">
                                        <p className="text-xs font-bold text-slate-500 uppercase">Calcular a Tasa:</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => setSelectedRate('bcv')} className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${selectedRate === 'bcv' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-500' : 'bg-white dark:bg-slate-800 border-transparent text-slate-400'}`}>🏛️ BCV ({rates.bcv.price})</button>
                                            <button onClick={() => setSelectedRate('usdt')} className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${selectedRate === 'usdt' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-500' : 'bg-white dark:bg-slate-800 border-transparent text-slate-400'}`}>📈 USDT ({rates.usdt.price})</button>
                                        </div>
                                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                            <span className="text-xs text-slate-500">Recibirás ({showShareModal.type === 'binance' ? 'USDT' : 'USD'}):</span>
                                            <span className="text-xl font-black text-slate-800 dark:text-white">
                                                {(parseFloat(amountBs) / (selectedRate === 'bcv' ? rates.bcv.price : rates.usdt.price)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <button onClick={handleShare} className="w-full py-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 mt-2">
                                    <Send size={20} /> Compartir por WhatsApp
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center space-y-4 py-4 animate-in fade-in slide-in-from-right-4 pb-6">
                                <div className="bg-white p-4 rounded-2xl shadow-inner border border-slate-200">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getQRData(showShareModal))}&color=0f172a&bgcolor=ffffff`}
                                        alt="Código QR de Pago"
                                        className="w-48 h-48 mix-blend-multiply"
                                    />
                                </div>
                                <p className="text-xs text-center text-slate-400 max-w-[200px]">
                                    Muestra este código a tu cliente para que lo escanee directamente.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de confirmación de eliminación */}
            {deleteConfirmId && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                                <Trash2 size={28} className="text-red-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white">¿Eliminar cuenta?</h4>
                                <p className="text-xs text-slate-400 mt-1">Esta acción no se puede deshacer.</p>
                            </div>
                            <div className="flex gap-3 w-full pt-1">
                                <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-3 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl active:scale-95 transition-all"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .input-std { width: 100%; padding: 12px; border-radius: 12px; font-size: 14px; outline: none; transition: all; }
                .input-std { background-color: rgb(248 250 252); border: 1px solid rgb(226 232 240); }
                .dark .input-std { background-color: rgb(2 6 23); border: 1px solid rgb(30 41 59); color: white; }
                .input-std:focus { border-color: #FACC15; ring: 2px; }
            `}</style>

            {/* Modal Upgrade Premium */}
            {showUpgradeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl p-6 max-w-xs text-center animate-in zoom-in-95 duration-200">
                        <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-3">
                            <Crown size={24} className="text-amber-500" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">Límite Alcanzado</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                            La versión gratuita permite <strong>2 cuentas</strong>. Con <strong>TasasAlDía Business</strong> puedes agregar cuentas ilimitadas.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowUpgradeModal(false)}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => {
                                    const msg = `Hola! Me interesa la licencia Premium de TasasAlDía para agregar más cuentas de pago.`;
                                    window.open(`https://wa.me/584124051793?text=${encodeURIComponent(msg)}`, '_blank');
                                }}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-[#10B981] shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
                            >
                                Solicitar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}