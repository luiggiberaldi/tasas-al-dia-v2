---
name: performance-ux-expert
description: Optimiza el rendimiento del código y la responsividad de la interfaz. Úsalo al crear componentes UI, manejar estados pesados o realizar llamadas a APIs.
---

# Performance & UX Expert

## Guía de Optimización de Rendimiento
- **Lazy Loading**: Prioriza la carga perezosa de imágenes y componentes que no son visibles de inmediato.
- **Debouncing/Throttling**: Aplica estas técnicas en inputs de búsqueda o eventos de scroll para evitar sobrecarga del procesador.
- **Caché Inteligente**: Implementa estrategias de almacenamiento local (LocalStorage/IndexedDB) para datos frecuentes como tasas de cambio.
- **Minimización de Re-renders**: En frameworks como React/Vue, evita renderizados innecesarios verificando las dependencias.

## Guía de Responsividad (Mobile-First)
- **Flexbox/Grid**: Usa layouts fluidos en lugar de anchos fijos en píxeles.
- **Touch-Target Size**: Asegura que botones y enlaces tengan un tamaño mínimo de 44x44px para una buena experiencia táctil.
- **Adaptive UI**: Verifica que los componentes se adapten de móviles a tablets y desktops sin romper el layout.

## Cómo usarlo
- Antes de finalizar un componente, revisa si hay imágenes sin optimizar o procesos que bloqueen el hilo principal.
- Ejecuta una auditoría rápida de "Critical Rendering Path" si el código afecta el tiempo de carga inicial.
