# Refactoring Example: Data Processor

Este documento muestra cómo refactorizar una función monolítica que viola los principios SOLID, DRY y KISS.

## 🔴 ANTES (Código Sucio)

```javascript
// procesarDatos.js
// ❌ Función demasiado larga (> 40 líneas)
// ❌ Mezcla lógica de negocio, formateo y validación
// ❌ Nombres de variables poco claros (d, x, arr)
// ❌ No maneja errores de forma robusta

function procesar(d) {
    let arr = [];
    if (d && d.length > 0) {
        for (let i = 0; i < d.length; i++) {
            let x = d[i];
            if (x.active === true) {
                 // Cálculo complejo quemado aquí
                let val = x.price * 1.16; 
                if (x.type === 'premium') {
                    val = val * 0.9; // Descuento mágico
                }
                
                // Formateo mezclado con lógica
                let date = new Date().toISOString().split('T')[0];
                
                arr.push({
                    n: x.name.toUpperCase(),
                    p: val.toFixed(2),
                    d: date
                });
            }
        }
    }
    return arr;
}
```

---

## 🟢 DESPUÉS (Clean Architecture)

```javascript
// dataProcessor.js
// ✅ Nombres descriptivos
// ✅ Funciones pequeñas y reutilizables (SRP)
// ✅ Constantes para valores mágicos
// ✅ Separación de preocupaciones

const TAX_RATE = 1.16;
const PREMIUM_DISCOUNT = 0.9;

/**
 * Calcula el precio final con impuestos y descuentos.
 */
const calculateFinalPrice = (price, type) => {
    let finalPrice = price * TAX_RATE;
    if (type === 'premium') {
        finalPrice *= PREMIUM_DISCOUNT;
    }
    return parseFloat(finalPrice.toFixed(2));
};

/**
 * Formatea la fecha actual a YYYY-MM-DD.
 */
const getFormattedDate = () => {
    return new Date().toISOString().split('T')[0];
};

/**
 * Procesa una lista de items activos.
 */
export const processActiveItems = (items) => {
    if (!items || !Array.isArray(items)) {
        console.warn('processActiveItems: Input inválido');
        return [];
    }

    return items
        .filter(item => item.active)
        .map(item => ({
            name: item.name.toUpperCase(),
            price: calculateFinalPrice(item.price, item.type),
            date: getFormattedDate()
        }));
};
```
