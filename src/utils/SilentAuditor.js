/**
 * SilentAuditor.js
 * 
 * Este componente es el "Juez" matemático del sistema. 
 * Verifica que los números mencionados por la IA en su 'textResponse' 
 * coincidan con los cálculos reales basados en las tasas oficiales.
 */

import { formatBs, formatUsd } from './calculatorUtils';

export const auditor = {
    /**
     * Extrae el primer número significativo del texto de respuesta de la IA.
     */
    extractNumber: (text) => {
        if (!text) return null;
        // Busca formatos como 1.250,50 o 14,36 o 5.105
        const match = text.match(/[\d.,]+/);
        if (!match) return null;

        let cleaned = match[0];

        // Regla: Si tiene coma Y punto, el punto es de miles y la coma decimal.
        if (cleaned.includes('.') && cleaned.includes(',')) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        }
        // Regla: Si solo tiene coma, es decimal (formato hispano común)
        else if (cleaned.includes(',') && !cleaned.includes('.')) {
            cleaned = cleaned.replace(',', '.');
        }
        // Regla: Si solo tiene punto, es decimal (formato estándar)
        // A menos que estemos seguros que es miles (ej: >100.000 y el punto está en miles)
        // Pero para tasas y montos pequeños, el punto suele ser decimal.

        return parseFloat(cleaned);
    },

    /**
     * Calcula el valor esperado basado en las reglas de negocio.
     */
    calculateExpected: (amount, from, to, rates) => {
        if (!amount || !from || !to || !rates) return null;

        let result = 0;
        const baseAmount = parseFloat(amount);

        // Lógica espejo de useChatCalculator
        if (from === 'USDT') {
            if (to === 'USD') result = (baseAmount * rates.usdt.price) / rates.bcv.price;
            else if (to === 'EUR') result = (baseAmount * rates.usdt.price) / rates.euro.price;
            else result = baseAmount * rates.usdt.price; // To VES
        } else if (from === 'USD') {
            if (to === 'USDT') result = (baseAmount * rates.bcv.price) / rates.usdt.price;
            else if (to === 'EUR') result = (baseAmount * rates.bcv.price) / rates.euro.price;
            else result = baseAmount * rates.bcv.price; // To VES
        } else if (from === 'VES') {
            if (to === 'USDT') result = baseAmount / rates.usdt.price;
            else if (to === 'EUR') result = baseAmount / rates.euro.price;
            else result = baseAmount / rates.bcv.price; // To USD
        } else if (from === 'EUR') {
            if (to === 'VES') result = baseAmount * rates.euro.price;
            else result = (baseAmount * rates.euro.price) / rates.bcv.price; // To USD
        }

        return result;
    },

    /**
     * Valida si el texto de la IA es matemáticamente aceptable.
     */
    audit: (aiResponse, rates) => {
        const { amount, currency, targetCurrency, textResponse } = aiResponse;

        if (!amount || !textResponse) return { isValid: true }; // Nada que auditar

        const expectedRaw = auditor.calculateExpected(amount, currency, targetCurrency || 'VES', rates);
        const mention = auditor.extractNumber(textResponse);

        if (mention === null) return { isValid: false, reason: "No se encontró un número en la respuesta." };

        // Formatear el esperado según la moneda destino para comparar "manzanas con manzanas"
        const isVES = (targetCurrency === 'VES' || (!targetCurrency && currency !== 'VES'));

        let expectedFormatted;
        if (isVES) {
            // El formateador formatBs ya hace Math.ceil y quita decimales
            expectedFormatted = auditor.extractNumber(formatBs(expectedRaw));
        } else {
            expectedFormatted = auditor.extractNumber(formatUsd(expectedRaw));
        }

        const diff = Math.abs(mention - expectedFormatted);
        const isValid = diff < 0.01; // Tolerancia por redondeo

        return {
            isValid,
            expected: expectedFormatted,
            mention,
            raw: expectedRaw,
            reason: isValid ? null : `La IA dijo ${mention} pero el cálculo real es ${expectedFormatted}`
        };
    }
};
