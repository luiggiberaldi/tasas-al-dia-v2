import Groq from "groq-sdk";

// --- CONFIGURACIÓN DE LLAVES (Round-Robin) ---
const GROQ_KEYS = [
    import.meta.env.VITE_GROQ_API_KEY,
    import.meta.env.VITE_GROQ_KEY_1,
    import.meta.env.VITE_GROQ_KEY_2,
    import.meta.env.VITE_GROQ_KEY_3
].filter(Boolean); // Filtrar llaves no definidas

let currentKeyIndex = 0;

const getNextGroqClient = () => {
    if (GROQ_KEYS.length === 0) return null;
    const key = GROQ_KEYS[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
    console.log(`🔄 Rotando API Key (Index: ${currentKeyIndex})`);
    return new Groq({ apiKey: key, dangerouslyAllowBrowser: true });
};

// --- PROMPTS DEL SISTEMA ---
const SYSTEM_PROMPT_FREE = `Eres "Mister Cambio". Lenguaje coloquial venezolano (chamo, pana, fíjate). Respuestas cortas y directas al cálculo. Eres servicial pero limitado. No des consejos financieros profundos.
REGLAS:
1. "Biden", "Zelle", "USD" -> "USD"
2. "USDT", "Binance" -> "USDT"
3. "Euro" -> "EUR"
4. "Bolos", "Bs" -> "VES"
Responde SOLO JSON: { "amount": number, "currency": "USD"|"USDT"|"VES"|"EUR", "targetCurrency": "USD"|"USDT"|"VES"|"EUR"|null, "clientName": string|null }`;

const SYSTEM_PROMPT_PREMIUM = `Eres "Mister Cambio VIP", un asesor financiero de élite. Tu lenguaje es sofisticado, profesional y carismático (Usa: 'mi estimado socio', 'un placer atenderle', 'según mi análisis').
Proactividad: No solo saques la cuenta. Si ves una brecha cambiaria alta entre USDT y BCV (>10%), advierte al usuario: 'Ojo, mi estimado, hoy la brecha es alta, le sugiero resguardarse en USDT'.
Visión: Analiza comprobantes bancarios con detalle quirúrgico (detecta número de referencia, banco emisor y fecha).
Conversación: Si el usuario te saluda, te da las gracias o te hace una pregunta general (SIN números explícitos para cálculo), responde con cordialidad y carisma en el campo "textResponse".
REGLAS:
1. Detecta monedas (USD, USDT, EUR, VES).
2. Responde SOLO JSON extendido: { "amount": number|null, "currency": "USD"|"USDT"|"VES"|"EUR", "targetCurrency": "USD"|"USDT"|"VES"|"EUR"|null, "clientName": string|null, "analysis": "string con tu consejo VIP", "textResponse": "Respuesta conversacional si no hay calculo" }`;

// --- GESTIÓN DE LÍMITES FREE ---
const MAX_FREE_REQUESTS_PER_HOUR = 5;

const checkFreeLimit = () => {
    const rawTimestamps = localStorage.getItem('ai_usage_timestamps');
    const timestamps = rawTimestamps ? JSON.parse(rawTimestamps) : [];
    const now = Date.now();

    // Filtrar timestamps de la última hora
    const recent = timestamps.filter(t => now - t < 3600000);

    if (recent.length >= MAX_FREE_REQUESTS_PER_HOUR) {
        return false; // Límite alcanzado
    }

    // Guardar nuevo uso
    recent.push(now);
    localStorage.setItem('ai_usage_timestamps', JSON.stringify(recent));
    return true;
};

// --- LLAMADA PRINCIPAL ---
export const getSmartResponse = async (messagesHistoryOrText, isPremium = false) => {
    // 1. Verificar Límites (Solo Free)
    if (!isPremium) {
        if (!checkFreeLimit()) {
            return { error: "LIMIT_REACHED", message: "Has agotado tus 5 consultas gratuitas por hora. Pásate a Premium para acceso ilimitado." };
        }
    }

    const groq = getNextGroqClient();
    if (!groq) return { error: "NO_KEYS", message: "Error de configuración de API." };

    const messages = typeof messagesHistoryOrText === 'string'
        ? [{ role: "user", content: messagesHistoryOrText }]
        : messagesHistoryOrText;

    // 2. Seleccionar Modelo y Prompt
    const model = isPremium ? "llama-3.3-70b-versatile" : "llama-3.1-8b-instant";
    const systemPrompt = isPremium ? SYSTEM_PROMPT_PREMIUM : SYSTEM_PROMPT_FREE;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                ...messages
            ],
            model: model,
            temperature: isPremium ? 0.3 : 0, // Un poco más creativo en VIP
            response_format: { type: "json_object" },
        });

        const content = JSON.parse(completion.choices[0].message.content);

        // Si es Premium, aseguramos que el mensaje de análisis viaje
        if (isPremium && content.analysis) {
            content.vipMessage = content.analysis;
        }

        return content;

    } catch (e) {
        console.error("AI Error:", e);
        // Retry logic simplificado: Si falla (429), intentar con el siguiente cliente recursivamente? 
        // Por ahora devolvemos error amigable.
        if (e?.status === 429) {
            return { error: "BUSY", message: "Mister Cambio está ocupado. Intenta de nuevo." };
        }
        return { error: "ERROR", message: "No pude procesar eso, mi pana." };
    }
};

// --- VISIÓN (Llama 3.2 11B) ---
export const analyzeImageAI = async (base64Image) => {
    const groq = getNextGroqClient();
    if (!groq) return null;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Lee el monto. JSON: { \"amount\": number, \"currency\": string }" },
                        { type: "image_url", image_url: { url: base64Image } }
                    ]
                }
            ],
            model: "llama-3.2-11b-vision-preview",
            temperature: 0,
            response_format: { type: "json_object" },
        });
        return JSON.parse(completion.choices[0].message.content);
    } catch (e) {
        console.error("AI Vision Error:", e);
        if (e.status === 429) return { error: e.message };
        return null;
    }
};

// --- REDACCIÓN (Llama 3 8B) ---
export const generateSmartMessage = async (account, amountsString, tone, clientName) => {
    const groq = getNextGroqClient();
    if (!groq) return null;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: `Redacta cobro ${tone} para ${clientName || 'Cliente'}. Datos: ${amountsString}. Cuenta: ${account.bank} ${account.phone}.` }],
            model: "llama-3.1-8b-instant",
        });
        return completion.choices[0].message.content;
    } catch (e) {
        if (e.status === 429) return e.message;
        return null;
    }
};
