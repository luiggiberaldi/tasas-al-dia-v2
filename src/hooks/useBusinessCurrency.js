import { useState, useEffect, useCallback } from 'react';
import { VALID_CURRENCIES } from '../utils/currencyUtils';

const STORAGE_KEY = 'business_main_currency';

export function useBusinessCurrency() {
    const [mainCurrency, setMainCurrency] = useState('USDT');
    const [parityMode, setParityMode] = useState(false);

    const loadCurrency = useCallback(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && VALID_CURRENCIES.includes(saved)) {
                setMainCurrency(saved);
            }
            const savedParity = localStorage.getItem('business_parity_mode');
            setParityMode(savedParity === 'true');
        } catch (e) { /* ignore */ }
    }, []);

    useEffect(() => {
        // Initial load
        loadCurrency();

        // Listen for internal app changes via custom event
        window.addEventListener('businessCurrencyChanged', loadCurrency);
        // Listen for external tab changes
        window.addEventListener('storage', loadCurrency);

        return () => {
            window.removeEventListener('businessCurrencyChanged', loadCurrency);
            window.removeEventListener('storage', loadCurrency);
        };
    }, [loadCurrency]);

    const updateMainCurrency = useCallback((val) => {
        if (VALID_CURRENCIES.includes(val)) {
            setMainCurrency(val);
            localStorage.setItem(STORAGE_KEY, val);
            // Notify other instances immediately
            window.dispatchEvent(new Event('businessCurrencyChanged'));
        }
    }, []);

    const updateParityMode = useCallback((val) => {
        setParityMode(val);
        localStorage.setItem('business_parity_mode', val ? 'true' : 'false');
        window.dispatchEvent(new Event('businessCurrencyChanged'));
    }, []);

    return { mainCurrency, updateMainCurrency, parityMode, updateParityMode };
}
