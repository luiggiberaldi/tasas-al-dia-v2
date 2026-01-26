import { useState, useEffect } from 'react';
import { auditor } from '../utils/SilentAuditor'; // [NEW]

export function useCalculator(rates) {
  const [amountTop, setAmountTop] = useState('');
  const [amountBot, setAmountBot] = useState('');
  const [from, setFrom] = useState('USDT');
  const [to, setTo] = useState('VES');
  const [lastEdited, setLastEdited] = useState('top');

  const currencies = [
    { id: 'VES', label: 'Bs.', icon: '🇻🇪', rate: 1 },
    { id: 'USDT', label: 'USDT', icon: '💵', rate: rates.usdt.price },
    { id: 'BCV', label: '$ BCV', icon: '🏛️', rate: rates.bcv.price },
    { id: 'EUR', label: 'Euro', icon: '💶', rate: rates.euro.price },
  ];

  // Helpers de parseo seguros
  const safeParse = (val) => (!val || val === '.') ? 0 : parseFloat(val.replace(/,/g, '.'));

  // --- LÓGICA DE CONVERSIÓN (Efecto Principal) ---
  useEffect(() => {
    const rateFrom = currencies.find(c => c.id === from)?.rate || 0;
    const rateTo = currencies.find(c => c.id === to)?.rate || 0;
    if (rateTo === 0 || rateFrom === 0) return;

    // Función interna para aplicar reglas de redondeo (Bs = Techo, USD = 2 decimales)
    const applyRounding = (value, currencyId) => {
      if (currencyId === 'VES') return Math.ceil(value).toString();
      return value.toFixed(2);
    };

    if (lastEdited === 'top') {
      if (!amountTop) { setAmountBot(''); return; }
      const res = (safeParse(amountTop) * rateFrom) / rateTo;
      const finalVal = applyRounding(res, to);
      setAmountBot(finalVal);

      // [AUDITOR] Verify Integrity
      auditor.audit({
        input: safeParse(amountTop),
        rate: rateFrom / rateTo,
        output: parseFloat(finalVal),
        context: 'CalculatorCore',
        operation: `${from} -> ${to}`
      });

    } else {
      if (!amountBot) { setAmountTop(''); return; }
      const res = (safeParse(amountBot) * rateTo) / rateFrom;
      const finalVal = applyRounding(res, from);
      setAmountTop(finalVal);

      // [AUDITOR] Verify Integrity
      auditor.audit({
        input: safeParse(amountBot),
        rate: rateTo / rateFrom,
        output: parseFloat(finalVal),
        context: 'CalculatorCore',
        operation: `${to} -> ${from}`
      });
    }
  }, [amountTop, amountBot, from, to, rates, lastEdited]);

  // --- HANDLERS ---
  const handleAmountChange = (val, source) => {
    const currentCurrency = source === 'top' ? from : to;
    // Validación: Si es VES solo enteros, si no, decimales
    const isValid = currentCurrency === 'VES'
      ? /^\d*$/.test(val)
      : /^\d*\.?\d{0,2}$/.test(val.replace(/,/g, '.'));

    if (isValid) {
      if (source === 'top') { setAmountTop(val); setLastEdited('top'); }
      else { setAmountBot(val); setLastEdited('bot'); }
    }
  };

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
    setAmountTop(amountBot);
    setLastEdited('top');
  };

  const handleQuickAdd = (val) => {
    const current = safeParse(amountTop);
    const newVal = current + val;
    // Aplicar redondeo si la moneda origen es VES
    const finalVal = from === 'VES' ? Math.ceil(newVal).toString() : newVal.toFixed(0);
    setAmountTop(finalVal);
    setLastEdited('top');
  };

  const clear = () => { setAmountTop(''); setAmountBot(''); };

  return {
    amountTop, amountBot, from, to, currencies,
    setFrom, setTo,
    handleAmountChange, handleSwap, handleQuickAdd, clear,
    safeParse // Exportamos para usar en utilidades
  };
}