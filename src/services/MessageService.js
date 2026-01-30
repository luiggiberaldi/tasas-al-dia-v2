import { formatBs, formatUsd } from '../utils/calculatorUtils';

/**
 * Service responsible for constructing user-facing messages.
 */
export const MessageService = {
    /**
     * Builds the payment message string.
     * @param {object} params
     * @param {number|string} params.amountTop
     * @param {number|string} params.amountBot
     * @param {string} params.from
     * @param {string} params.to
     * @param {object} params.selectedAccount - Account details object
     * @param {boolean} params.includeRef
     * @param {object} params.rates
     * @param {Array} params.currencies - Array of currency objects {id, rate}
     * @returns {string}
     */
    buildPaymentMessage: ({ amountTop, amountBot, from, to, selectedAccount, includeRef, rates, currencies }) => {

        // Helper Safe Parse (local to be pure, or could use CurrencyService, but keep simple dependency here)
        const safeParse = (val) => (!val || val === '.') ? 0 : parseFloat(val.toString().replace(/,/g, '.'));

        const valTop = safeParse(amountTop);
        const valBot = safeParse(amountBot);

        const rateTo = currencies.find(c => c.id === to)?.rate;
        const rateFrom = currencies.find(c => c.id === from)?.rate;

        const isBsAccount = selectedAccount.currency === 'VES';
        const automaticRefRate = isBsAccount ? rates.bcv.price : rates.usdt.price;

        // Calcular Total Real en Bs y USD para referencias
        let totalBsRaw = 0;

        if (to === 'VES') totalBsRaw = valBot;
        else if (from === 'VES') totalBsRaw = valTop;
        else {
            // Divisa a Divisa -> Calculamos base USDT/BCV conversion implied
            totalBsRaw = valTop * rateFrom;
        }

        const totalUsdRaw = totalBsRaw / automaticRefRate;

        let header = '';
        const strBs = formatBs(totalBsRaw);
        const strUsd = formatUsd(totalUsdRaw);

        if (isBsAccount) {
            header = `Total: *${strBs} Bs*`;
            if (includeRef) header += ` (Ref: ${strUsd} $)`;
        } else {
            header = `Total: *${strUsd} USDT*`;
            const refBs = formatBs(totalUsdRaw * automaticRefRate);
            if (includeRef) header += ` (Ref: ${refBs} Bs)`;
        }

        let details = '';
        const d = selectedAccount.data;
        if (selectedAccount.type === 'pago_movil') {
            details = `🏦 *Pago Móvil*\nBanco: ${d.bankCode} - ${d.bankName}\nTel: ${d.phone}\nCI: ${d.docId}`;
        } else if (selectedAccount.type === 'transfer') {
            const tipo = d.accountType === 'C' ? 'Corriente' : 'Ahorro';
            details = `🏦 *Transferencia Bancaria*\nBanco: ${d.bankName}\nCuenta: ${d.accountNumber}\nTipo: ${tipo}\nTitular: ${d.holder}\nCI/RIF: ${d.docId}`;
        } else if (selectedAccount.type === 'binance') {
            details = `🟡 *Binance Pay*\nEmail: ${d.email}\nID: ${d.payId || 'No especificado'}`;
        }

        return `Hola 👋, ${header}\n\nPuedes realizar el pago a:\n${details}\n\n_Generado con TasasAlDía_`;
    }
};
