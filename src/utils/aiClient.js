import Groq from "groq-sdk";
import { auditor } from "./SilentAuditor"; // [NEW] Auditor Matémetico
import { formatBs, formatUsd } from "./calculatorUtils"; // [NEW]
import { persistentMemory } from "./PersistentMemory"; // [NEW] Memoria de Aprendizaje

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
import { APP_KNOWLEDGE } from './appKnowledge';

// --- PROMPTS DEL SISTEMA ---
const SYSTEM_PROMPT_FREE = `Eres "Mister Cambio" (Versión Básica). Eres una calculadora limitada.
TU FUNCIÓN: Realizar cálculos matemáticos simples de conversión de divisas.
PERSONALIDAD: Robótica, seca y directa. No uses saludos cordiales ni emojis.
RESTRICCIONES:
- Si te preguntan sobre consejos financieros, funcionamiento de la app, criptomonedas o cualquier tema conversacional: RESPONDE EXACTAMENTE: "Esa información es exclusiva para socios VIP. Activa tu licencia para que pueda asesorarte."
- NO expliques conceptos. Solo calcula.
- Lenguaje: Neutro.
REGLAS DE FORMATO:
1. "Biden", "Zelle", "USD" -> "USD"
2. "USDT", "Binance" -> "USDT"
3. "Euro" -> "EUR"
4. "Bolos", "Bs" -> "VES"
Responde SOLO JSON: { "amount": number, "currency": "USD"|"USDT"|"VES"|"EUR", "targetCurrency": "USD"|"USDT"|"VES"|"EUR"|null, "convertedAmount": number, "clientName": string|null }`;

