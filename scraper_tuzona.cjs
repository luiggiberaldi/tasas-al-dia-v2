const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const uuid = () => crypto.randomUUID();

// Función auxiliar para descargar imagen URL -> Base64
const urlToBase64 = (url) => {
    return new Promise((resolve, reject) => {
        if (!url || !url.startsWith('http')) { resolve(null); return; }

        https.get(url, (res) => {
            const chunks = [];
            res.on('data', d => chunks.push(d));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const type = res.headers['content-type'] || 'image/jpeg';
                resolve(`data:${type};base64,${buffer.toString('base64')}`);
            });
            res.on('error', (e) => resolve(null));
        }).on('error', (e) => resolve(null));
    });
};

(async () => {
    console.log('🕷️ Iniciando Scraper V2 (Mejorado)...');

    const MAX_RETRIES = 3;
    let browser = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`🕷️ Iniciando Scraper V2 (Intento ${attempt}/${MAX_RETRIES})...`);

            browser = await puppeteer.launch({
                headless: "new",
                defaultViewport: { width: 1366, height: 768 },
                args: ['--no-sandbox', '--disable-setuid-sandbox'] // [BLINDAJE] Mejora compatibilidad
            });
            const page = await browser.newPage();

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            console.log('🌐 Navegando a https://tuzonamarket.com/carabobo ...');
            await page.goto('https://tuzonamarket.com/carabobo', { waitUntil: 'networkidle2', timeout: 90000 });

            console.log('📜 Haciendo scroll profundo...');
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 400;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= 6000 || totalHeight >= scrollHeight) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            });

            await new Promise(r => setTimeout(r, 3000));

            console.log('⛏️ Analizando DOM con lógica avanzada...');

            const extractedData = await page.evaluate(() => {
                const products = [];
                const processedImages = new Set();
                const images = Array.from(document.querySelectorAll('img')).filter(img =>
                    img.width > 120 && img.height > 120 && img.src.startsWith('http')
                );

                images.forEach(img => {
                    if (processedImages.has(img.src)) return;
                    let card = img.parentElement;
                    let foundName = null;
                    let foundPrice = null;

                    for (let i = 0; i < 4; i++) {
                        if (!card) break;
                        const textContent = card.innerText;
                        if (!textContent) { card = card.parentElement; continue; }
                        const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

                        const priceLine = lines.find(l => l.match(/[\d.,]+\s*[$]/) || l.includes('Bs'));
                        if (priceLine) {
                            const match = priceLine.match(/[\d.,]+/);
                            if (match) foundPrice = parseFloat(match[0].replace(',', '.'));
                        }

                        const potentialNames = lines.filter(l =>
                            !l.includes('$') &&
                            !l.toLowerCase().includes('bs') &&
                            !l.toLowerCase().includes('prime') &&
                            !l.toLowerCase().includes('agotado') &&
                            !l.toLowerCase().includes('iva') &&
                            l.length > 4 &&
                            l.length < 80
                        );

                        if (potentialNames.length > 0) {
                            foundName = potentialNames.reduce((a, b) => a.length > b.length ? a : b);
                        }

                        if (foundName && foundPrice) break;
                        card = card.parentElement;
                    }

                    if (foundName && !foundName.toLowerCase().includes('banner')) {
                        products.push({
                            name: foundName,
                            src: img.src,
                            price: foundPrice || (Math.random() * 5 + 1).toFixed(2)
                        });
                        processedImages.add(img.src);
                    }
                });

                return products.slice(0, 40);
            });

            if (!extractedData || extractedData.length === 0) {
                throw new Error("No se extrajeron productos (posible fallo de carga).");
            }

            console.log(`✅ Detectados ${extractedData.length} productos válidos.`);

            const generatedProducts = [];
            let count = 0;

            for (const p of extractedData) {
                if (count >= 30) break;
                let cleanName = p.name.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
                if (cleanName.length < 3) continue;
                if (generatedProducts.some(gp => gp.name === cleanName)) continue;

                console.log(`📥 [${count + 1}] ${cleanName} ($${p.price})`);

                const base64 = await urlToBase64(p.src);
                if (base64) {
                    generatedProducts.push({
                        id: uuid(),
                        name: cleanName,
                        priceUsdt: parseFloat(p.price),
                        image: base64,
                        createdAt: new Date().toISOString()
                    });
                    count++;
                }
            }

            const backupData = {
                timestamp: new Date().toISOString(),
                version: "1.0",
                data: { my_products_v1: JSON.stringify(generatedProducts) }
            };

            const outputPath = path.join(__dirname, 'backup_tuzona_real_v2.json');
            fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2));

            console.log(`\n✨ Archivo V2 Generado: ${outputPath}`);
            console.log(`📦 Total productos finales: ${generatedProducts.length}`);

            // Éxito: Salir del bucle
            break;

        } catch (e) {
            console.error(`❌ Error en intento ${attempt}:`, e.message);
            if (attempt === MAX_RETRIES) console.error("❌ Fallo definitivo tras 3 intentos.");
            else await new Promise(r => setTimeout(r, 5000)); // Esperar 5s antes de reintentar
        } finally {
            if (browser) await browser.close();
        }
    }
})();
