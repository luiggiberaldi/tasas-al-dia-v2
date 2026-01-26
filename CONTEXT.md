# 📘 PROYECTO: TasasAlDía (PWA Monitor Financiero)

## 🎯 Visión
Una Progressive Web App (PWA) para Venezuela que monitorea tasas de cambio (BCV/Paralelo), calcula conversiones con IA (Groq), gestiona una billetera local y notifica cambios de tasa.

## 🛠 Tech Stack
- **Core:** React 19 + Vite.
- **Estilos:** Tailwind CSS (Diseño "Electric Gold" & Slate).
- **IA:** Groq SDK (Llama 3) para interpretación de voz y generación de mensajes de cobro.
- **Datos:** APIs externas (DolarAPI, Binance P2P, Google Scripts) + LocalStorage.
- **Notificaciones:** OneSignal.
- **Iconos:** Lucide React.

## 📂 Estructura Crítica
- `/src/hooks`: Lógica de negocio (useRates, useCalculator, useWallet).
- `/src/views`: Vistas principales (Monitor, Calculadora, Billetera, Catálogo).
- `/src/components`: UI reutilizable (Modales, Inputs, Tarjetas).
- `/directivas`: (NUEVO) Documentación de arquitecturas y planes de implementación.

## 🌟 Hitos Recientes (Enero 2026)
### 1. Responsividad Total
- Diseño fluido desde Móvil Small (320px) hasta Laptop Grande (1280px).
- Modos de grilla adaptativos (1 col móvil -> 4 cols laptop).

### 2. Catálogo de Productos (Store)
- Gestión local (CRUD) de productos en USDT.
- **Precio Efectivo Sugerido:** Cálculo automático de `Base + 5%` con redondeo inteligente a enteros.
- **Previsualización en Vivo:** Cálculo de Bs, Ref BCV y Ref Euro al crear/editar.

### 3. Rendimiento
- Auto-Update de tasas cada 30 segundos.
- Eliminación de dependencias de servidor local (Arquitectura 100% Frontend).

## ⚠️ Reglas de Desarrollo (PDA v1.0)
1. **Regla del Átomo:** Un agente = Una tarea específica.
2. **Consultar Directivas:** Antes de codificar, leer o crear el archivo en `directivas/`.
3. **No romper UI:** Mantener el modo oscuro/claro y la responsividad móvil.
4. **Seguridad:** API Keys van en `.env`, nunca en el código.
5. **Auto-Corrección:** Si algo falla, actualizar la Directiva correspondiente con la solución.