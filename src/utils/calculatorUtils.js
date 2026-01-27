// [CONFIGURACIÓN] Comisión de efectivo REMOVIDA
// La tasa de efectivo ahora depende exclusivamente de la calibración manual del usuario

// Formateadores
export const formatBs = (val) => new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 }).format(Math.ceil(val));
export const formatUsd = (val) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

// [REDONDEO INTELIGENTE PARA EFECTIVO]
// Regla: Si decimal <= 0.20 -> Redondeo abajo (Floor)
//        Si decimal > 0.20  -> Redondeo arriba (Ceil)
export const smartCashRounding = (amount) => {
    const integer = Math.floor(amount);
    const decimal = amount - integer;
    return decimal <= 0.2001 ? integer : integer + 1; // Usamos 0.2001 para margen de error flotante
};

export const generatePaymentMessage = ({
    amountTop, amountBot, from, to,
    selectedAccount, includeRef, rates, currencies
}) => {
    const safeParse = (val) => (!val || val === '.') ? 0 : parseFloat(val.replace(/,/g, '.'));

    const valTop = safeParse(amountTop);
    const valBot = safeParse(amountBot);
    const rateTo = currencies.find(c => c.id === to)?.rate;
    const rateFrom = currencies.find(c => c.id === from)?.rate;

    const isBsAccount = selectedAccount.currency === 'VES';
    const automaticRefRate = isBsAccount ? rates.bcv.price : rates.usdt.price;

    // Calcular Total Real en Bs y USD para referencias
    // Nota: Usamos la lógica de conversión inversa simple para referencias
    let totalBsRaw = 0;
    // Si el destino ya es VES, ese es el total. Si no, convertimos.
    if (to === 'VES') totalBsRaw = valBot;
    else if (from === 'VES') totalBsRaw = valTop;
    else totalBsRaw = (valTop * rateFrom); // Caso USDT -> EUR (raro pero posible, normalizamos a base VES si hubiera puente, aquí simplificado)

    // Ajuste preciso según dirección para evitar discrepancias
    if (to !== 'VES' && from !== 'VES') {
        // Si es divisa a divisa, calculamos base USDT
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
};