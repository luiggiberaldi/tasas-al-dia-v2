# Auditoría de Rendimiento y UX (Performance UX Expert)

## Resumen Ejecutivo
Se ha realizado un análisis exhaustivo del proyecto "Tasas al Día" bajo los estándares del skill `performance-ux-expert`. El proyecto presenta una arquitectura moderna basada en React/Vite, pero se han detectado **3 puntos críticos** que afectan la estabilidad, el tiempo de respuesta y la experiencia en dispositivos móviles.

---

## 📊 Fase 2: Análisis de Cuellos de Botella

| Prioridad | Categoría | Hallazgo | Impacto |
| :--- | :--- | :--- | :--- |
| 🔴 **Crítico** | **Lógica/React** | **Ciclo de Re-renderizado en `useRates.js`**: El `useEffect` depende de `rates` y `updateData`, y `updateData` actualiza `rates`. Esto provoca que el temporizador de actualización (setInterval) se reinicie constantemente cada vez que cambia una tasa, potencialmente impidiendo actualizaciones automáticas futuras o causando loops. | Alto consumo de CPU y riesgo de datos desactualizados si el timer se resetea antes de disparar. |
| 🔴 **Crítico** | **Red (Network)** | **Waterfall (Bloqueo) en Llamadas API**: En `useRates.js`, la llamada al "Google Script" (línea 109) se hace con `await` *antes* de iniciar las otras cargas en paralelo (`Promise.all`). | Retrasa la carga inicial significativamente (hasta 8s si el script falla) antes de intentar siquiera cargar las tasas de respaldo o USDT. |
| 🔴 **Crítico** | **UI/UX** | **Layouts Rígidos (Calc Viewport)**: El uso de `h-[calc(100dvh-150px)]` en `MonitorView.jsx` y `CalculatorView.jsx` es frágil. En móviles, la barra de navegación del navegador (address bar) cambia el tamaño visible, rompiendo el diseño y ocultando contenido. | Mala experiencia en iOS/Android (contenido cortado o scroll doble innecesario). |
| 🟡 **Medio** | **UX** | **Falta de Estado de Carga en Calculadora**: `CalculatorView` usa `SAFE_RATES` (ceros) mientras carga. El usuario ve "0.00" en lugar de un Skeleton o Loader. | Confusión visual ("¿El precio es cero?"). |
| 🟡 **Medio** | **Lógica** | **Lógica de Magnitud "Mágica"**: La corrección de magnitud en `useRates` es compleja y se ejecuta en el cliente. Si falla, podría mostrar precios absurdos. | Riesgo de integridad de datos. |
| 🟢 **Leve** | **Lógica** | **Cálculos en Render**: `MonitorView` calcula `spread` y `diff` en cada render. | Impacto despreciable por ahora, pero optimizable. |

---

## 🛠️ Fase 3: Soluciones Propuestas (Top 3 Críticos)

### 1. Refactorización de `useRates.js` (Ciclo de Render y Waterfall)
**Problema**: Dependencias circulares reinician el `setInterval` y llamadas bloqueantes.
**Solución**:
1. Usar `useRef` para romper la dependencia del intervalo.
2. Ejecutar TODAS las promesas en paralelo (Google Script + USDT + Fallbacks).
3. Memoizar `updateData` correctamente.

