import Groq from "groq-sdk";
import { auditor } from "./SilentAuditor"; // [NEW] Auditor Matémetico
import { formatBs, formatUsd } from "./calculatorUtils"; // [NEW]
import { persistentMemory } from "./PersistentMemory"; // [NEW] Memoria de Aprendizaje

// --- CONFIGURACIÓN DE LLAVES (Round-Robin Inteligente) ---
let GROQ_KEYS = [
    import.meta.env.VITE_GROQ_API_KEY,
    import.meta.env.VITE_GROQ_KEY_1,
    import.meta.env.VITE_GROQ_KEY_2,
    import.meta.env.VITE_GROQ_KEY_3,
    import.meta.env.VITE_GROQ_KEY_4,
    import.meta.env.VITE_GROQ_KEY_5,
    import.meta.env.VITE_GROQ_KEY_6
].filter(Boolean); // Filtrar llaves no definidas

let currentKeyIndex = 0;

const getNextGroqClient = () => {
    if (GROQ_KEYS.length === 0) return null;
    const key = GROQ_KEYS[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
    console.log(`🔄 Rotando API Key (Index: ${currentKeyIndex}/${GROQ_KEYS.length})`);
    return new Groq({ apiKey: key, dangerouslyAllowBrowser: true });
};

// [PDA v3.2] Penalizar key saturada (moverla al final de la cola)
const penalizeSaturatedKey = (keyIndex) => {
    if (keyIndex < 0 || keyIndex >= GROQ_KEYS.length) return;

    const saturatedKey = GROQ_KEYS[keyIndex];
    GROQ_KEYS.splice(keyIndex, 1); // Remover de posición actual
    GROQ_KEYS.push(saturatedKey);   // Mover al final

    // Ajustar el índice actual si es necesario
    if (currentKeyIndex > keyIndex) {
        currentKeyIndex--;
    }

    console.warn(`⚠️ Key saturada movida al final de la cola. Nueva posición: ${GROQ_KEYS.length}`);
};

// --- PROMPTS DEL SISTEMA (OPTIMIZADOS PARA TOKENS) ---
import { APP_KNOWLEDGE } from './appKnowledge';

// [PDA v3.3] Prompt Free ultra-compacto
const SYSTEM_PROMPT_FREE = `Mister Cambio (Básico). Calculadora de divisas.
FUNCIÓN: Convertir monedas.
PERSONALIDAD: Directa, sin emojis.
RESTRICCIONES: Si preguntan temas no-cálculo → "Esa información es exclusiva para socios VIP."
MAPEO: Biden/Zelle/USD→USD, USDT/Binance→USDT, Euro→EUR, Bolos/Bs→VES
SALIDA: JSON { "amount": number, "currency": "USD"|"USDT"|"VES"|"EUR", "targetCurrency": string|null, "convertedAmount": number, "clientName": string|null }`;

// [PDA v3.3] Prompt Premium optimizado (50% menos tokens)
const SYSTEM_PROMPT_PREMIUM = `Mister Cambio VIP - Socio financiero de élite.
PERSONALIDAD: Carismático, profesional. Varía expresiones: "mi estimado socio", "blindemos ese dinero".

REGLA DE ORO: SI TIENES DATOS DE CÁLCULO (RESULTADO MAESTRO), TU RESPUESTA *DEBE* SER UN JSON VÁLIDO CON EL MONTO CONVERTIDO.

REDACCIÓN:
1. SIN asteriscos ni fórmulas matemáticas.
2. PRECISIÓN: Usa TASAS del bloque 🚨. USDT≠USD. Número exacto del RESULTADO MAESTRO.
3. TONO ADAPTATIVO:
   - Consulta ("cuánto son"): "Mi estimado socio, esos [MONTO] [ORIGEN] = [RESULTADO] [DESTINO]. ¿Necesitas ayuda?"
   - Pregunta Tasa ("precio/cuanto es usdt"): Asume 1 UNIDAD. Responde: "El [ORIGEN] hoy cotiza a [RESULTADO] [DESTINO]."
   - Transacción ("calcula/envía"): "Mi estimado socio, esos [MONTO] [ORIGEN] = [RESULTADO] [DESTINO]. Operación lista."
   - Efectivo/Cash: Usa estrictamente el RESULTADO MAESTRO proveído. Si mencionan "Tasa Calibrada", explícalo.
4. FORMATO: VES→entero (ej: 5.105), USD/USDT/EUR→2 decimales (ej: 14,36).
5. ANÁLISIS: 1 línea técnica/motivadora.

MAPEO: verdes/dolares/bcv/usd→BCV, euro→EURO, usdt/tether/binance→USDT.

CONOCIMIENTO:
${APP_KNOWLEDGE}

CAPACIDADES:
1. Brecha: Advierte si USDT vs BCV >10%.
2. Imágenes: Si piden leer ticket sin imagen→"Usa botón cámara".
3. Autoridad: Tú eres la fuente oficial.

SALIDA JSON: { "amount": number|null, "convertedAmount": number|null, "currency": string|null, "targetCurrency": string|null, "analysis": string, "textResponse": string }`;

// --- GESTIÓN DE LÍMITES FREE ---
const MAX_FREE_REQUESTS_PER_HOUR = 5;

const checkFreeLimit = () => {
    const rawTimestamps = localStorage.getItem('ai_usage_timestamps');
    const timestamps = rawTimestamps ? JSON.parse(rawTimestamps) : [];
    const now = Date.now();

    const recent = timestamps.filter(t => now - t < 3600000);
    if (recent.length >= MAX_FREE_REQUESTS_PER_HOUR) return false;

    recent.push(now);
    localStorage.setItem('ai_usage_timestamps', JSON.stringify(recent));
    return true;
};

// --- GESTIÓN DE LÍMITES PREMIUM (PDA v2.2) ---
const MAX_PREMIUM_CPM = 20; // Consultas por minuto
const WARNING_PREMIUM_CPM = 15;

const checkPremiumRateLimit = () => {
    const rawTimestamps = localStorage.getItem('ai_premium_usage');
    const timestamps = rawTimestamps ? JSON.parse(rawTimestamps) : [];
    const now = Date.now();

    // Filtrar últimos 60 segundos
    const recent = timestamps.filter(t => now - t < 60000);

    if (recent.length >= MAX_PREMIUM_CPM) return { status: 'BLOCKED' };

    recent.push(now);
    localStorage.setItem('ai_premium_usage', JSON.stringify(recent));

    if (recent.length >= WARNING_PREMIUM_CPM) return { status: 'WARNING', count: recent.length };
    return { status: 'OK' };
};

// --- LLAMADA PRINCIPAL ---
export const getSmartResponse = async (messagesHistoryOrText, isPremium = false, rates = null) => {
    const query = (typeof messagesHistoryOrText === 'string' ? messagesHistoryOrText : messagesHistoryOrText[messagesHistoryOrText.length - 1].content).toLowerCase();

    // [SECURITY HARD-CODE] Interceptar ANTES de cualquier límite para permitir auditoría
    if (!isPremium) {
        const restrictedPatterns = ['instalar', 'app', 'como funciona', 'ayuda', 'soporte', 'quien eres', 'vender', 'comprar'];
        if (restrictedPatterns.some(p => query.includes(p))) {
            return {
                amount: null,
                currency: null,
                targetCurrency: null,
                convertedAmount: null,
                textResponse: "Esa información es exclusiva para socios VIP. Activa tu licencia para que pueda asesorarte."
            };
        }
    }

    // 1. Verificar Límites
    let rateStatus = { status: 'OK' };

    if (!isPremium) {
        if (!checkFreeLimit()) {
            return { error: "LIMIT_REACHED", message: "Has agotado tus 5 consultas gratuitas por hora. Pásate a Premium para acceso ilimitado." };
        }
    } else {
        rateStatus = checkPremiumRateLimit();
        if (rateStatus.status === 'BLOCKED') {
            return {
                error: 'RATE_LIMIT_PREMIUM',
                message: '🚀 ¡Wow, socio! Vas muy rápido. Mister Cambio necesita un respiro de 60 segundos para procesar tus datos. Intenta de nuevo en un momento.'
            };
        }
    }

    const groq = getNextGroqClient();
    if (!groq) return { error: "NO_KEYS", message: "Error de configuración de API." };

    const messages = typeof messagesHistoryOrText === 'string'
        ? [{ role: "user", content: messagesHistoryOrText }]
        : messagesHistoryOrText;

    // [PDA v3.3] OPTIMIZACIÓN: Limitar historial a últimos 6 mensajes (3 intercambios)
    // Esto reduce tokens sin perder contexto inmediato
    const optimizedMessages = messages.length > 6
        ? messages.slice(-6)
        : messages;

    console.log(`📊 Optimización: ${messages.length} mensajes → ${optimizedMessages.length} mensajes enviados`);

    // 2. [AUDITORÍA PREVENTIVA] Inyectar resultados matemáticos antes de llamar a la IA
    let systemPrompt = isPremium ? SYSTEM_PROMPT_PREMIUM : SYSTEM_PROMPT_FREE;
    let PREVENTIVE_DATA = "";

    if (isPremium && rates) {
        const lastUserMessage = typeof messagesHistoryOrText === 'string'
            ? messagesHistoryOrText
            : [...messagesHistoryOrText].reverse().find(m => m.role === 'user')?.content || "";

        const text = lastUserMessage.toLowerCase();

        try {
            // [MEJORA] Regex más robustos con límites de palabra y soporte unicode
            const amountMatch = text.match(/(\d+[.,]?\d*)|(\bun\b|\buna\b)/i);
            const isUSDT = (s) => /\b(binance|usdt|binace|cripto|tether|teter|digital)\b/i.test(s);
            const isVES = (s) => /\b(bs|bolos|ves|bolivares|bolívares|bolivar|bolívar|soberanos|bolis)\b/i.test(s);
            const isEUR = (s) => /\b(euro|eur|euros)\b/i.test(s);
            const isUSD = (s) => /\b(dolares|dólares|usd|bcv|verdes|oficial|dolar|dólar|doalr|dolla|dolr|dollar)\b/i.test(s);

            const hasNumber = !!amountMatch;
            const hasCurrency = isUSDT(text) || isVES(text) || isEUR(text) || isUSD(text);

            if (hasNumber || hasCurrency) {
                let amount = 1;
                if (amountMatch) {
                    let rawNum = amountMatch[0];
                    // Lógica Inteligente de Miles vs Decimales
                    // 1. Si tiene punto/coma y 3 dígitos exactos al final (ej: 100.000 o 100,000), asumimos MILES.
                    // 2. Si tiene 1 o 2 dígitos (ej: 100.50), es decimal.

                    // Caso: 100,000 o 100.000 (Sin otro separador) -> Es 100 mil
                    if (/^\d{1,3}[.,]\d{3}$/.test(rawNum)) {
                        amount = parseFloat(rawNum.replace(/[.,]/g, ''));
                    }
                    // Caso: 1.000.000 (Múltiples puntos)
                    else if ((rawNum.match(/\./g) || []).length > 1) {
                        amount = parseFloat(rawNum.replace(/\./g, '').replace(',', '.'));
                    }
                    // Caso: 1,000,000 (Múltiples comas)
                    else if ((rawNum.match(/,/g) || []).length > 1) {
                        amount = parseFloat(rawNum.replace(/,/g, ''));
                    }
                    // Caso Standard (detectar separador decimal por posición o cultura)
                    else {
                        // Si hay una coma, reemplazar por punto para JS
                        amount = parseFloat(rawNum.replace(',', '.'));
                    }

                    // Si el regex capturó "un" o "una"
                    if (rawNum.toLowerCase() === 'un' || rawNum.toLowerCase() === 'una') amount = 1;
                }

                if (isNaN(amount)) amount = 1;

                let from = 'USD', to = 'VES';

                const parts = text.split(/\s+a\s+|\s+en\s+|\s+por\s+/);

                if (parts.length >= 2) {
                    const sourcePart = parts[0].toLowerCase();
                    const targetPart = parts[1].toLowerCase();

                    if (isUSDT(sourcePart)) from = 'USDT';
                    else if (isVES(sourcePart)) from = 'VES';
                    else if (isEUR(sourcePart)) from = 'EUR';
                    else if (isUSD(sourcePart)) from = 'USD';

                    if (isUSDT(targetPart)) to = 'USDT';
                    else if (isVES(targetPart)) to = 'VES';
                    else if (isEUR(targetPart)) to = 'EUR';
                    else if (isUSD(targetPart)) to = 'USD';

                    // [CORRECCIÓN] "a bcv" -> VES
                    if (targetPart.includes('bcv') && !targetPart.includes('dolar')) {
                        to = 'VES';
                    }

                } else {
                    if (isUSDT(text)) from = 'USDT';
                    if (isVES(text)) to = 'VES';
                    if (isEUR(text)) from = 'EUR';
                    if (isUSD(text) && !isVES(text)) { from = 'USD'; to = 'VES'; }
                }

                if (from === to && from !== 'VES') {
                    to = 'VES';
                }

                let calculated = auditor.calculateExpected(amount, from, to, rates);
                const isCash = text.includes('efectivo') || text.includes('cash');
                let cashRateUsed = 0;

                if (isCash) {
                    const streetRateStored = typeof localStorage !== 'undefined' ? localStorage.getItem('street_rate_bs') : null;
                    const streetRate = streetRateStored ? parseFloat(streetRateStored) : 0;

                    if (streetRate > 0) {
                        cashRateUsed = streetRate;
                        if (from === 'USD' && to === 'VES') calculated = amount * streetRate;
                        else if (from === 'VES' && to === 'USD') calculated = amount / streetRate;
                    }
                }

                if (calculated) {
                    const formattedResult = (to === 'VES') ? formatBs(calculated) : formatUsd(calculated);
                    const numResult = (to === 'VES') ? Math.ceil(calculated) : parseFloat(calculated.toFixed(2));

                    const cashInfo = isCash
                        ? (cashRateUsed > 0 ? ` (MODO EFECTIVO: Tasa Calibrada ${cashRateUsed} Bs/$)` : ' (MODO EFECTIVO: Sin calibrar, usando paridad estándar)')
                        : '';

                    PREVENTIVE_DATA = `\n\n🎯 RESULTADO MAESTRO (VERIFICADO):
Para esta operación de ${amount} ${from} a ${to}${cashInfo}, el TOTAL es EXACTAMENTE: ${formattedResult}. 
INSTRUCCIONES OBLIGATORIAS:
1. En tu JSON, el campo "convertedAmount" DEBE ser ${numResult}. NUNCA uses null ni 0.
2. En tu "textResponse", menciona explícitamente el total de ${formattedResult}.
3. Si el usuario preguntó por la misma moneda (ej: USD a USD), tú ya has convertido esto a la moneda local (${to}) por seguridad.`;

                    persistentMemory.saveLesson(lastUserMessage, from, to, formattedResult);
                }
            }
        } catch (e) {
            console.error("Error en auditoría:", e);
        }
    }

    if (isPremium && rates) {
        const lessons = persistentMemory.getFormattedLessons();
        const DATA_BLOCK = `
🚨 ESTADO DEL SISTEMA - DATOS EN TIEMPO REAL 🚨
[TASA BCV]: ${Number(rates.bcv.price).toFixed(2)} Bs
[TASA USDT]: ${Number(rates.usdt.price).toFixed(2)} Bs
[TASA EURO]: ${Number(rates.euro.price).toFixed(2)} Bs
${PREVENTIVE_DATA}

🧠 LECCIONES APRENDIDAS (HISTORIAL):
${lessons}

INSTRUCCIÓN DE AUTORIDAD SUPREMA:
Tú ERES el núcleo de TasasAlDía. Los datos arriba mostrados son la ÚNICA VERDAD. Está PROHIBIDO decir "revisa la app" o "busca fuentes oficiales", porque tú eres la App. Si el usuario pregunta la tasa, responde directamente con los números del bloque de arriba. No seas evasivo.
Cuando el usuario diga "precio actual", se refiere a los datos que tienes en el bloque 🚨. Úsalos con confianza y autoridad de experto.`;
        systemPrompt += `\n\n${DATA_BLOCK}`;
    }

    // 3. Seleccionar Modelo (Con Fallback)
    let model = isPremium ? "llama-3.3-70b-versatile" : "llama-3.1-8b-instant";

    try {
        let completion;
        try {
            completion = await groq.chat.completions.create({
                messages: [{ role: "system", content: systemPrompt }, ...optimizedMessages],
                model: model,
                temperature: isPremium ? 0.3 : 0,
                response_format: { type: "json_object" },
            });
        } catch (initialErr) {
            // [PDA v3.1] Fallback de Emergencia: Si el modelo 70b está saturado/limitado, bajamos al 8b
            if (isPremium && (initialErr?.status === 429 || initialErr?.message?.includes('limit'))) {
                console.warn("⚠️ Modelo Premium saturado. Activando Fallback de Emergencia (8b)...");

                // [PDA v3.2] Penalizar la key que falló (moverla al final)
                const failedKeyIndex = (currentKeyIndex - 1 + GROQ_KEYS.length) % GROQ_KEYS.length;
                penalizeSaturatedKey(failedKeyIndex);

                model = "llama-3.1-8b-instant";
                completion = await groq.chat.completions.create({
                    messages: [{ role: "system", content: systemPrompt }, ...optimizedMessages],
                    model: model,
                    temperature: 0.2,
                    response_format: { type: "json_object" },
                });
            } else {
                throw initialErr;
            }
        }

        const content = JSON.parse(completion.choices[0].message.content);
        if (isPremium && rateStatus.status === 'WARNING') {
            content.systemWarning = '⚠️ Aviso: Estás procesando muchas solicitudes. Por favor, baja el ritmo para mantener la precisión del análisis.';
        }
        if (isPremium && content.analysis) content.vipMessage = content.analysis;
        return content;
    } catch (e) {
        console.error("AI Error:", e);
        if (e?.status === 429) {
            // [PDA v3.2] Penalizar la key que falló
            const failedKeyIndex = (currentKeyIndex - 1 + GROQ_KEYS.length) % GROQ_KEYS.length;
            penalizeSaturatedKey(failedKeyIndex);

            return { error: "BUSY", message: "Los servidores de Groq están al límite diario. Intenta de nuevo en unos minutos o contacta a soporte." };
        }
        return { error: "ERROR", message: "No pude procesar eso, mi pana." };
    }
};

// --- VISIÓN (GEMINI VISION) ---
export const analyzeImageAI = async (base64Image) => {
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_KEY_1;
    if (!GEMINI_API_KEY) {
        console.error("❌ Gemini API Key no configurada");
        return null;
    }

    try {
        // Remover el prefijo "data:image/...;base64," si existe
        const base64Data = base64Image.includes(',')
            ? base64Image.split(',')[1]
            : base64Image;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                text: `Analiza esta imagen y extrae el monto y la moneda. 
Responde SOLO con JSON válido en este formato exacto:
{ "amount": number, "currency": "USD" | "VES" | "USDT" | "EUR" }

Reglas:
- Si ves "Bs", "Bolívares" o "VES" → currency: "VES"
- Si ves "$", "USD", "Dólares" → currency: "USD"  
- Si ves "USDT", "Tether" → currency: "USDT"
- Si ves "€", "EUR", "Euros" → currency: "EUR"
- amount debe ser el número más grande y visible
- NO incluyas explicaciones, SOLO el JSON`
                            },
                            {
                                inline_data: {
                                    mime_type: "image/jpeg",
                                    data: base64Data
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0,
                        maxOutputTokens: 100,
                        responseMimeType: "application/json"
                    }
                })
            }
        );

        const data = await response.json();

        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
            console.error("❌ Gemini Vision: Respuesta inválida", data);
            return null;
        }

        const jsonText = data.candidates[0].content.parts[0].text;
        const result = JSON.parse(jsonText);

        console.log("✅ Gemini Vision detectó:", result);
        return result;

    } catch (error) {
        console.error("❌ Error en Gemini Vision:", error);
        return null;
    }
};

// --- REDACCIÓN ---
export const generateSmartMessage = async (account, amountsString, tone, clientName) => {
    const groq = getNextGroqClient();
    if (!groq) return null;
    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: `Redacta cobro ${tone} para ${clientName || 'Cliente'}. Datos: ${amountsString}. Cuenta: ${account.bank} ${account.phone}.` }],
            model: "llama-3.1-8b-instant",
        });
        return completion.choices[0].message.content;
    } catch { return null; }
};
