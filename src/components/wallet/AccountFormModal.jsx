import React from 'react';
import { X, ChevronDown } from 'lucide-react';
import { VENEZUELA_BANKS } from '../../data/banks';

const ACCOUNT_TYPES = [
    { id: 'pago_movil', label: 'Pago Móvil' },
    { id: 'transferencia', label: 'Transferencia' },
    { id: 'zelle', label: 'Zelle' },
    { id: 'binance', label: 'Binance' },
];

const labelClass = "block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1 uppercase tracking-wide";

/**
 * Modal para crear / editar una cuenta de pago.
 */
export const AccountFormModal = ({ isOpen, onClose, editingId, formData, setFormData, onSubmit }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[85vh]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white">
                        {editingId ? 'Editar Cuenta' : 'Nueva Cuenta'}
                    </h3>
                    <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X size={18} /></button>
                </div>

                <form onSubmit={onSubmit} className="space-y-5 pb-4">

                    {/* SELECTOR DE TIPO */}
                    <div>
                        <label className={labelClass}>Tipo de Cuenta</label>
                        <div className="grid grid-cols-2 gap-2">
                            {ACCOUNT_TYPES.map(t => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: t.id })}
                                    className={`py-3 rounded-xl text-xs font-bold transition-all border ${formData.type === t.id ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ALIAS */}
                    <div>
                        <label className={labelClass}>Alias de la Cuenta</label>
                        <input required placeholder="Ej: Personal, Bodega" value={formData.alias} onChange={e => setFormData({ ...formData, alias: e.target.value })} className="input-std" />
                    </div>

                    {/* SELECTOR DE BANCOS */}
                    {(formData.type === 'pago_movil' || formData.type === 'transferencia') && (
                        <div>
                            <label className={labelClass}>Banco</label>
                            <div className="relative">
                                <select
                                    required
                                    value={formData.bank}
                                    onChange={e => setFormData({ ...formData, bank: e.target.value })}
                                    className="input-std appearance-none"
                                >
                                    <option value="" disabled>Selecciona un banco</option>
                                    {VENEZUELA_BANKS.map((b) => (
                                        <option key={b.code} value={b.name}>
                                            {b.code} - {b.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                                    <ChevronDown size={16} />
                                </div>
                            </div>
                        </div>
                    )}

                    {(formData.type === 'transferencia') && (
                        <div>
                            <label className={labelClass}>Número de Cuenta (20 Dígitos)</label>
                            <input required type="number" placeholder="0000-0000-00-0000000000" value={formData.accountNumber} onChange={e => setFormData({ ...formData, accountNumber: e.target.value })} className="input-std" />
                        </div>
                    )}

                    {(formData.type === 'pago_movil') && (
                        <div>
                            <label className={labelClass}>Número de Teléfono</label>
                            <input required type="tel" placeholder="Ej: 04121234567" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-std" />
                        </div>
                    )}

                    {(formData.type === 'pago_movil' || formData.type === 'transferencia') && (
                        <div>
                            <label className={labelClass}>Cédula de Identidad / RIF</label>
                            <input required placeholder="Ej: V12345678" value={formData.id} onChange={e => setFormData({ ...formData, id: e.target.value })} className="input-std" />
                        </div>
                    )}

                    {(formData.type === 'zelle' || formData.type === 'binance') && (
                        <div>
                            <label className={labelClass}>{formData.type === 'zelle' ? "Correo Electrónico" : "Correo o Binance ID"}</label>
                            <input required placeholder="usuario@email.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-std" />
                        </div>
                    )}

                    <div>
                        <label className={labelClass}>Nombre del Titular</label>
                        <input required placeholder="Nombre Apellido" value={formData.holder} onChange={e => setFormData({ ...formData, holder: e.target.value })} className="input-std" />
                    </div>

                    <button type="submit" className="w-full py-4 bg-brand hover:bg-brand-dark text-slate-900 font-bold rounded-xl shadow-lg shadow-brand/20 mt-4 mb-2">
                        {editingId ? 'Actualizar Cuenta' : 'Guardar Cuenta'}
                    </button>
                </form>
            </div>
        </div>
    );
};
