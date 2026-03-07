/**
 * Service responsible for monetary calculations and formatting rules.
 * Follows SRP: Only handles number crunching and string formatting related to currency.
 */
export const CurrencyService = {
    /**
     * Safely parses a string or number input into a float.
     * Handles comma/dot replacements and empty strings.
     * @param {string|number} val 
     * @returns {number}
     */
    safeParse: (val) => {
        if (!val || val === '.') return 0;
        if (typeof val === 'number') return val;
        return parseFloat(val.toString().replace(/,/g, '.'));
    },

    /**
     * Applies business rules for rounding based on currency type.
     * VES: Always CEIL to integer.
     * Others: Fixed to 2 decimals.
     * @param {number} value 
     * @param {string} currencyId 
     * @returns {string}
     */
    applyRoundingRule: (value, currencyId) => {
        if (currencyId === 'VES') {
            // Values < 1 Bs: show decimals (e.g., 1 COP = 0.0088 Bs)
            if (value > 0 && value < 1) return value.toFixed(4);
            return Math.ceil(value).toString();
        }
        if (currencyId === 'COP') {
            // COP amounts are large whole numbers (e.g., 4200)
            return Math.round(value).toString();
        }
        return value.toFixed(2);
    },

    /**
     * Calculates the exchange result.
     * @param {number} amount 
     * @param {number} rateFrom 
     * @param {number} rateTo 
     * @returns {number}
     */
    calculateExchange: (amount, rateFrom, rateTo) => {
        if (!rateTo || rateTo === 0 || !rateFrom) return 0;
        return (amount * rateFrom) / rateTo;
    }
};
