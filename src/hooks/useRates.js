import { useState, useEffect, useCallback } from 'react';

const DEFAULT_RATES = {
  usdt: { price: 0, source: '---', type: 'none', change: 0 },
  bcv: { price: 0, source: '---', change: 0 },
  euro: { price: 0, source: '---', change: 0 },
  lastUpdate: null
};

// --- CONFIGURACIÓN ---
const EXCHANGERATE_KEY = 'F1a3af26247a97a33ee5ad90'; 
const DEFAULT_EUR_USD_RATIO = 1.18; 
const UPDATE_INTERVAL = 3600000; // 1 Hora en milisegundos

// API PRIVADA (TIER 1 - PRIORIDAD) - ✅ URL ACTUALIZADA
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxT9sKz_XWRWuQx_XP-BJ33T0hoAgJsLwhZA00v6nPt4Ij4jRjq-90mDGLVCsS6FXwW9Q/exec?token=Lvbp1994';

// Estrategias de conexión (Proxies)
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
  
  // Mantenemos el estado para controlar el icono de la campanita en la UI
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const currentRates = rates || DEFAULT_RATES;

  // 1. Persistencia y Chequeo de Permisos
  useEffect(() => {
    if (rates) localStorage.setItem('monitor_rates_v12', JSON.stringify(rates));
    
    // Sincronizar visualmente el botón con el permiso del navegador
    if ('Notification' in window && Notification.permission === 'granted') {
        setNotificationsEnabled(true);
    }
  }, [rates]);

  // 2. Sistema de Logs
  const addLog = useCallback((msg, type = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
    setLogs(prev => [...prev.slice(-49), { time, msg, type }]);
  }, []);

  // 3. Activar Notificaciones (Solo pide permiso, OneSignal hace el resto)
  const enableNotifications = async () => {
      if (!('Notification' in window)) {
          alert("Tu navegador no soporta notificaciones.");
          return;
      }
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
          setNotificationsEnabled(true);
          addLog("Permiso de notificaciones concedido", "success");
      }
  };

  const parseSafeFloat = (val) => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return parseFloat(val.replace(',', '.'));
      return 0;
  };

  // --- LÓGICA PRINCIPAL ---
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

    // FASE 1: API PRIVADA
    let privateData = null;
    try {
        const rawPrivate = await fetchGeneric(GOOGLE_SCRIPT_URL);
        if (rawPrivate && (rawPrivate.bcv || rawPrivate.usd)) {
            privateData = rawPrivate;
            addLog("✅ Datos Privados Recibidos", "success");
        }
    } catch (e) { addLog("Error API Privada", "error"); }

    // FASE 2: RESPALDOS Y USDT
    const getEuroFactorFallback = async () => {
        try {
            const data = await fetchGeneric(`https://v6.exchangerate-api.com/v6/${EXCHANGERATE_KEY}/latest/USD`);
            if (data?.result === "success" && data.conversion_rates?.EUR) return 1 / data.conversion_rates.EUR;
        } catch (e) {}
        return DEFAULT_EUR_USD_RATIO;
    };

    const calculateP2PAverage = (dataField) => {
        if (typeof dataField === 'number') return dataField;
        if (Array.isArray(dataField) && dataField.length > 0) {
            const top5 = dataField.slice(0, 5);
            const getPrice = (item) => (typeof item === 'object' && item.price ? parseSafeFloat(item.price) : (typeof item === 'number' ? item : 0));
            return top5.reduce((acc, curr) => acc + getPrice(curr), 0) / top5.length;
        }
        return 0; 
    };

    const getMeta = (newP, oldP) => {
      const p = parseSafeFloat(newP); 
      const o = parseSafeFloat(oldP);
      return { price: p, change: (p > 0 && o > 0) ? ((p - o) / o) * 100 : 0 };
    };

    const fetchUSDT = async () => {
        const targetUrl = `https://criptoya.com/api/binancep2p/USDT/VES/5`; 
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

      // --- ACTUALIZAR DATOS ---
      if (usdtResult) {
          const meta = getMeta(usdtResult.price, newRates.usdt.price);
          newRates.usdt = { ...newRates.usdt, price: usdtResult.price, change: meta.change, source: usdtResult.source, type: 'p2p' };
      }

      // Procesar BCV y Euro
      let newBcvPrice = 0;
      let newEuroPrice = 0;

      if (privateData) {
          newBcvPrice = parseSafeFloat(privateData.bcv || privateData.usd);
          newEuroPrice = parseSafeFloat(privateData.euro || privateData.eur);
          
          if (newBcvPrice > 0) newRates.bcv = { ...newRates.bcv, ...getMeta(newBcvPrice, newRates.bcv.price), source: 'BCV Oficial' };
          if (newEuroPrice > 0) newRates.euro = { ...newRates.euro, ...getMeta(newEuroPrice, newRates.euro.price), source: 'Euro BCV' };

      } else if (bcvFallbackData) {
          const oficial = bcvFallbackData.find(d => d.fuente === 'oficial' || d.nombre === 'Oficial');
          if (oficial?.promedio > 0) {
              newBcvPrice = parseSafeFloat(oficial.promedio);
              newRates.bcv = { ...newRates.bcv, ...getMeta(newBcvPrice, newRates.bcv.price), source: 'BCV Oficial (Respaldo)' };
              
              if (euroFactor) {
                  newEuroPrice = newBcvPrice * euroFactor;
                  newRates.euro = { ...newRates.euro, ...getMeta(newEuroPrice, newRates.euro.price), source: 'Euro BCV (Triangulado)' };
              }
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
  }, [addLog, rates]);

  // --- AUTO-UPDATE EFFECT ---
  useEffect(() => {
    if (!rates) updateData();

    const intervalId = setInterval(() => {
        updateData(true); 
    }, UPDATE_INTERVAL);

    return () => clearInterval(intervalId);
  }, [updateData, rates]);

  return { rates: currentRates, loading, isOffline, logs, updateData, enableNotifications, notificationsEnabled };
}