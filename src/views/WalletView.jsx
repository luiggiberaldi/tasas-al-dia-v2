import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Send, CreditCard, User, Landmark, Mail, DollarSign, X, Bitcoin, Smartphone, Copy } from 'lucide-react';

export default function WalletView({ rates }) {
  // Estado de Cuentas
  const [accounts, setAccounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('my_accounts_v2')) || []; } 
    catch { return []; }
  });

  // Estados de Interfaz
  const [showForm, setShowForm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(null); 
  
  // Estado del Formulario
  const [newAccount, setNewAccount] = useState({ 
    type: 'pago_movil', 
    alias: '', 
    bank: '', 
    phone: '', 
    id: '', 
    email: '', 
    holder: '', 
    accountNumber: '' 
  });

  // Estado del Modal de Cobro
  const [amountBs, setAmountBs] = useState('');
  const [selectedRate, setSelectedRate] = useState('bcv'); // 'bcv' o 'usdt'

  useEffect(() => {
    localStorage.setItem('my_accounts_v2', JSON.stringify(accounts));
  }, [accounts]);

  // --- LÓGICA CRUD ---
  const handleAddAccount = (e) => {
    e.preventDefault();
    setAccounts([...accounts, { ...newAccount, id_gen: Date.now() }]);
    setShowForm(false);
    // Resetear formulario
    setNewAccount({ type: 'pago_movil', alias: '', bank: '', phone: '', id: '', email: '', holder: '', accountNumber: '' });
  };

  const handleDelete = (id) => {
    if (confirm('¿Eliminar esta cuenta?')) {
        setAccounts(accounts.filter(a => a.id_gen !== id));
    }
  };

  // --- GENERADOR DE MENSAJES WHATSAPP ---
  const handleShare = () => {
    const account = showShareModal;
    let message = "";
    const fmt = (n) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(n);

    // 1. PAGO MÓVIL
    if (account.type === 'pago_movil') {
        message = `📌 *Datos Pago Móvil*\n\n🏦 Banco: ${account.bank}\n📱 Teléfono: ${account.phone}\n🆔 C.I: ${account.id}\n👤 Titular: ${account.holder || account.alias}\n\n`;
        if (amountBs) message += `💰 Monto a pagar: ${fmt(amountBs)} Bs`;
    
    // 2. TRANSFERENCIA BANCARIA
    } else if (account.type === 'transferencia') {
        message = `🏦 *Datos Transferencia*\n\n🏛️ Banco: ${account.bank}\n🔢 Cuenta: ${account.accountNumber}\n🆔 C.I/RIF: ${account.id}\n👤 Titular: ${account.holder}\n\n`;
        if (amountBs) message += `💰 Monto a pagar: ${fmt(amountBs)} Bs`;

    // 3. ZELLE (Con Calculadora)
    } else if (account.type === 'zelle') {
        message = `🇺🇸 *Datos Zelle*\n\n✉️ Correo: ${account.email}\n👤 Titular: ${account.holder}\n\n`;
        if (amountBs && rates) {
            const rateVal = selectedRate === 'bcv' ? rates.bcv.price : rates.usdt.price;
            if (rateVal > 0) {
                const amountUSD = parseFloat(amountBs) / rateVal;
                message += `💵 Monto a enviar: $${amountUSD.toFixed(2)}\n(Ref: ${fmt(amountBs)} Bs a tasa ${selectedRate.toUpperCase()} ${fmt(rateVal)})`;
            }
        }

    // 4. BINANCE (Con Calculadora)
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

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setShowShareModal(null);
    setAmountBs('');
  };

  // --- RENDERIZADO DE ICONOS ---
  const getIcon = (type) => {
    switch(type) {
        case 'zelle': return <DollarSign size={20} />;
        case 'binance': return <Bitcoin size={20} />;
        case 'transferencia': return <Landmark size={20} />;
        default: return <Smartphone size={20} />;
    }
  };

  const getColor = (type) => {
    switch(type) {
        case 'zelle': return 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400';
        case 'binance': return 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400';
        case 'transferencia': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
        default: return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-6">
      
      {/* CABECERA */}
      <div className="flex justify-between items-center mb-4 px-2">
        <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Mis Cuentas</h2>
            <p className="text-xs font-medium text-slate-400">Guarda y comparte tus datos de pago</p>
        </div>
        <button onClick={() => setShowForm(true)} className="p-3 bg-brand hover:bg-brand-dark text-slate-900 rounded-xl shadow-lg shadow-brand/20 active:scale-95 transition-all">
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
                <div key={acc.id_gen} onClick={() => setShowShareModal(acc)} className="relative group bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${getColor(acc.type)}`}>
                                {getIcon(acc.type)}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white capitalize">{acc.alias}</h3>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{acc.type.replace('_', ' ')}</p>
                            </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(acc.id_gen); }} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                            <Trash2 size={16} />
                        </button>
                    </div>
                    
                    {/* DETALLES EN TARJETA */}
                    <div className="space-y-1 pl-1">
                        {(acc.type === 'pago_movil') && <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{acc.bank} • {acc.phone}</p>}
                        {(acc.type === 'transferencia') && <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{acc.bank} • {acc.accountNumber.slice(0,4)}...{acc.accountNumber.slice(-4)}</p>}
                        {(acc.type === 'zelle') && <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{acc.email}</p>}
                        {(acc.type === 'binance') && <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{acc.email}</p>}
                        
                        <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{acc.holder || acc.id}</p>
                    </div>
                </div>
            ))
        )}
      </div>

      {/* --- FORMULARIO NUEVA CUENTA --- */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white">Nueva Cuenta</h3>
                    <button onClick={() => setShowForm(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X size={18}/></button>
                </div>

                <form onSubmit={handleAddAccount} className="space-y-4">
                    {/* SELECTOR DE TIPO (GRID 2x2) */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {[
                            {id: 'pago_movil', label: 'Pago Móvil'},
                            {id: 'transferencia', label: 'Transferencia'},
                            {id: 'zelle', label: 'Zelle'},
                            {id: 'binance', label: 'Binance'}
                        ].map(t => (
                            <button 
                                key={t.id}
                                type="button" 
                                onClick={() => setNewAccount({...newAccount, type: t.id})} 
                                className={`py-3 rounded-xl text-xs font-bold transition-all border ${newAccount.type === t.id ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <input required placeholder="Alias (Ej: Personal, Bodega)" value={newAccount.alias} onChange={e => setNewAccount({...newAccount, alias: e.target.value})} className="input-std" />

                    {/* CAMPOS DINÁMICOS */}
                    {(newAccount.type === 'pago_movil' || newAccount.type === 'transferencia') && (
                        <input required placeholder="Banco" value={newAccount.bank} onChange={e => setNewAccount({...newAccount, bank: e.target.value})} className="input-std" />
                    )}

                    {(newAccount.type === 'transferencia') && (
                         <input required type="number" placeholder="Número de Cuenta (20 dígitos)" value={newAccount.accountNumber} onChange={e => setNewAccount({...newAccount, accountNumber: e.target.value})} className="input-std" />
                    )}

                    {(newAccount.type === 'pago_movil') && (
                        <input required type="tel" placeholder="Teléfono" value={newAccount.phone} onChange={e => setNewAccount({...newAccount, phone: e.target.value})} className="input-std" />
                    )}

                    {(newAccount.type === 'pago_movil' || newAccount.type === 'transferencia') && (
                         <input required placeholder="Cédula / RIF" value={newAccount.id} onChange={e => setNewAccount({...newAccount, id: e.target.value})} className="input-std" />
                    )}

                    {(newAccount.type === 'zelle' || newAccount.type === 'binance') && (
                        <input required placeholder={newAccount.type === 'zelle' ? "Correo Electrónico" : "Correo o Pay ID"} value={newAccount.email} onChange={e => setNewAccount({...newAccount, email: e.target.value})} className="input-std" />
                    )}

                    <input required placeholder="Nombre del Titular" value={newAccount.holder} onChange={e => setNewAccount({...newAccount, holder: e.target.value})} className="input-std" />

                    <button type="submit" className="w-full py-4 bg-brand hover:bg-brand-dark text-slate-900 font-bold rounded-xl shadow-lg shadow-brand/20 mt-2">Guardar Cuenta</button>
                </form>
            </div>
        </div>
      )}

      {/* --- MODAL COBRO (SHARE) --- */}
      {showShareModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-200">
                 <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white">Cobrar con {showShareModal.alias}</h3>
                        <p className="text-xs text-slate-400">Genera un mensaje listo para WhatsApp</p>
                    </div>
                    <button onClick={() => setShowShareModal(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X size={18}/></button>
                </div>

                <div className="space-y-4">
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Bs</span>
                        <input type="number" autoFocus placeholder="Monto en Bolívares (Opcional)" value={amountBs} onChange={e => setAmountBs(e.target.value)} className="w-full pl-12 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-lg font-bold outline-none focus:ring-2 focus:ring-brand" />
                    </div>

                    {/* CALCULADORA DE DIVISAS (Solo Zelle y Binance) */}
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
            </div>
        </div>
      )}
      
      <style>{`
        .input-std { width: 100%; padding: 12px; border-radius: 12px; font-size: 14px; outline: none; transition: all; }
        .input-std { background-color: rgb(248 250 252); border: 1px solid rgb(226 232 240); }
        .dark .input-std { background-color: rgb(2 6 23); border: 1px solid rgb(30 41 59); color: white; }
        .input-std:focus { border-color: #FACC15; ring: 2px; }
      `}</style>
    </div>
  );
}