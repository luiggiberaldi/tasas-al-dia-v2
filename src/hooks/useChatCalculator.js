import { useState, useRef, useEffect } from 'react';
import { getSmartResponse, analyzeImageAI } from '../utils/aiClient';
import { formatBs, formatUsd } from '../utils/calculatorUtils';
import { useSecurity } from './useSecurity';

export const useChatCalculator = (rates, speak) => {
    const { isPremium } = useSecurity();
    const [messages, setMessages] = useState([
        { id: 1, role: 'bot', type: 'text', content: '👋 ¡Hola! Soy Mister Cambio. ¿Qué calculamos hoy?' }
    ]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [limitReached, setLimitReached] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (messages.length > 1) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const addMessage = (role, type, content, data = null) => {
        setMessages(prev => [
            ...prev,
            {
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                role,
                type,
                content,
                data
            }
        ]);
    };

    const processAIResult = (aiResult) => {
        if (aiResult?.error) {
            addMessage('bot', 'text', aiResult.message);
            if (aiResult.error === 'LIMIT_REACHED' || aiResult.error === 'RATE_LIMIT_PREMIUM') {
                setLimitReached(true);
                if (aiResult.error === 'RATE_LIMIT_PREMIUM') setTimeout(() => setLimitReached(false), 30000);
            }
            setIsProcessing(false);
            return;
        }

        setLimitReached(false);

        // [VIP] Aviso de Tráfico
        if (aiResult?.systemWarning) {
            setTimeout(() => addMessage('bot', 'text', aiResult.systemWarning), 500);
        }

        let amount = null, currency = null, target = null, result = 0, rateUsed = 0, rateName = '';

        // CASO 2: Cálculo Matemático
        if (aiResult?.amount) {
            amount = parseFloat(aiResult.amount);

            const normalizeCurrency = (c) => {
                if (!c) return 'USD';
                const upper = c.toUpperCase();
                if (['BS', 'BOLIVARES', 'BOLÍVARES', 'VES', 'BOLIVAR'].includes(upper)) return 'VES';
                if (['USDT', 'TETHER', 'BINANCE', 'TETER'].includes(upper)) return 'USDT';
                if (['EUR', 'EURO'].includes(upper)) return 'EUR';
                return 'USD';
            };

            currency = normalizeCurrency(aiResult.currency);
            target = normalizeCurrency(aiResult.targetCurrency || (currency === 'VES' ? 'USD' : 'VES'));
            if (target === currency) target = currency === 'VES' ? 'USD' : 'VES';

            if (aiResult.convertedAmount) {
                result = aiResult.convertedAmount;
                rateUsed = result / amount;
                rateName = "Cálculo Inteligente IA";
            } else {
                // Fallback Logic
                if (currency === 'USDT') {
                    if (target === 'USD') { rateUsed = rates.usdt.price / rates.bcv.price; rateName = 'Brecha (USDT → BCV)'; }
                    else if (target === 'EUR') { rateUsed = rates.usdt.price / rates.euro.price; rateName = 'Cross (USDT → EUR)'; }
                    else { rateUsed = rates.usdt.price; rateName = 'Tasa USDT'; target = 'VES'; }
                } else if (currency === 'USD') {
                    if (target === 'USDT') { rateUsed = rates.bcv.price / rates.usdt.price; rateName = 'Brecha (BCV → USDT)'; }
                    else if (target === 'EUR') { rateUsed = rates.bcv.price / rates.euro.price; rateName = 'Cross (USD → EUR)'; }
                    else { rateUsed = rates.bcv.price; rateName = 'Tasa BCV'; target = 'VES'; }
                } else if (currency === 'EUR') {
                    if (target === 'USD' || target === 'USDT') { rateUsed = rates.euro.price / rates.bcv.price; rateName = 'EUR → USD (Implícito)'; target = 'USD'; }
                    else { rateUsed = rates.euro.price; rateName = 'Tasa Euro BCV'; target = 'VES'; }
                } else if (currency === 'VES') {
                    if (target === 'USDT') { rateUsed = 1 / rates.usdt.price; rateName = 'Compra USDT'; }
                    else if (target === 'EUR') { rateUsed = 1 / rates.euro.price; rateName = 'Compra EUR'; }
                    else { rateUsed = 1 / rates.bcv.price; rateName = 'Compra BCV'; target = 'USD'; }
                }
                result = amount * rateUsed;
            }
        }

        // Mostrar texto principal (Evitar duplicados con vipMessage)
        if (aiResult?.textResponse) {
            addMessage('bot', 'text', aiResult.textResponse);
            if (navigator.vibrate) navigator.vibrate(5);
        }

        // Si hay cálculo, mostrar tarjeta y hablar
        if (amount && result) {
            addMessage('bot', 'calculation', null, {
                originalAmount: amount,
                originalSource: currency,
                targetCurrency: target,
                resultAmount: result,
                rateUsed,
                rateName,
                clientName: aiResult.clientName
            });

            if (aiResult.vipMessage && isPremium && aiResult.vipMessage !== aiResult.textResponse) {
                setTimeout(() => addMessage('bot', 'text', `🧐 ${aiResult.vipMessage}`), 800);
            }

            const montoSpeech = target === 'VES' ? formatBs(result).replace(/\./g, '') : formatUsd(result).replace(/,/g, '');
            const contextSpeech = { 'VES': 'bolívares', 'USD': 'dólares del banco central', 'USDT': 'tether', 'EUR': 'euros' }[target] || target;
            speak(`Son ${montoSpeech} ${contextSpeech}.`);
        } else if (!aiResult?.textResponse) {
            addMessage('bot', 'text', 'No entendí el monto. Intenta "100 USDT a BCV".');
        }

        setIsProcessing(false);
    };

    const handleTextSend = async (text) => {
        if (!text.trim()) return;
        addMessage('user', 'text', text);
        setIsProcessing(true);
        try {
            const history = messages.slice(-4).map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.type === 'calculation' ? `Calc: ${m.data.originalAmount} ${m.data.originalSource}` : m.content
            }));
            history.push({ role: 'user', content: text });
            const aiResult = await getSmartResponse(history, isPremium, rates);
            processAIResult(aiResult);
        } catch (e) {
            console.error(e);
            setIsProcessing(false);
        }
    };

    const handleImageUpload = async (file) => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        addMessage('user', 'image', url);
        setIsProcessing(true);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                const res = await analyzeImageAI(reader.result);
                processAIResult(res);
            } catch { setIsProcessing(false); }
        };
    };

    return {
        messages,
        isProcessing,
        limitReached,
        messagesEndRef,
        handleTextSend,
        handleImageUpload,
        clearMessages: () => setMessages([])
    };
};