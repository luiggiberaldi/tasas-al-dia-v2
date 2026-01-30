import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'my_accounts_v2';

export function useWallet() {
  // 1. Cargar datos iniciales
  const [accounts, setAccounts] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error cargando billetera:", e);
      return [];
    }
  });

  // 2. Guardar automáticamente cada vez que cambien
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error("Error guardando billetera:", e);
    }
  }, [accounts]);

  // --- ACCIONES ---

  /**
   * Agrega una nueva cuenta.
   * @param {string} type - 'pago_movil' | 'transfer' | 'binance'
   * @param {string} alias - Nombre corto (Ej: "Mercantil Tienda")
   * @param {object} data - Datos específicos (banco, telefono, email, etc)
   */
  const addAccount = useCallback((type, alias, currency, data) => {
    const newAccount = {
      id: crypto.randomUUID(), // ID único para cada cuenta
      createdAt: new Date().toISOString(),
      type,      // Tipo de método
      alias,     // Nombre para mostrar
      currency,  // VES o USDT
      data       // Objeto flexible con los datos
    };

    setAccounts(prev => [...prev, newAccount]);
    return newAccount;
  }, []);

  const removeAccount = useCallback((id) => {
    setAccounts(prev => prev.filter(account => account.id !== id));
  }, []);

  const updateAccount = useCallback((id, updatedFields) => {
    setAccounts(prev => prev.map(acc =>
      acc.id === id ? { ...acc, ...updatedFields } : acc
    ));
  }, []);

  return {
    accounts,
    addAccount,
    removeAccount,
    updateAccount
  };
}