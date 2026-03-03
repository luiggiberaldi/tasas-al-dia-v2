import { useState, useEffect, useCallback } from 'react';
import { storageService } from '../utils/storageService';

const STORAGE_KEY = 'mysalesv1';

export function useSales() {
    const [sales, setSales] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // 1. Cargar ventas iniciales desde storageService
    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            try {
                const saved = await storageService.getItem(STORAGE_KEY, []);
                if (isMounted) {
                    setSales(saved);
                }
            } catch (error) {
                console.error("Error cargando ventas:", error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadData();
        return () => { isMounted = false; };
    }, []);

    // 2. Guardar automáticamente cuando cambien (solo si ya cargó)
    useEffect(() => {
        if (!isLoading) {
            storageService.setItem(STORAGE_KEY, sales);
        }
    }, [sales, isLoading]);

    // --- ACCIONES ---

    const addSale = useCallback((saleData) => {
        const { productId, productName, qty, buyPrice, sellPrice } = saleData;
        const total = qty * sellPrice;
        const profitUnit = sellPrice - buyPrice;
        const profitTotal = profitUnit * qty;

        const newSale = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            ...saleData,
            total,
            profitUnit,
            profitTotal,
        };

        setSales(prev => [newSale, ...prev]);
        return newSale;
    }, []);

    // Registra múltiples items como una sola transacción
    const addBatchSale = useCallback((items) => {
        const batchId = crypto.randomUUID();
        const createdAt = new Date().toISOString();

        const newSales = items.map(item => {
            const total = item.qty * item.sellPrice;
            const profitUnit = item.sellPrice - item.buyPrice;
            const profitTotal = profitUnit * item.qty;
            return {
                id: crypto.randomUUID(),
                batchId,
                createdAt,
                ...item,
                total,
                profitUnit,
                profitTotal,
            };
        });

        setSales(prev => [...newSales, ...prev]);
        return newSales;
    }, []);

    const removeSale = useCallback((id) => {
        setSales(prev => prev.filter(s => s.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setSales([]);
    }, []);

    const getTotals = useCallback((range = 'today') => {
        let filtered = sales;

        if (range === 'today') {
            const todayStr = new Date().toLocaleDateString('es-VE');
            filtered = sales.filter(s =>
                new Date(s.createdAt).toLocaleDateString('es-VE') === todayStr
            );
        }

        return {
            totalSoldUsd: filtered.reduce((acc, s) => {
                if (typeof s.sellUsd === 'number') return acc + s.sellUsd * (s.qty || 1);
                if (typeof s.totalUsd === 'number') return acc + s.totalUsd;
                if (typeof s.total === 'number') return acc + s.total;
                return acc;
            }, 0),
            totalProfitUsd: filtered.reduce((acc, s) => {
                if (typeof s.profitTotalUsd === 'number') return acc + s.profitTotalUsd;
                if (typeof s.profitUsd === 'number') return acc + s.profitUsd;
                if (typeof s.profitTotal === 'number') return acc + s.profitTotal;
                return acc;
            }, 0),
            count: filtered.length,
        };
    }, [sales]);

    return {
        sales,
        isLoading,
        addSale,
        addBatchSale,
        removeSale,
        clearAll,
        getTotals,
    };
}
