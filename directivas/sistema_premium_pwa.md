# Directiva: Sistema Premium PWA (PDA v1.0)

Esta directiva define la arquitectura de seguridad y monetización para "TasasAlDía". El objetivo es restringir el acceso a funcionalidades avanzadas (Catálogo y Calculadora IA) mediante un sistema de licenciamiento por dispositivo.

## 1. Arquitectura de Seguridad (`useSecurity.js`)

### Generación de Device ID
- El sistema generará un **ID de Instalación** único para cada dispositivo.
- **Formato:** `TASAS-XXXX` (donde XXXX son 4 caracteres alfanuméricos aleatorios).
- **Persistencia:** Se guardará en `localStorage` bajo la key `device_id`.
- Si el usuario borra datos del navegador, se generará un nuevo ID (perdiendo la licencia anterior), lo cual es comportamiento esperado para webs, pero se puede mitigar pidiendo al usuario que guarde su código.

### Validación de Licencia
- **Token:** Se buscará la key `premium_token` en `localStorage`.
- **Algoritmo de Verificación:**
  El código de activación válido será el resultado de un Hash (SHA-256 recortado o algoritmo custom simple) concatenando:
  `Hash(deviceId + SECRET_MASTER_KEY)`
- **Validación Local:** La validación ocurre en el cliente (`verifyLicense(inputCode, deviceId)`). Esto permite que funcione **Offline**.

## 2. Componentes UI

### `PremiumGuard.jsx` (El Portero)
Este componente envolverá las rutas protegidas.
- **Props:** `children` (contenido protegido).
- **Lógica:**
    - Si `useSecurity().isPremium` es `true` → Renderiza `children`.
    - Si es `false` → Renderiza la **Pantalla de Ventas**.

#### Pantalla de Ventas (Paywall)
Diseño elegante "Glassmorphism" que contiene:
1.  Título: "Mister Cambio Premium 👑"
2.  Beneficios:
    - 🤖 Asistente IA Ilimitado
    - 📒 Catálogo de Cuentas & Productos
    - 🚫 Sin Publicidad (Futuro)
3.  **Tu ID de Instalación:** [ `TASAS-A1B2` ] (Botón copiar)
4.  Input para ingresar el **Código de Activación**.
5.  Botón de WhatsApp para contactar al soporte y comprar la licencia enviando el ID.

## 3. Panel de Administrador (Oculto)

Para evitar crear un backend complejo, el generador de claves estará oculto en la misma app.
- **Acceso:** 10 clicks rápidos en el logo de "TasasAlDía" (Header).
- **Funcionalidad:**
    - Input: "ID del Cliente" (ej: TASAS-A1B2).
    - Output: "Código de Activación" (Generado con la `SECRET_MASTER_KEY`).
- Este generador solo confirma la matemática, no guarda base de datos.

## 4. Alcance del Bloqueo

| Módulo | Estado |
| :--- | :--- |
| **Monitor (Inicio)** | ✅ **Gratis** (Gancho de atracción) |
| **Calculadora Clásica** | ✅ **Gratis** (Utilidad básica) |
| **Calculadora IA** | 🔒 **Premium** (Valor añadido alto) |
| **Catálogo/Tienda** | 🔒 **Premium** (Herramienta de negocio) |
| **Wallet (Cuentas)** | ✅ **Gratis** (Para que la calculadora clásica sirva) |

## 5. Flujo de Usuario
1. Usuario intenta entrar a "Tienda".
2. Ve el Paywall con su ID `TASAS-99ZZ`.
3. Copia el ID y toca "Comprar Licencia" (Abre WhatsApp tuyo).
4. Te envía: "Quiero premium, mi ID es TASAS-99ZZ".
5. Tú abres tu app, entras al menú secreto, pegas el ID.
6. La app te da el código: `ACTIV-77AA`.
7. Tú se lo envías y cobras.
8. El usuario lo pega y desbloquea instantáneamente.
