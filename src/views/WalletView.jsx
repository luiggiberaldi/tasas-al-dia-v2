import React, { useState } from 'react';
import { Plus, Trash2, Pencil, Smartphone, Building2, Bitcoin, X, Save, Wallet, CheckCircle2, Circle } from 'lucide-react';
import { VENEZUELA_BANKS } from '../data/banks'; 
import { useWallet } from '../hooks/useWallet';  

export default function WalletView() {
  // Importamos updateAccount del hook
  const { accounts, addAccount, removeAccount, updateAccount } = useWallet();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null); // Estado para saber qué ID estamos editando
  
  // Estado del Formulario
  const [type, setType] = useState('pago_movil');
  const [alias, setAlias] = useState('');
  
  const initialFormState = {
    // Pago Móvil
    bankCode: '', bankName: '', phone: '', docId: '', 
    // Transferencia
    accountNumber: '', holder: '', accountType: 'C', 
    // Binance
    email: '', payId: ''                              
  };

  const [formData, setFormData] = useState(initialFormState);

  const getIcon = (t) => {
    switch(t) {
        case 'pago_movil': return <Smartphone size={20} className="text-emerald-500"/>;
        case 'transfer': return <Building2 size={20} className="text-blue-500"/>;
        case 'binance': return <Bitcoin size={20} className="text-amber-500"/>;
        default: return <Wallet size={20}/>;
    }
  };

  // --- LÓGICA DE EDICIÓN ---
  const handleEdit = (account) => {
      // 1. Abrimos el modo formulario
      setIsAdding(true);
      // 2. Establecemos el ID que se está editando
      setEditingId(account.id);
      // 3. Rellenamos los datos
      setType(account.type);
      setAlias(account.alias);
      // Mezclamos con el estado inicial para evitar campos undefined
      setFormData({ ...initialFormState, ...account.data });
  };

  const resetForm = () => {
      setIsAdding(false);
      setEditingId(null);
      setAlias('');
      setFormData(initialFormState);
      setType('pago_movil'); // Resetear al default
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!alias) return;

    if (editingId) {
        // --- MODO ACTUALIZAR ---
        // Preparamos los campos a actualizar
        const updatedFields = {
            alias,
            type,
            currency: type === 'binance' ? 'USDT' : 'VES',
            data: formData
        };
        updateAccount(editingId, updatedFields);
    } else {
        // --- MODO CREAR ---
        const currency = type === 'binance' ? 'USDT' : 'VES';
        addAccount(type, alias, currency, formData);
    }
    
    resetForm();
  };

  const handleBankSelect = (e) => {
    const bank = VENEZUELA_BANKS.find(b => b.code === e.target.value);
    if (bank) {
        setFormData({ ...formData, bankCode: bank.code, bankName: bank.name });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Header */}
      <div className="px-1 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white transition-colors tracking-tight">Billetera</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium font-mono">
                {accounts.length} {accounts.length === 1 ? 'método' : 'métodos'} guardados
            </p>
          </div>
          {!isAdding && (
            <button onClick={() => { setEditingId(null); setIsAdding(true); }} className="bg-brand hover:bg-brand-dark text-slate-900 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-brand/20 transition-all active:scale-95">
                <Plus size={16} strokeWidth={3} /> Agregar
            </button>
          )}
      </div>

      {/* --- MODO FORMULARIO (Agregar / Editar) --- */}
      {isAdding ? (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 dark:text-white">
                    {editingId ? 'Editar Cuenta' : 'Nueva Cuenta'}
                </h3>
                <button onClick={resetForm} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-red-500 transition-colors">
                    <X size={16} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Selector de Tipo */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {['pago_movil', 'transfer', 'binance'].map(t => (
                        <button 
                            key={t} type="button" onClick={() => setType(t)}
                            className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${type === t ? 'bg-brand/10 border-brand text-slate-900 dark:text-white' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400'}`}
                        >
                            {getIcon(t)}
                            <span className={`font-bold uppercase ${t === 'transfer' ? 'text-[8px] tracking-tight' : 'text-[9px]'}`}>
                                {t === 'pago_movil' ? 'Pago Móvil' : t === 'transfer' ? 'TRANSFERENCIA' : 'BINANCE'}
                            </span>
                        </button>
                    ))}
                </div>

                {/* 2. Alias */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Alias (Ej: Mercantil Principal)</label>
                    <input required type="text" value={alias} onChange={e => setAlias(e.target.value)} placeholder="Nombre para identificar esta cuenta" className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand border border-slate-200 dark:border-slate-800" />
                </div>

                {/* 3. CAMPOS PAGO MÓVIL */}
                {type === 'pago_movil' && (
                    <>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Banco</label>
                            <div className="relative">
                                <select required value={formData.bankCode} onChange={handleBankSelect} className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand border border-slate-200 dark:border-slate-800 appearance-none">
                                    <option value="">Selecciona un banco...</option>
                                    {VENEZUELA_BANKS.map(b => <option key={b.code} value={b.code}>{b.code} - {b.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Cédula / RIF</label>
                                <input required type="text" placeholder="V-123456" value={formData.docId} onChange={e => setFormData({...formData, docId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-sm font-mono font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand border border-slate-200 dark:border-slate-800" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Teléfono</label>
                                <input required type="tel" placeholder="0414..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-sm font-mono font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand border border-slate-200 dark:border-slate-800" />
                            </div>
                        </div>
                    </>
                )}

                {/* 4. CAMPOS TRANSFERENCIA */}
                {type === 'transfer' && (
                    <>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Banco</label>
                            <div className="relative">
                                <select required value={formData.bankCode} onChange={handleBankSelect} className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand border border-slate-200 dark:border-slate-800 appearance-none">
                                    <option value="">Selecciona un banco...</option>
                                    {VENEZUELA_BANKS.map(b => <option key={b.code} value={b.code}>{b.code} - {b.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Tipo de Cuenta</label>
                             <div className="flex gap-2">
                                <button type="button" onClick={() => setFormData({...formData, accountType: 'C'})} className={`flex-1 p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${formData.accountType === 'C' ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' : 'bg-slate-50 border-transparent text-slate-400 dark:bg-slate-950'}`}>
                                    {formData.accountType === 'C' ? <CheckCircle2 size={14}/> : <Circle size={14}/>} Corriente
                                </button>
                                <button type="button" onClick={() => setFormData({...formData, accountType: 'A'})} className={`flex-1 p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${formData.accountType === 'A' ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' : 'bg-slate-50 border-transparent text-slate-400 dark:bg-slate-950'}`}>
                                    {formData.accountType === 'A' ? <CheckCircle2 size={14}/> : <Circle size={14}/>} Ahorro
                                </button>
                             </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Número de Cuenta (20 dígitos)</label>
                            <input required type="text" maxLength={20} placeholder="0102 0000 0000 0000 0000" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-sm font-mono font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand border border-slate-200 dark:border-slate-800 tracking-wider" />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-1 space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Cédula / RIF</label>
                                <input required type="text" placeholder="J-123..." value={formData.docId} onChange={e => setFormData({...formData, docId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand border border-slate-200 dark:border-slate-800" />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Nombre Titular</label>
                                <input required type="text" placeholder="Tu Nombre / Empresa" value={formData.holder} onChange={e => setFormData({...formData, holder: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand border border-slate-200 dark:border-slate-800" />
                            </div>
                        </div>
                    </>
                )}

                {/* 5. CAMPOS BINANCE */}
                {type === 'binance' && (
                    <>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Email (Binance)</label>
                            <input required type="email" placeholder="usuario@gmail.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand border border-slate-200 dark:border-slate-800" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Binance Pay ID (Opcional)</label>
                            <input type="text" placeholder="123456789" value={formData.payId} onChange={e => setFormData({...formData, payId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-sm font-mono font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand border border-slate-200 dark:border-slate-800" />
                        </div>
                    </>
                )}

                <button type="submit" className="w-full bg-brand hover:bg-brand-dark text-slate-900 py-4 rounded-xl font-bold text-sm shadow-lg shadow-brand/20 transition-all active:scale-95 flex justify-center items-center gap-2 mt-4">
                    <Save size={18} /> {editingId ? 'Actualizar Cuenta' : 'Guardar Cuenta'}
                </button>
            </form>
        </div>
      ) : (
        /* MODO LISTA */
        <div className="grid gap-4">
            {accounts.length === 0 && (
                <div className="text-center py-10 opacity-50">
                    <Wallet size={48} className="mx-auto mb-3 text-slate-300"/>
                    <p className="text-sm font-medium">No hay cuentas guardadas.</p>
                </div>
            )}
            
            {accounts.map(acc => (
                <div key={acc.id} className="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center group">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-2xl shrink-0 ${acc.type === 'pago_movil' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : acc.type === 'binance' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20'}`}>
                            {getIcon(acc.type)}
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate">{acc.alias}</h4>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 space-y-0.5">
                                {acc.type === 'pago_movil' && <p>{acc.data.bankName} • {acc.data.phone}</p>}
                                {acc.type === 'transfer' && <p>{acc.data.bankName} • {acc.data.accountType === 'C' ? 'Cte' : 'Aho'}</p>}
                                {acc.type === 'binance' && <p>{acc.data.email}</p>}
                            </div>
                        </div>
                    </div>
                    {/* ACCIONES: EDITAR Y BORRAR */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                            onClick={() => handleEdit(acc)} 
                            className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                            title="Editar"
                         >
                            <Pencil size={18} />
                        </button>
                        <button 
                            onClick={() => removeAccount(acc.id)} 
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                            title="Eliminar"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}