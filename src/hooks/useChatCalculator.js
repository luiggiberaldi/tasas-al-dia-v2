import { useState, useRef, useEffect } from 'react';
import { getSmartResponse, analyzeImageAI } from '../utils/aiClient'; // [UPDATED]
import { formatBs, formatUsd } from '../utils/calculatorUtils';
import { useSecurity } from './useSecurity'; // [NEW]

export const useChatCalculator = (rates, speak) => {
    const { isPremium } = useSecurity();
    const [messages, setMessages] = useState([
        { id: 1, role: 'bot', type: 'text', content: '👋 ¡Hola! Soy Mister Cambio. ¿Qué calculamos hoy?' }
    ]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [limitReached, setLimitReached] = useState(false); // [NEW]
    const messagesEndRef = useRef(null);

    // Auto-scroll logic
    useEffect(() => {
        if (messages.length > 1) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const addMessage = (role, type, content, data = null) => {
        setMessages(prev => [
            ...prev,
            {
                id: Date.now() + Math.random().toString(36).substr(2, 9), // ID único robusto
                role,
                type,
                content,
                data
            }
        ]);
    };

    const processAIResult = (aiResult) => {
        // [NEW] Manejo de Errores (Límites o API Busy)
        if (aiResult?.error) {
            addMessage('bot', 'text', aiResult.message);
            if (aiResult.error === 'LIMIT_REACHED') {
                setLimitReached(true); // Bloqueamos UI
            }
            setIsProcessing(false);
            return;
        }

        // Si fue exitoso, reseteamos el bloqueo (por si compró premium y volvió)
        // Si fue exitoso, reseteamos el bloqueo (por si compró premium y volvió)
        setLimitReached(false);

        // CASO 1: Respuesta Conversacional (Premium Greeting/Question)
        if (aiResult?.textResponse) {
            addMessage('bot', 'text', aiResult.textResponse);
            if (navigator.vibrate) navigator.vibrate(5); // Soft Haptic
        }

        // CASO 2: Cálculo Matemático
        if (aiResult?.amount) {
            const amount = parseFloat(aiResult.amount);
            const currency = aiResult.currency || 'USD';
            let target = aiResult.targetCurrency;

            // ... (Misma lógica de inferencia de target) ...
            if (!target) {
                if (currency === 'VES') target = 'USD';
                else target = 'VES';
            }

            let result = 0, rateUsed = 0, rateName = '';

            // ... (Matriz de conversión) ...
            // CASO 1: USDT
            if (currency === 'USDT') {
                if (target === 'USD') { rateUsed = rates.usdt.price / rates.bcv.price; result = amount * rateUsed; rateName = 'Brecha (USDT → BCV)'; }
                else if (target === 'EUR') { rateUsed = rates.usdt.price / rates.euro.price; result = amount * rateUsed; rateName = 'Cross (USDT → EUR)'; }
                else { rateUsed = rates.usdt.price; result = amount * rateUsed; rateName = 'Tasa USDT'; target = 'VES'; }
            }
            // CASO 2: USD
            else if (currency === 'USD') {
                if (target === 'USDT') { rateUsed = rates.bcv.price / rates.usdt.price; result = amount * rateUsed; rateName = 'Brecha (BCV → USDT)'; }
                else if (target === 'EUR') { rateUsed = rates.bcv.price / rates.euro.price; result = amount * rateUsed; rateName = 'Cross (USD → EUR)'; }
                else { rateUsed = rates.bcv.price; result = amount * rateUsed; rateName = 'Tasa BCV'; target = 'VES'; }
            }
            // CASO 3: EUR
            else if (currency === 'EUR') {
                if (target === 'USD' || target === 'USDT') { rateUsed = rates.euro.price / rates.bcv.price; result = amount * rateUsed; rateName = 'EUR → USD (Implícito)'; target = 'USD'; }
                else { rateUsed = rates.euro.price; result = amount * rateUsed; rateName = 'Tasa Euro BCV'; target = 'VES'; }
            }
            // CASO 4: VES
            else if (currency === 'VES') {
                if (target === 'USDT') { rateUsed = 1 / rates.usdt.price; rateName = 'Compra USDT'; }
                else if (target === 'EUR') { rateUsed = 1 / rates.euro.price; rateName = 'Compra EUR'; }
                else { rateUsed = 1 / rates.bcv.price; rateName = 'Compra BCV'; target = 'USD'; }
                result = amount * rateUsed;
            }

            const data = {
                originalAmount: amount, originalSource: currency,
                resultAmount: result, targetCurrency: target,
                rateUsed, rateName, clientName: aiResult.clientName
            };

            addMessage('bot', 'calculation', null, data);

            // [NEW] Mensaje VIP de Análisis (Si existe)
            if (aiResult.vipMessage && isPremium) {
                setTimeout(() => {
                    addMessage('bot', 'text', `🧐 ${aiResult.vipMessage}`);
                }, 800);
            }

            // Feedback de voz logic...
            const montoSpeech = target === 'VES' ? formatBs(result).replace(/\./g, '') : formatUsd(result).replace(/,/g, '');
            let contextSpeach = '';
            if (target === 'VES') contextSpeach = 'bolívares';
            else if (target === 'USD') contextSpeach = 'dólares del banco central';
            else if (target === 'USDT') contextSpeach = 'tether';
            else if (target === 'EUR') contextSpeach = 'euros';
            else contextSpeach = target;

            speak(`Son ${montoSpeech} ${contextSpeach}.`);
        } else if (!aiResult?.textResponse) {
            // Solo si NO hubo ni texto ni cálculo mostramos error
            addMessage('bot', 'text', 'No entendí el monto. Intenta "100 USDT a BCV".');
        }
        setIsProcessing(false);
    };

    const handleTextSend = async (text) => {
        if (!text.trim()) return;
        addMessage('user', 'text', text);
        setIsProcessing(true);
        try {
            // Historial breve
            const history = messages.slice(-4).map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.type === 'calculation' ? `Calc: ${m.data.originalAmount} ${m.data.originalSource}` : m.content
            }));
            history.push({ role: 'user', content: text });

            // [UPDATED] Usamos getSmartResponse con isPremium Flag
            const aiResult = await getSmartResponse(history, isPremium);
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
        limitReached, // [NEW]
        messagesEndRef,
        handleTextSend,
        handleImageUpload,
        clearMessages: () => setMessages([])
    };
};