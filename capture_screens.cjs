const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    const outputDir = path.join(__dirname, 'capturas_manual');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    console.log('🚀 Iniciando navegador (Clicks precisos por índice)...');

    const browser = await puppeteer.launch({
        headless: false, // Cambiar a true si no necesitas ver el proceso
        defaultViewport: { width: 400, height: 850 }
    });

    const page = await browser.newPage();

    try {
        // --- 1. HOME (MONITOR) ---
        console.log('📸 Navegando a Home...');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
        await delay(3000);
        await page.screenshot({ path: path.join(outputDir, '1_Monitor_Demo_Home.png') });
        console.log('✅ Home capturado.');

        // --- 2. CHAT / ASISTENTE ---
        console.log('📸 Activando modo Chat/Asistente...');
        // Navegar a Calc primero
        await page.evaluate(() => {
            const footer = document.querySelector('.bg-slate-900\\/95');
            if (footer) {
                const buttons = footer.querySelectorAll('button');
                if (buttons[1]) buttons[1].click(); // Calc
            }
        });
        await delay(1000);
        // Activar Asistente
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Asistente'));
            if (btn) btn.click();
        });
        await delay(2000);
        await page.screenshot({ path: path.join(outputDir, '2_Chat_VIP.png') });
        console.log('✅ Chat capturado.');

        // --- 3. TIENDA ---
        console.log('📸 Yendo a Tienda...');
        await page.evaluate(() => {
            const footer = document.querySelector('.bg-slate-900\\/95');
            if (footer) {
                const buttons = footer.querySelectorAll('button');
                if (buttons[3]) buttons[3].click(); // Tienda
            }
        });
        await delay(4000); // Más tiempo para cargar productos
        await page.screenshot({ path: path.join(outputDir, '3_Tienda_VIP.png') });
        console.log('✅ Tienda capturada.');

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await browser.close();
        console.log('✨ Proceso terminado.');
    }
})();
