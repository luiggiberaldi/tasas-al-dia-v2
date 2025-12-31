import Groq from "groq-sdk";

// ✅ CORRECCIÓN DE SEGURIDAD:
// Ahora leemos la clave desde las variables de entorno (archivo .env)
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// Validación para evitar errores si la clave no existe
if (!GROQ_API_KEY) {
    console.error("❌ ERROR: Falta la API Key de Groq. Asegúrate de tener el archivo .env configurado.");
}

const groq = new Groq({ 
    apiKey: GROQ_API_KEY, 
    dangerouslyAllowBrowser: true 
});

// 1. CEREBRO DE VOZ
export const interpretVoiceCommandAI = async (text) => {
    if (!GROQ_API_KEY) return null;
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Eres un asistente financiero venezolano.
                    Tu misión es extraer la intención matemática y de moneda del usuario.
                    
                    DICCIONARIO:
                    - "Bolos", "Lucas", "Palos", "Soberanos" = VES
                    - "Verdes", "Lechugas", "Dólares" = USDT
                    - "Euros" = EUR
                    
                    INSTRUCCIONES:
                    1. Si el usuario dice una operación (ej: "100 menos 20"), RESUÉLVELA matemáticamente.
                    2. Devuelve SOLO un JSON válido.
                    
                    FORMATO JSON:
                    { "amount": number, "currency": "VES" | "USDT" | "EUR" | null }`
                },
                { role: "user", content: text }
            ],
            model: "llama3-8b-8192",
            temperature: 0, 
            response_format: { type: "json_object" },
        });

        return JSON.parse(completion.choices[0].message.content);
    } catch (e) {
        console.error("Error Groq Voice:", e);
        return null;
    }
};

// 2. CEREBRO DE MENSAJES
export const generateSmartMessage = async (account, amounts, tone) => {
    if (!GROQ_API_KEY) return null;
    try {
        const tones = {
            formal: "Profesional, corporativo, distante pero educado.",
            amigable: "Cercano, usa emojis, buena vibra, estilo pana.",
            cobrador: "Directo, firme, urgente pero respetuoso."
        };

        const prompt = `
            Actúa como un asistente que redacta mensajes de cobro por WhatsApp.
            
            DATOS DE LA OPERACIÓN:
            - El cliente paga: ${amounts.top} ${amounts.from}
            - El cliente recibe/equivale a: ${amounts.bot} ${amounts.to}
            - Tasa aplicada: ${amounts.rate}
            
            DATOS DE LA CUENTA (${account.type}):
            - Banco/Plataforma: ${account.bank || 'N/A'}
            - Datos: ${account.phone || account.email || account.accountNumber}
            - Titular: ${account.holder || account.alias}
            
            TAREA:
            Escribe un mensaje corto y listo para enviar con tono: "${tones[tone]}".
            - NO saludes con nombre.
            - Estructura los datos bancarios para que sean fáciles de leer.
            - Al final pide el capture.
        `;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama3-8b-8192",
        });

        return completion.choices[0].message.content;
    } catch (e) {
        console.error("Error Groq Message:", e);
        return null; 
    }
};