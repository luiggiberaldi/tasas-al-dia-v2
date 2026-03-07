import React from 'react';
import { Trash2, Smartphone, Landmark, DollarSign, Bitcoin, Pencil } from 'lucide-react';

const getIcon = (type) => {
    switch (type) {
        case 'zelle': return <DollarSign size={20} />;
        case 'binance': return <Bitcoin size={20} />;
        case 'nequi': return <Smartphone size={20} />;
        case 'transferencia': return <Landmark size={20} />;
        default: return <Smartphone size={20} />;
    }
};

const getColor = (type) => {
    switch (type) {
        case 'zelle': return 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400';
        case 'binance': return 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400';
        case 'nequi': return 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400';
        case 'transferencia': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
        default: return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400';
    }
};

/**
 * Tarjeta de cuenta bancaria individual.
 */
export const AccountCard = ({ account: acc, onSelect, onEdit, onDelete }) => (
    <div
        onClick={() => onSelect(acc)}
        className="relative group bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
    >
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

            <div className="flex gap-1">
                <button
                    onClick={(e) => onEdit(acc, e)}
                    className="p-2 text-slate-300 hover:text-brand-dark dark:hover:text-brand hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
                >
                    <Pencil size={16} strokeWidth={2.5} />
                </button>
                <button
                    onClick={(e) => onDelete(acc.id_gen, e)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-all"
                >
                    <Trash2 size={16} strokeWidth={2.5} />
                </button>
            </div>
        </div>
        <div className="space-y-1 pl-1">
            {(acc.type === 'pago_movil') && <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{acc.bank} • {acc.phone}</p>}
            {(acc.type === 'transferencia') && <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{acc.bank} • {acc.accountNumber.slice(0, 4)}...{acc.accountNumber.slice(-4)}</p>}
            {(acc.type === 'zelle' || acc.type === 'binance') && <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{acc.email}</p>}
            {(acc.type === 'nequi') && <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{acc.phone}{acc.email ? ` • ${acc.email}` : ''}</p>}
            <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{acc.holder || acc.id}</p>
        </div>
    </div>
);
