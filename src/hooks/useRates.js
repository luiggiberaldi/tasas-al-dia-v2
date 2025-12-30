import { useState, useEffect, useCallback } from 'react';

const DEFAULT_RATES = {
  usdt: { price: 0, source: '---', type: 'none', change: 0 },
  bcv: { price: 0, source: '---', change: 0 },
  euro: { price: 0, source: '---', change: 0 },
  lastUpdate: null
};

// --- CONFIGURACIÓN ---
const EXCHANGERATE_KEY = 'F1a3af26247a97a33ee5ad90'; // Tu Clave Premium
const DEFAULT_EUR_USD_RATIO = 1.18; // Respaldo final si todo falla

// Estrategias de conexión (Proxies)
const CONNECTION_STRATEGIES = [
    { name: 'Directo', buildUrl: (target) => target },
    { name: 'Proxy A (AllOrigins)', buildUrl: (target) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}` },
    { name: 'Proxy B (CodeTabs)', buildUrl: (target) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}` }
];

export function useRates() {
  const [rates, setRates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('monitor_rates_v4')) || null; } 
    catch { return null; }
  });
  
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [logs, setLogs] = useState([]);

  const currentRates = rates || DEFAULT_RATES;

  useEffect(() => {
    if (rates) localStorage.setItem('monitor_rates_v4', JSON.stringify(rates));
  }, [rates]);

  const addLog = useCallback((msg, type = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
    setLogs(prev => [...prev.slice(-49), { time, msg, type }]);
  }, []);

  const updateData = useCallback(async () => {
    setLoading(true); 
    setIsOffline(false); 
    addLog("--- Iniciando Actualización ---");

    // --- HELPER: Fetch Genérico con Timeout ---
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

    // --- 1. LÓGICA DE TRIANGULACIÓN (NUEVA API) ---
    const getEuroFactor = async () => {
        // Intento 1: ExchangeRate-API (Tu cuenta Premium)
        try {
            const url = `https://v6.exchangerate-api.com/v6/${EXCHANGERATE_KEY}/latest/USD`;
            const data = await fetchGeneric(url);
            
            if (data && data.result === "success" && data.conversion_rates?.EUR) {
                // Si 1 USD = 0.95 EUR, entonces 1 EUR = 1 / 0.95 USD
                const factor = 1 / data.conversion_rates.EUR;
                addLog("Euro calculado vía ExchangeRate-API", "success");
                return factor;
            }
        } catch (e) { addLog("Fallo ExchangeRate-API, usando respaldo...", "error"); }

        // Intento 2: Coinbase (Respaldo público)
        try {
            const globalData = await fetchGeneric('https://api.coinbase.com/v2/exchange-rates?currency=USD');
            if (globalData?.data?.rates?.EUR) {
                const factor = 1 / parseFloat(globalData.data.rates.EUR);
                addLog("Euro calculado vía Coinbase", "info");
                return factor;
            }
        } catch (e) {}

        // Intento 3: Constante fija
        addLog("Usando factor Euro fijo (Offline)", "error");
        return DEFAULT_EUR_USD_RATIO;
    };

    // --- 2. LÓGICA DE CÁLCULO P2P (Binance) ---
    const calculateP2PAverage = (dataField) => {
        if (typeof dataField === 'number') return dataField;
        if (Array.isArray(dataField) && dataField.length > 0) {
            const top3 = dataField.slice(0, 3);
            const getPrice = (item) => (typeof item === 'object' && item.price ? parseFloat(item.price) : (typeof item === 'number' ? item : 0));
            const sum = top3.reduce((acc, curr) => acc + getPrice(curr), 0);
            return sum / top3.length;
        }
        return 0; 
    };

    const getMeta = (newP, oldP) => {
      const p = parseFloat(newP) || 0; const o = parseFloat(oldP) || 0;
      return { price: p, change: (p > 0 && o > 0) ? ((p - o) / o) * 100 : 0 };
    };

    // --- 3. FETCHING DE USDT (Multi-Salto) ---
    const fetchUSDT = async () => {
        const targetUrl = `https://criptoya.com/api/binancep2p/USDT/VES/5`; 
        
        for (const strategy of CONNECTION_STRATEGIES) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const url = strategy.buildUrl(targetUrl);
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const text = await response.text();
                let result;
                try { result = JSON.parse(text); } catch(e) { throw new Error("JSON inválido"); }

                if (!result || typeof result !== 'object') throw new Error("Formato inválido");

                const hasAsk = result.ask !== undefined && result.ask !== null;
                const hasBid = result.bid !== undefined && result.bid !== null;

                if (!hasAsk && !hasBid) throw new Error("Datos vacíos");

                const price = calculateP2PAverage(result.ask);
                
                if (price > 0) {
                    addLog(`USDT vía ${strategy.name}`, 'success');
                    return { price, source: `Binance P2P (${strategy.name})` };
                }

            } catch (err) { continue; }
        }
        return null;
    };

    // --- PROCESO PRINCIPAL DE ACTUALIZACIÓN ---
    try {
      // A. Buscar BCV (DolarAPI)
      const bcvData = await fetchGeneric('https://ve.dolarapi.com/v1/dolares');
      
      // B. Buscar USDT
      const usdtResult = await fetchUSDT();

      // C. Buscar Factor Euro (Nueva lógica con tu API Key)
      const euroFactor = await getEuroFactor();

      let newRates = { ...(rates || DEFAULT_RATES) };

      // Actualizar USDT
      if (usdtResult) {
          newRates.usdt = {
              ...newRates.usdt,
              ...getMeta(usdtResult.price, newRates.usdt.price),
              source: usdtResult.source,
              type: 'p2p'
          };
      } else {
          // Fallback USDT
          const paralelo = bcvData?.find(d => d.fuente === 'paralelo' || d.nombre === 'Paralelo');
          if (paralelo?.promedio > 0) {
              newRates.usdt = {
                  ...newRates.usdt,
                  ...getMeta(paralelo.promedio, newRates.usdt.price),
                  source: 'Paralelo (Respaldo)',
                  type: 'paralelo'
              };
          }
      }

      // Actualizar BCV y Calcular Euro
      if (bcvData) {
          const oficial = bcvData.find(d => d.fuente === 'oficial' || d.nombre === 'Oficial');
          if (oficial?.promedio > 0) {
              const bcvPrice = parseFloat(oficial.promedio);
              
              // 1. Guardar BCV
              newRates.bcv = { 
                  ...newRates.bcv, 
                  ...getMeta(bcvPrice, newRates.bcv.price), 
                  source: 'BCV Oficial' 
              };

              // 2. Calcular Euro (BCV * Factor Global)
              const euroPrice = bcvPrice * euroFactor;
              newRates.euro = { 
                  ...newRates.euro, 
                  ...getMeta(euroPrice, newRates.euro.price), 
                  source: 'Euro BCV (Triangulado)' 
              };
          }
      }

      newRates.lastUpdate = new Date();
      setRates(newRates);
      addLog("Ciclo completado", 'success');

    } catch (e) {
      console.error(e);
      addLog("Error crítico al actualizar", 'error');
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, [addLog, rates]);

  useEffect(() => {
    if (!rates) updateData();
  }, [updateData]);

  return { rates: currentRates, loading, isOffline, logs, updateData };
}