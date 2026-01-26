import { useState, useRef, useEffect } from 'react';
import { interpretVoiceCommandAI, analyzeImageAI } from '../utils/groqClient';
import { formatBs, formatUsd } from '../utils/calculatorUtils';

export const useChatCalculator = (rates, speak) => {
    const [messages, setMessages] = useState([
        { id: 1, role: 'bot', type: 'text', content: '👋 ¡Hola! Soy Mister Cambio. ¿Qué calculamos hoy?' }
    ]);
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll: Only scroll if there are new messages (ignore initial welcome message)
    useEffect(() => {
        if (messages.length > 1) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const addMessage = (role, type, content, data = null) => {
        setMessages(prev => [...prev, { id: Date.now(), role, type, content, data }]);
    };

    const processAIResult = (aiResult) => {
        if (aiResult?.amount) {
            const amount = parseFloat(aiResult.amount);
            const currency = aiResult.currency || 'USD';
            let target = aiResult.targetCurrency;

            // 🧠 CEREBRO LÓGICO: Inferencia de destino si es nulo
            if (!target) {
                if (currency === 'VES') target = 'USD'; // Bs -> Dólar
                else target = 'VES'; // Todo lo demás (USD, USDT, EUR) -> Bs por defecto
            }

            let result = 0, rateUsed = 0, rateName = '';

            // 🔢 MATRIZ DE CONVERSIÓN
            // CASO 1: USDT -> ?
            if (currency === 'USDT') {
                if (target === 'USD') {
                    // ... (Arbitraje USDT -> BCV) ...
                    rateUsed = rates.usdt.price / rates.bcv.price;
                    result = amount * rateUsed;
                    rateName = 'Brecha (USDT → BCV)';
                } else if (target === 'EUR') {
                    // ADDED: USDT -> EUR (Cross Rate via Bs)
                    // Fórmula: (Monto * PrecioUSDT_Bs) / PrecioEUR_Bs
                    rateUsed = rates.usdt.price / rates.euro.price;
                    result = amount * rateUsed;
                    rateName = 'Cross (USDT → EUR)';
                } else {
                    // USDT -> Bs (Standard)
                    rateUsed = rates.usdt.price;
                    result = amount * rateUsed;
                    rateName = 'Tasa USDT';
                    target = 'VES';
                }
            }
            // CASO 2: USD (Dólar/Zelle/Efectivo) -> ?
            else if (currency === 'USD') {
                if (target === 'USDT') {
                    // ... (Arbitraje BCV -> USDT) ...
                    rateUsed = rates.bcv.price / rates.usdt.price;
                    result = amount * rateUsed;
                    rateName = 'Brecha (BCV → USDT)';
                } else if (target === 'EUR') {
                    // ADDED: USD -> EUR (Cross Rate via Bs)
                    rateUsed = rates.bcv.price / rates.euro.price;
                    result = amount * rateUsed;
                    rateName = 'Cross (USD → EUR)';
                } else {
                    // USD -> Bs (Standard BCV)
                    rateUsed = rates.bcv.price;
                    result = amount * rateUsed;
                    rateName = 'Tasa BCV';
                    target = 'VES';
                }
            }
            // CASO 3: EUR -> ?
            else if (currency === 'EUR') {
                if (target === 'USD' || target === 'USDT') {
                    // EUR -> USD (Cross Rate via Bs)
                    rateUsed = rates.euro.price / rates.bcv.price;
                    result = amount * rateUsed;
                    rateName = 'EUR → USD (Implícito)';
                    target = 'USD';
                } else {
                    // EUR -> Bs
                    rateUsed = rates.euro.price;
                    result = amount * rateUsed;
                    rateName = 'Tasa Euro BCV';
                    target = 'VES';
                }
            }
            // CASO 4: VES -> ?
            else if (currency === 'VES') {
                if (target === 'USDT') { rateUsed = 1 / rates.usdt.price; rateName = 'Compra USDT'; }
                else if (target === 'EUR') { rateUsed = 1 / rates.euro.price; rateName = 'Compra EUR'; }
                else { rateUsed = 1 / rates.bcv.price; rateName = 'Compra BCV'; target = 'USD'; } // Default a Dólar
                result = amount * rateUsed;
            }

            const data = {
                originalAmount: amount, originalSource: currency,
                resultAmount: result, targetCurrency: target,
                rateUsed, rateName, clientName: aiResult.clientName
            };

            addMessage('bot', 'calculation', null, data);

            // Feedback de voz inteligente
            // Para TTS: Eliminamos los puntos de miles (ej: "1.778" -> "1778") para que no lea "uno punto..."
            const montoSpeech = target === 'VES'
                ? formatBs(result).replace(/\./g, '')
                : formatUsd(result).replace(/,/g, ''); // Quitamos comas de miles en USD

            let contextSpeach = '';
            if (target === 'VES') contextSpeach = 'bolívares';
            else if (target === 'USD') contextSpeach = 'dólares del banco central';
            else if (target === 'USDT') contextSpeach = 'tether';
            else if (target === 'EUR') contextSpeach = 'euros';
            else contextSpeach = target;

            speak(`Son ${montoSpeech} ${contextSpeach}.`);
        } else {
            addMessage('bot', 'text', 'No entendí el monto. Intenta "100 USDT a BCV".');
        }
        setIsProcessing(false);
    };

    const handleTextSend = async (text) => {
        if (!text.trim()) return;
        addMessage('user', 'text', text);
        setIsProcessing(true);
        try {
            // Historial breve para contexto
            const history = messages.slice(-4).map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.type === 'calculation' ? `Calc: ${m.data.originalAmount} ${m.data.originalSource}` : m.content
            }));
            history.push({ role: 'user', content: text });

            const aiResult = await interpretVoiceCommandAI(history);
            processAIResult(aiResult);
        } catch { setIsProcessing(false); }
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
        messagesEndRef,
        handleTextSend,
        handleImageUpload,
        clearMessages: () => setMessages([])
    };
};