import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001; // Puerto diferente al de Vite (5173)

app.use(cors()); // Permite que tu web local (localhost:5173) hable con este servidor
app.use(express.json());

// Endpoint Principal
app.get('/api/usdt', async (req, res) => {
    try {
        console.log("📥 Recibiendo petición de tasa USDT...");

        // Petición POST a Binance P2P (Simulando ser un cliente real)
        const response = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify({
                "proMerchantAds": false, // No forzar comerciantes pro
                "page": 1,
                "rows": 5, // Pedimos 5 para tener margen
                "payTypes": [], // Todos los métodos (o especifica ["Bank Transfer"] si quieres)
                "countries": [],
                "publisherType": null, // null = TODOS (Verificados y No Verificados) -> LO QUE PEDISTE
                "asset": "USDT",
                "fiat": "VES",
                "tradeType": "SELL", // Ellos Venden USDT, Nosotros Compramos (Tasa de Mercado)
                "transAmount": "500" // Filtro mínimo (opcional, para evitar anuncios basura de 1 bs)
            })
        });

        const data = await response.json();

        if (data.code === '000000' && data.data) {
            // Filtrar y Calcular Promedio Top 3
            // Tomamos los primeros 3 anuncios que devuelve Binance (que ya están ordenados por precio)
            const ads = data.data.slice(0, 3).map(ad => parseFloat(ad.adv.price));

            if (ads.length > 0) {
                const average = ads.reduce((a, b) => a + b, 0) / ads.length;
                console.log(`✅ Éxito: ${ads.length} anuncios encontrados. Promedio: ${average.toFixed(2)}`);

                return res.json({
                    success: true,
                    price: average,
                    source: 'Binance P2P (Sin Verificar)',
                    adsCount: ads.length,
                    rawPrices: ads
                });
            }
        }

        console.log("⚠️ Binance no devolvió datos válidos.");
        res.status(500).json({ success: false, msg: "Sin datos de Binance" });

    } catch (error) {
        console.error("❌ Error en Proxy:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 PORTERO LISTO en http://localhost:${PORT}`);
    console.log("⏳ Esperando peticiones de tu web...\n");
});
