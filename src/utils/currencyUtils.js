/**
 * Currency utilities for business currency conversion.
 * All rates are in Bs/unit from useRates:
 *   rates.usdt.price = Bs per 1 USDT
 *   rates.bcv.price  = Bs per 1 USD BCV
 *   rates.euro.price = Bs per 1 EUR BCV
 */

export const CURRENCIES = {
    USDT: 'USDT',
    USD_BCV: 'Dólar',
    EUR_BCV: 'Euro',
};

export const VALID_CURRENCIES = ['USDT', 'USD_BCV', 'EUR_BCV'];

export const currencySymbol = (id) => {
    if (id === 'USD_BCV') return '$';
    if (id === 'EUR_BCV') return '€';
    return 'USDT';
};

/**
 * Get the effective USDT rate based on user's manual preference.
 * Defaults to rates.usdt.price if no manual preference is set or invalid.
 */
export const getEffectiveUsdtRate = (rates) => {
    if (!rates?.usdt?.price) return 0;

    try {
        const useAuto = localStorage.getItem('catalog_use_auto_usdt');
        // If it explicitly is set to false (manual mode)
        if (useAuto !== null && JSON.parse(useAuto) === false) {
            const customPrice = parseFloat(localStorage.getItem('catalog_custom_usdt_price'));
            if (customPrice > 0) return customPrice;
        }
    } catch (e) {
        console.warn("Failed to read manual USDT rate from localStorage");
    }

    return rates.usdt.price;
};

/**
 * Convert a price entered in the user's working currency → USDT base.
 */
export const toBaseUsd = (displayPrice, mainCurrency, rates) => {
    const val = parseFloat(displayPrice || '0');
    if (!val || !rates?.usdt?.price || !rates?.bcv?.price || !rates?.euro?.price) {
        return val || 0;
    }

    const isParityMode = (localStorage.getItem('business_parity_mode') === 'true');
    if (mainCurrency === 'USDT' || isParityMode) return val;

    const effectiveUsdtRate = getEffectiveUsdtRate(rates);

    if (mainCurrency === 'USD_BCV') {
        // 1 USD_BCV = bcv Bs, 1 USDT = usdt Bs
        // val USD_BCV * (bcv Bs/USD_BCV) / (usdt Bs/USDT) = val in USDT
        return val * (rates.bcv.price / effectiveUsdtRate);
    }

    if (mainCurrency === 'EUR_BCV') {
        // 1 EUR_BCV = euro Bs
        // val EUR_BCV * (euro Bs/EUR_BCV) / (usdt Bs/USDT) = val in USDT
        return val * (rates.euro.price / effectiveUsdtRate);
    }

    return val;
};

/**
 * Convert from USDT base → user's working currency for display.
 */
export const fromBaseUsd = (amountUsd, mainCurrency, rates) => {
    const val = parseFloat(amountUsd || '0');
    if (!val || !rates?.usdt?.price || !rates?.bcv?.price || !rates?.euro?.price) {
        return val || 0;
    }

    const isParityMode = (localStorage.getItem('business_parity_mode') === 'true');
    if (mainCurrency === 'USDT' || isParityMode) return val;

    const effectiveUsdtRate = getEffectiveUsdtRate(rates);

    // First to Bs
    const bs = val * effectiveUsdtRate;

    if (mainCurrency === 'USD_BCV') {
        return bs / rates.bcv.price;
    }

    if (mainCurrency === 'EUR_BCV') {
        return bs / rates.euro.price;
    }

    return val;
};

/**
 * Map business currency ID to MessageService mainCurrency values.
 */
export const toMessageCurrency = (businessCurrency) => {
    if (businessCurrency === 'USD_BCV') return 'BCV';
    if (businessCurrency === 'EUR_BCV') return 'EUR';
    return 'USDT';
};
