# Directiva: Feature Catálogo de Productos

## 1. Objetivo
Reemplazar la vista `InfoView` por `ProductsView`, un catálogo personal donde el usuario puede guardar productos con precio base en USDT y ver sus conversiones en tiempo real (VES/EUR) según la tasa del día.

## 2. Estado Global & Datos
- **Persistencia:** `localStorage`
- **Key:** `my_products_v1`
- **Modelo de Datos:**
  ```json
  {
    "id": "uuid (crypto.randomUUID)",
    "name": "Nombre Producto",
    "priceUsdt": 10.50, // Number
    "image": "base64_string", // Optimizada/Comprimida
    "createdAt": "ISO String"
  }
  ```

## 3. Lógica de Conversión (CORREGIDO)
El sistema debe calcular visualmente:
1.  **Base en Bolívares (Real):**
    `Monto_Bs = product.priceUsdt * rates.usdt.price`
2.  **Referencia Dólar BCV (Facturación):**
    `Ref_USD_BCV = Monto_Bs / rates.bcv.price`
    *(Ej: Si el producto vale 10 USDT -> Son ~600 Bs -> Son ~$15 BCV)*
3.  **Referencia Euro BCV:**
    `Ref_EUR_BCV = Monto_Bs / rates.euro.price`

## 4. UI/UX
- **Layout:**
  - **Header:** Título "Mis Productos" + Botón "Añadir".
  - **Formulario (Modal/Expandible):**
    - Input de Foto (con preview).
    - Input Nombre.
    - Input Precio en USDT.
  - **Grid:** Layout responsivo (1 col móvil, 2 cols tablet).
  - **Tarjeta de Producto:**
    - Imagen (Cover).
    - Título.
    - Precio Principal: **$XX.XX USDT** (Grande).
    - Precios Secundarios: *Bs. XX.XX* / *€ XX.XX* (Calculados).

## 5. Integración
- **Archivo:** `src/views/ProductsView.jsx` (Nuevo).
- **Rutas:** Reemplazar importación de `InfoView` en `App.jsx`.
- **Navegación:** Cambiar icono de Info (`Info` icon) por Tienda (`Store` o `Package` de lucide-react).

## 6. Restricciones
- Imágenes deben redimensionarse antes de guardar para no llenar el localStorage (Max 500px width).