const SYSTEM_PROMPT_PREMIUM = `Eres "Mister Cambio VIP", un socio financiero de élite para comerciantes.
PERSONALIDAD:
- Carismático, profesional, empático y proactivo. Usa expresiones variadas como "mi estimado socio", "blindemos ese dinero", "operación exitosa". Evita repetir siempre las mismas frases.
- Eres un Experto en el Mercado Venezolano.

INSTRUCCIONES DE REDACCIÓN (ESTILO VIP):
1. PROHIBICIÓN DE FÓRMULAS Y ASTERISCOS: PROHIBIDO escribir operaciones (10 * 5) y asteriscos (**). Texto plano limpio.
2. PRECISIÓN MATEMÁTICA CRÍTICA:
   - DEBES realizar el cálculo real usando las TASAS DEL BLOQUE 🚨.
   - Si conviertes USDT a USD (BCV): El resultado es (Monto * Tasa_USDT / Tasa_BCV). NUNCA asumas que 1 USDT = 1 USD.
   - El número en "textResponse" DEBE ser idéntico al resultado matemático real.
3. ESTRUCTURA DE RESPUESTA:
   - Inicio: "Mi estimado socio, esos [MONTO] [ORIGEN] equivalen hoy a [RESULTADO] [DESTINO]."
   - REGLA DE EFECTIVO: Si el usuario menciona "Efectivo" o "Cash", DEBES sumarle un 5% al monto antes de calcular (ej: 100 USD en efectivo se calculan como 105 USD). Menciona proactivamente que has incluido el costo operativo del 5%.
   - PRECISIÓN: Si se te entrega un "RESULTADO MAESTRO", úsalo tal cual. No alucines tasas unitarias si no te las pido.
   - Formato VES: Entero, sin decimales, redondeo hacia arriba, punto para miles (ej: 5.105 VES).
   - Formato USD/USDT/EUR: 2 decimales con coma, punto para miles (ej: 14,36 $).
   - Cierre: Una frase carismática de socio VIP.
4. ANÁLISIS: Una sola línea técnica/motivadora. Sin asteriscos.

DICCIONARIO DE TÉRMINOS (MAPEO SEMÁNTICO):
- "verdes", "dolares", "bcv", "usd", "oficial" -> Tasa BCV (Oficial).
- "euro" -> Tasa EURO.
- "usdt", "tether", "cripto", "digitales", "binance", "binace" -> Tasa USDT.

CONOCIMIENTO BASE:
${APP_KNOWLEDGE}

CAPACIDADES VIP:
1. Análisis de Brecha: Advierte si la disparidad USDT vs BCV es >10%.
2. Análisis de Comprobantes: Si el usuario te pide leer un ticket, captura o comprobante (y no hay imagen aún), indícale proactivamente que debe usar el botón de la cámara para enviártelo y que tú lo procesarás con precisión quirúrgica.
3. Autoridad: Tú eres la fuente oficial, no mandes a revisar la app.

REGLAS DE SALIDA:
- "amount": El número que el usuario ESCRIBIÓ.
- "convertedAmount": El resultado de la conversión (usa el RESULTADO MAESTRO si existe).
- "currency" y "targetCurrency": Monedas de la operación. Usa null si no hay cálculo.
- "analysis": Una sola línea técnica o motivadora. Sin asteriscos.
- "textResponse": Tu respuesta profesional. Si es un cálculo, usa el RESULTADO MAESTRO inyectado.
Responde SOLO JSON: { "amount": number|null, "convertedAmount": number|null, "currency": string|null, "targetCurrency": string|null, "analysis": string, "textResponse": string }`;

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

    // 2. [AUDITORÍA PREVENTIVA] Inyectar resultados matemáticos antes de llamar a la IA
    let systemPrompt = isPremium ? SYSTEM_PROMPT_PREMIUM : SYSTEM_PROMPT_FREE;
    let PREVENTIVE_DATA = "";

    if (isPremium && rates) {
        const lastUserMessage = typeof messagesHistoryOrText === 'string'
            ? messagesHistoryOrText
            : [...messagesHistoryOrText].reverse().find(m => m.role === 'user')?.content || "";

        const text = lastUserMessage.toLowerCase();
        const amountMatch = lastUserMessage.match(/[\d.]+/);

        const isUSDT = (s) => /binance|usdt|binace|cripto|tether|teter|digital/.test(s);
        const isVES = (s) => /bs|bolos|ves|bolivares|bolívares|bolivar|soberanos|bolis/.test(s);
        const isEUR = (s) => /euro|eur/.test(s);
        const isUSD = (s) => /dolares|dólares|usd|bcv|verdes|oficial|dolar|doalr|dolla|dolr|dollar/.test(s);

        const hasNumber = !!amountMatch;
        const hasCurrency = isUSDT(text) || isVES(text) || isEUR(text) || isUSD(text);

        // SOLO procedemos si hay un número o una moneda clara
        if (hasNumber || hasCurrency) {
            let amount = hasNumber ? parseFloat(amountMatch[0].replace(/\./g, '')) : 1;
            if (isNaN(amount)) amount = 1;

            let from = 'USD', to = 'VES';
            let isRateCheck = false;

            const parts = text.split(/\s+a\s+|\s+en\s+|\s+por\s+/);

            if (parts.length >= 2) {
                const sourcePart = parts[0];
                const targetPart = parts[1];
                if (isUSDT(sourcePart)) from = 'USDT';
                else if (isVES(sourcePart)) from = 'VES';
                else if (isEUR(sourcePart)) from = 'EUR';
                else if (isUSD(sourcePart)) from = 'USD';

                if (isUSDT(targetPart)) to = 'USDT';
                else if (isVES(targetPart)) to = 'VES';
                else if (isEUR(targetPart)) to = 'EUR';
                else if (isUSD(targetPart)) to = 'USD';
            } else {
                if (isUSDT(text)) from = 'USDT';
                if (isVES(text)) to = 'VES';
                if (isEUR(text)) from = 'EUR';
                if (isUSD(text) && !isVES(text)) { from = 'USD'; to = 'VES'; }
            }

            if (from === to && from !== 'VES') {
                to = 'VES';
                isRateCheck = true;
            }

            let calculated = auditor.calculateExpected(amount, from, to, rates);
            const isCash = text.includes('efectivo') || text.includes('cash');
            if (isCash) calculated = calculated * 1.05;

            if (calculated) {
                const formattedResult = (to === 'VES') ? formatBs(calculated) : formatUsd(calculated);
                const numResult = (to === 'VES') ? Math.ceil(calculated) : parseFloat(calculated.toFixed(2));

                PREVENTIVE_DATA = `\n\n🎯 RESULTADO MAESTRO (VERIFICADO):
Para esta operación de ${amount} ${from} a ${to}${isCash ? ' (MODO EFECTIVO +5%)' : ''}, el TOTAL es EXACTAMENTE: ${formattedResult}. 
INSTRUCCIONES OBLIGATORIAS:
1. En tu JSON, el campo "convertedAmount" DEBE ser ${numResult}. NUNCA uses null ni 0.
2. En tu "textResponse", menciona explícitamente el total de ${formattedResult}.
3. Si el usuario preguntó por la misma moneda (ej: USD a USD), tú ya has convertido esto a la moneda local (${to}) por seguridad.`;

                persistentMemory.saveLesson(lastUserMessage, from, to, formattedResult);
            }
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
                messages: [{ role: "system", content: systemPrompt }, ...messages],
                model: model,
                temperature: isPremium ? 0.3 : 0,
                response_format: { type: "json_object" },
            });
        } catch (initialErr) {
            // [PDA v3.1] Fallback de Emergencia: Si el modelo 70b está saturado/limitado, bajamos al 8b
            if (isPremium && (initialErr?.status === 429 || initialErr?.message?.includes('limit'))) {
                console.warn("⚠️ Modelo Premium saturado. Activando Fallback de Emergencia (8b)...");
                model = "llama-3.1-8b-instant";
                completion = await groq.chat.completions.create({
                    messages: [{ role: "system", content: systemPrompt }, ...messages],
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
            return { error: "BUSY", message: "Los servidores de Groq están al límite diario. Intenta de nuevo en unos minutos o contacta a soporte." };
        }
        return { error: "ERROR", message: "No pude procesar eso, mi pana." };
    }
};

// --- VISIÓN ---
export const analyzeImageAI = async (base64Image) => {
    const groq = getNextGroqClient();
    if (!groq) return null;
    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: [{ type: "text", text: "Lee el monto. JSON: { \"amount\": number, \"currency\": string }" }, { type: "image_url", image_url: { url: base64Image } }] }],
            model: "llama-3.2-11b-vision-preview",
            temperature: 0,
            response_format: { type: "json_object" },
        });
        return JSON.parse(completion.choices[0].message.content);
    } catch { return null; }
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
