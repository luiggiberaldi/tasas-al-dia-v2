import { useState, useEffect, useCallback } from 'react';

const DEFAULT_RATES = {
    usdt: { price: 37.10, source: 'Promedio P2P', type: 'p2p', change: 0.12 },
    bcv: { price: 36.35, source: 'BCV Oficial', change: 0.05 },
    euro: { price: 39.80, source: 'Euro BCV', change: -0.02 },
    lastUpdate: new Date().toISOString()
};

const EXCHANGERATE_KEY = 'F1a3af26247a97a33ee5ad90';
const DEFAULT_EUR_USD_RATIO = 1.18;
const UPDATE_INTERVAL = 30000;

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxT9sKz_XWRWuQx_XP-BJ33T0hoAgJsLwhZA00v6nPt4Ij4jRjq-90mDGLVCsS6FXwW9Q/exec?token=Lvbp1994';

const CONNECTION_STRATEGIES = [
    { name: 'Directo', buildUrl: (target) => target },
    { name: 'Proxy A (AllOrigins)', buildUrl: (target) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}` },
    { name: 'Proxy B (CodeTabs)', buildUrl: (target) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}` }
];

export function useRates() {
    const [rates, setRates] = useState(() => {
        try { return JSON.parse(localStorage.getItem('monitor_rates_v12')) || null; }
        catch { return null; }
    });

    const [loading, setLoading] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [logs, setLogs] = useState([]);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

    const currentRates = rates || DEFAULT_RATES;

    useEffect(() => {
        if (rates) localStorage.setItem('monitor_rates_v12', JSON.stringify(rates));
        if ('Notification' in window && Notification.permission === 'granted') {
            setNotificationsEnabled(true);
        }
    }, [rates]);

    const addLog = useCallback((msg, type = 'info') => {
        const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLogs(prev => [...prev.slice(-49), { time, msg, type }]);
    }, []);

    const enableNotifications = async () => {
        if (!('Notification' in window)) {
            alert("Tu navegador no soporta notificaciones.");
            return;
        }
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            setNotificationsEnabled(true);
            new Notification("🔔 Notificaciones Activadas", {
                body: "Te avisaremos cuando cambie la tasa del BCV (Dólar y Euro).",
                icon: '/logodark.png'
            });
            addLog("Permiso de notificaciones concedido", "success");
        }
    };

    const parseSafeFloat = (val) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            // Eliminar todo lo que no sea número, punto o coma
            const clean = val.replace(/[^\d.,]/g, '');
            // Detectar último separador
            const lastDot = clean.lastIndexOf('.');
            const lastComma = clean.lastIndexOf(',');
            const lastSep = Math.max(lastDot, lastComma);

            if (lastSep === -1) return parseFloat(clean) || 0;

            const integer = clean.slice(0, lastSep).replace(/[.,]/g, '');
            const decimals = clean.slice(lastSep + 1);
            return parseFloat(`${integer}.${decimals}`) || 0;
        }
        return 0;
    };

    const sendRateNotification = (title, body) => {
        if (Notification.permission === 'granted') {
            try {
                new Notification(title, { body, icon: '/logodark.png', vibrate: [200, 100, 200] });
            } catch (e) { console.error("Error notificando", e); }
        }
    };

    const updateData = useCallback(async (isAutoUpdate = false) => {
        setLoading(true);
        setIsOffline(false);
        addLog(isAutoUpdate ? "--- Auto-Update (Refresco UI) ---" : "--- Actualización Manual ---");

        const fetchGeneric = async (url) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 8000);
            try {
                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(id);
                if (!res.ok) return null;
                return await res.json();
            } catch (e) { clearTimeout(id); return null; }
        };

        let privateData = null;
        try {
            const rawPrivate = await fetchGeneric(GOOGLE_SCRIPT_URL);
            if (rawPrivate) {
                privateData = rawPrivate;
                addLog("✅ Datos Privados Recibidos", "success");
            }
        } catch (e) { addLog("Error API Privada", "error"); }

        const getEuroFactorFallback = async () => {
            try {
                const data = await fetchGeneric(`https://v6.exchangerate-api.com/v6/${EXCHANGERATE_KEY}/latest/USD`);
                if (data?.result === "success" && data.conversion_rates?.EUR) return 1 / data.conversion_rates.EUR;
            } catch (e) { }
            return DEFAULT_EUR_USD_RATIO;
        };

        const calculateP2PAverage = (dataField) => {
            if (typeof dataField === 'number') return dataField;
            if (Array.isArray(dataField) && dataField.length > 0) {
                const top3 = dataField.slice(0, 3);
                const getPrice = (item) => (typeof item === 'object' && item.price ? parseSafeFloat(item.price) : (typeof item === 'number' ? item : 0));
                return top3.reduce((acc, curr) => acc + getPrice(curr), 0) / top3.length;
            }
            return 0;
        };

        // ✅ LÓGICA VITAL: Si hay cambio desde API, úsalo. Si no, calcúlalo.
        const getMeta = (newP, oldP, oldChange = 0, apiChange = null) => {
            let p = parseSafeFloat(newP);
            const o = parseSafeFloat(oldP);

            // 1. PRIORIDAD: Si la API me dice el % de cambio, CONFÍO en la API
            if (apiChange !== null && apiChange !== undefined && apiChange !== 0) {
                return { price: p, change: parseSafeFloat(apiChange) };
            }

            // 2. Fallback: Si no hay dato de API, intento calcularlo localmente
            if (p === o) return { price: p, change: oldChange };
            return { price: p, change: (p > 0 && o > 0) ? ((p - o) / o) * 100 : 0 };
        };

        const fetchUSDT = async () => {
            // 1. ESTRATEGIA WEB (Fallback: CriptoYa)
            const targetUrl = `https://criptoya.com/api/binancep2p/USDT/VES/1`;
            for (const strategy of CONNECTION_STRATEGIES) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000);
                    const res = await fetch(strategy.buildUrl(targetUrl), { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (!res.ok) continue;

                    const result = await res.json();
                    const avgAsk = calculateP2PAverage(result.ask);
                    const avgBid = calculateP2PAverage(result.bid);

                    if (avgAsk > 0 || avgBid > 0) {
                        let finalPrice = (avgAsk > 0 && avgBid > 0) ? (avgAsk + avgBid) / 2 : (avgAsk || avgBid);
                        return { price: finalPrice, source: `Binance P2P (${strategy.name})` };
                    }
                } catch (err) { continue; }
            }
            return null;
        };

        try {
            const promises = [fetchUSDT()];
            if (!privateData) {
                promises.push(fetchGeneric('https://ve.dolarapi.com/v1/dolares'));
                promises.push(getEuroFactorFallback());
            }

            const results = await Promise.all(promises);
            const usdtResult = results[0];
            const bcvFallbackData = !privateData ? results[1] : null;
            const euroFactor = !privateData ? results[2] : null;

            let newRates = { ...(rates || DEFAULT_RATES) };

            // Procesar USDT
            if (usdtResult) {
                const meta = getMeta(usdtResult.price, newRates.usdt.price, newRates.usdt.change);
                newRates.usdt = { ...newRates.usdt, price: usdtResult.price, change: meta.change, source: usdtResult.source, type: 'p2p' };
            }

            let newBcvPrice = 0;
            let newEuroPrice = 0;

            // ✅ Procesar DATOS PRIVADOS (Google Script)
            if (privateData) {
                // Detectamos si viene estructura simple o avanzada
                const rawBcv = privateData.bcv || privateData.usd;
                const rawEuro = privateData.euro || privateData.eur;

                // Extracción inteligente
                let bcvP = parseSafeFloat(typeof rawBcv === 'object' ? rawBcv.price : rawBcv);
                let euroP = parseSafeFloat(typeof rawEuro === 'object' ? rawEuro.price : rawEuro);

                // [REMOVED SANITY CHECK] La tasa real es > 250 (~358 Bs), no debemos dividir.
                // if (bcvP > 250) bcvP = bcvP / 10;
                // if (euroP > 250) euroP = euroP / 10;

                newBcvPrice = bcvP;
                newEuroPrice = euroP;

                // Si el Script envía "change", lo tomamos aquí
                let apiBcvChange = typeof rawBcv === 'object' ? rawBcv.change : null;
                let apiEuroChange = typeof rawEuro === 'object' ? rawEuro.change : null;

                // [BLINDAJE DE MAGNITUD] Auto-Corrección de Escala
                // Si la discrepancia con USDT es absurda (ej: BCV 35 vs USDT 550), ajustamos ceros.
                const alignMagnitude = (val, anchor) => {
                    if (!val || val <= 0 || !anchor || anchor <= 0) return val;

                    let corrected = val;
                    // Escalar hacia arriba (ej: 35.89 -> 358.9)
                    // Si corre es < 20% del anchor, multiplicamos por 10
                    while (corrected < (anchor * 0.20)) {
                        corrected *= 10;
                    }
                    // Escalar hacia abajo (ej: 35890 -> 358.9)
                    // Si corrected es > 500% del anchor, dividimos por 10
                    while (corrected > (anchor * 5.0)) {
                        corrected /= 10;
                    }

                    if (corrected !== val) {
                        console.warn(`⚖️ Magnitud corregida: ${val} -> ${corrected} (Anchor USDT: ${anchor})`);
                    }
                    return corrected;
                };

                // Aplicar blindaje usando USDT como ancla
                if (newRates.usdt.price > 0) {
                    newBcvPrice = alignMagnitude(newBcvPrice, newRates.usdt.price);
                    newEuroPrice = alignMagnitude(newEuroPrice, newRates.usdt.price);
                }

                if (newBcvPrice > 0) {
                    const meta = getMeta(newBcvPrice, newRates.bcv.price, newRates.bcv.change, apiBcvChange);
                    newRates.bcv = { ...newRates.bcv, ...meta, source: 'BCV Oficial' };
                }
                if (newEuroPrice > 0) {
                    const meta = getMeta(newEuroPrice, newRates.euro.price, newRates.euro.change, apiEuroChange);
                    newRates.euro = { ...newRates.euro, ...meta, source: 'Euro BCV' };
                }

            } else if (bcvFallbackData) {
                // Fallback en caso de emergencia
                const oficial = bcvFallbackData.find(d => d.fuente === 'oficial' || d.nombre === 'Oficial');
                if (oficial?.promedio > 0) {
                    let bcvP = parseSafeFloat(oficial.promedio);

                    // Aplicar mismo blindaje al fallback
                    if (newRates.usdt.price > 0) {
                        bcvP = alignMagnitude(bcvP, newRates.usdt.price);
                    }

                    newBcvPrice = bcvP;
                    const meta = getMeta(newBcvPrice, newRates.bcv.price, newRates.bcv.change);
                    newRates.bcv = { ...newRates.bcv, ...meta, source: 'BCV Oficial (Respaldo)' };

                    if (euroFactor) {
                        newEuroPrice = newBcvPrice * euroFactor;
                        const metaEur = getMeta(newEuroPrice, newRates.euro.price, newRates.euro.change);
                        newRates.euro = { ...newRates.euro, ...metaEur, source: 'Euro BCV (Triangulado)' };
                    }
                }
            }

            // Notificaciones
            if (notificationsEnabled && rates) {
                const oldBcv = rates.bcv.price;
                const currentBcv = newRates.bcv.price;
                if (currentBcv > 0 && oldBcv > 0 && currentBcv !== oldBcv) {
                    const emoji = currentBcv > oldBcv ? "📈" : "📉";
                    sendRateNotification(`${emoji} Cambio Tasa BCV`, `La tasa oficial cambió a ${currentBcv.toFixed(2)} Bs.`);
                }
                const oldEuro = rates.euro.price;
                const currentEuro = newRates.euro.price;
                if (currentEuro > 0 && oldEuro > 0 && currentEuro !== oldEuro) {
                    const emoji = currentEuro > oldEuro ? "📈" : "📉";
                    sendRateNotification(`${emoji} Cambio Tasa EURO`, `La tasa oficial del Euro cambió a ${currentEuro.toFixed(2)} Bs.`);
                }
            }

            newRates.lastUpdate = new Date();
            setRates(newRates);
            addLog("Actualización completada", 'success');

        } catch (e) {
            console.error(e);
            addLog("Error actualización", 'error');
            setIsOffline(true);
        } finally {
            setLoading(false);
        }
    }, [addLog, rates, notificationsEnabled]);

    useEffect(() => {
        if (!rates) updateData();
        const intervalId = setInterval(() => { updateData(true); }, UPDATE_INTERVAL);
        return () => clearInterval(intervalId);
    }, [updateData, rates]);

    return { rates: currentRates, loading, isOffline, logs, updateData, enableNotifications, notificationsEnabled };
}