```javascript
// src/hooks/useRates.js (Refactorizado)
import { useState, useEffect, useCallback, useRef } from 'react';

// ... (constantes DEFAULT_RATES, URLs, etc. se mantienen igual) ...

export function useRates() {
    // 1. Inicialización Lazy (Optimización Leve)
    const [rates, setRates] = useState(() => {
        try { return JSON.parse(localStorage.getItem('monitor_rates_v12')) || null; }
        catch { return null; }
    });

    const [loading, setLoading] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [logs, setLogs] = useState([]);
    
    // useRef para evitar re-renders innecesarios en dependencias
    const ratesRef = useRef(rates);

    useEffect(() => {
        ratesRef.current = rates;
        if (rates) localStorage.setItem('monitor_rates_v12', JSON.stringify(rates));
    }, [rates]);

    const addLog = useCallback((msg, type = 'info') => {
        // ... (lógica de logs igual) ...
    }, []);

    // ... (helpers parseSafeFloat, getMeta se mantienen) ...

    const updateData = useCallback(async (isAutoUpdate = false) => {
        if (!isAutoUpdate) setLoading(true); // Solo mostrar loading en carga manual/inicial
        // setIsOffline(false); // No resetear offline inmediatamente para evitar parpadeos

        // 2. PARALELISMO REAL: Lanzamos todas las peticiones a la vez
        const fetchPrivate = fetchGeneric(GOOGLE_SCRIPT_URL); // No await aquí
        const fetchUSDTTask = fetchUSDT();
        const fetchDolarApi = fetchGeneric('https://ve.dolarapi.com/v1/dolares');
        const fetchEuroFallback = getEuroFactorFallback();

        try {
            // Esperamos todo junto (Promise.allSettled es mejor, pero Promise.all funciona si manejamos errores internos)
            // Aquí usamos una estrategia híbrida: esperamos lo crítico.
            
            const [privateData, usdtResult, dolarApiData, euroFactor] = await Promise.all([
                fetchPrivate.catch(() => null), // Catch individual para no tumbar todo
                fetchUSDTTask.catch(() => null),
                fetchDolarApi.catch(() => null),
                fetchEuroFallback.catch(() => DEFAULT_EUR_USD_RATIO)
            ]);

            let newRates = { ...(ratesRef.current || DEFAULT_RATES) };
            
            // ... (Lógica de procesamiento de USDT igual) ...
            
            // ... (Lógica de procesamiento de PrivateData y Fallbacks igual) ...

            newRates.lastUpdate = new Date();
            setRates(newRates); // Esto disparará el efecto de persistencia, pero NO reiniciará el timer gracias a la refactorización abajo
            
            if (!isAutoUpdate) addLog("Actualización completada", 'success');

        } catch (e) {
            console.error(e);
            setIsOffline(true);
        } finally {
            setLoading(false);
        }
    }, [addLog]); // 'rates' YA NO es dependencia gracias a ratesRef o functional updates

    // 3. TIMER ESTABLE: Este efecto solo se monta UNA VEZ
    useEffect(() => {
        updateData(false); // Carga inicial
        const intervalId = setInterval(() => {
            updateData(true); // Auto-update silencioso
        }, UPDATE_INTERVAL);
        return () => clearInterval(intervalId);
    }, [updateData]); // updateData ahora es estable porque no depende de 'rates'

    return { rates: rates || DEFAULT_RATES, loading, isOffline, logs, updateData }; // ... notifications ...
}
```

### 2. Refactorización de Layouts (Flexbox vs Calc)
**Problema**: `h-[calc(100dvh-150px)]` rompe el diseño en móviles.
**Solución**: Usar Flexbox para llenar el espacio restante.

**En `App.jsx`:**
```jsx
// Contenedor principal
<div className="font-sans antialiased bg-slate-50 dark:bg-black h-[100dvh] flex flex-col overflow-hidden ...">
   {/* ... Overlays ... */}
   
   {/* Main Viewport: Flex-1 para ocupar todo el espacio disponible menos el menú */}
   <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 relative flex flex-col overflow-hidden"> 
      {/* El contenido interno también debe ser flex si necesita scroll propio */}
      {activeTab === 'monitor' && <MonitorView {...currentViewProps} />}
      {/* ... */}
   </main>

   {/* Navigation: Altura fija (no absoluta, relativa al flex container si se quiere, o fixed como está pero respetando padding en main) */}
   <div className="shrink-0 h-24 ..."> {/* Espacio reservado para nav */} </div>
</div>
```

**En `CalculatorView.jsx`:**
```jsx
// Eliminar h-[calc...] y usar h-full o flex-1 si el padre es flex
export default function CalculatorView(...) {
  return (
    <div className="flex flex-col h-full bg-slate-50 ..."> 
       <CalculatorHeader ... className="shrink-0" />
       
       <div className="flex-1 overflow-hidden relative ...">
          {/* Scrollable chat or manual mode */}
          ...
       </div>
    </div>
  );
}
```

### 3. UX: Estado de Carga (Skeleton) en Calculadora
**Problema**: Muestra "0.00" mientras carga.
**Solución**:

```jsx
// src/views/CalculatorView.jsx

// ... imports ...

export default function CalculatorView({ rates, loading, ...props }) { // Recibir loading
  
  // Si está cargando y no tenemos tasas válidas previas (rates son ceros o null)
  const isInitialLoading = loading && (!rates || rates.bcv.price === 0);

  if (isInitialLoading) {
      return (
          <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] p-6 animate-pulse">
              <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl mb-4"></div>
              <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          </div>
      );
  }

  // ... (Resto del componente igual)
}
```
