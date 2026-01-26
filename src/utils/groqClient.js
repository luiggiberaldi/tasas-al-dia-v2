import Groq from "groq-sdk";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// 🔍 DIAGNÓSTICO
console.log("🔑 ESTADO API KEY:", GROQ_API_KEY ? "✅ Cargada correctamente" : "❌ NO ENCONTRADA");

const groq = new Groq({
    apiKey: GROQ_API_KEY,
    dangerouslyAllowBrowser: true
});

// --- 🧠 CEREBRO MAESTRO: MISTER CAMBIO ---
export const interpretVoiceCommandAI = async (messagesHistoryOrText) => {
    if (!GROQ_API_KEY) return null;

    // Adaptador: Si recibimos un string directo (Calculadora Manual) lo convertimos a formato mensaje
    const messages = typeof messagesHistoryOrText === 'string'
        ? [{ role: "user", content: messagesHistoryOrText }]
        : messagesHistoryOrText;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Eres "Mister Cambio", experto financiero.
                    
                    ⚠️ REGLAS DE IDENTIFICACIÓN ESTRICTA:
                    1. "USDT", "Tether", "Binance", "Cripto" -> "USDT"
                    2. "Dólar", "USD", "Verdes", "Efectivo", "Zelle" -> "USD" (Implica Dólar BCV/Paralelo)
                    3. "Euro", "Euros" -> "EUR"
                    4. "Bolívares", "Bs", "Soberanos" -> "VES"

                    TU TRABAJO: Extraer datos para cálculo.
                    Si el usuario dice "100 USDT a Dolar", el target es "USD".
                    Si dice "100 Dolares a USDT", el target es "USDT".
                    Si dice "100 USDT" (sin destino), target es null (la app decidirá).

                    ESTRUCTURA JSON OBLIGATORIA:
                    {
                      "amount": number,
                      "currency": "USD" | "USDT" | "VES" | "EUR", 
                      "targetCurrency": "USD" | "USDT" | "VES" | "EUR" | null,
                      "clientName": string | null
                    }

                    Responde SOLO el objeto JSON.`
                },
                ...messages
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0,
            response_format: { type: "json_object" },
        });

        return JSON.parse(completion.choices[0].message.content);
    } catch (e) {
        console.error("Error AI:", e);
        return null;
    }
};

// --- 👁️ VISIÓN (Sin cambios) ---
export const analyzeImageAI = async (base64Image) => {
    if (!GROQ_API_KEY) return null;
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Lee el monto. JSON: { \"amount\": number, \"currency\": \"USD\"|\"USDT\"|\"VES\"|\"EUR\" }" },
                        { type: "image_url", image_url: { url: base64Image } }
                    ]
                }
            ],
            model: "llama-3.2-11b-vision-preview",
            temperature: 0,
            response_format: { type: "json_object" },
        });
        return JSON.parse(completion.choices[0].message.content);
    } catch (e) { return null; }
};

// --- ✍️ REDACCIÓN: MISTER CAMBIO AMABLE ---
export const generateSmartMessage = async (account, amountsString, tone, clientName) => {
    if (!GROQ_API_KEY) return null;
    try {
        const safeName = (clientName && clientName.length < 20) ? clientName : "Estimado/a";

        const personas = {
            standard: "Mister Cambio: Caballero amable, claro y servicial.",
            formal: "Mister Cambio Ejecutivo: Muy respetuoso y pulcro.",
            amigable: "Mister Cambio de Confianza: Cálido, usa 'Con gusto', 'Mi estimado'.",
            cobrador: "Mister Cambio Firme: Solicita el pago con educación."
        };

        const prompt = `
            Actúa como "Mister Cambio", asistente de "${account.holder}".
            Redacta un mensaje de cobro para WhatsApp.
            
            MONTOS:
            ${amountsString}
            
            CUENTA:
            - Banco: ${account.bank || 'Consultar'}
            - Dato: ${account.phone || account.email || account.accountNumber}
            - Titular: ${account.holder}

            ESTILO: ${personas[tone]}
            IDIOMA: Español Latino Neutro. Tono Masculino y Agradable.
            
            REGLAS:
            1. Saluda con cordialidad ("Hola ${safeName}, un gusto saludarte").
            2. Muestra los datos ordenados.
            3. Despídete amablemente ("Quedo a la orden", "Espero tu comprobante").
        `;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant",
        });

        return completion.choices[0].message.content;
    } catch (e) { return null; }
};