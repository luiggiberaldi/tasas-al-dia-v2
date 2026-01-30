---
name: production-ready
description: Valida que el código esté listo para producción, enfocado en seguridad, manejo de errores y rendimiento
---

# Production Ready Skill

## Validaciones Críticas

### 1. Manejo de Errores (Robustez)
- [ ] **Try-Catch**: Exigir bloques `try-catch` en todas las operaciones críticas:
    - Llamadas a APIs (fetch, axios, etc.)
    - Operaciones de Base de Datos
    - Cálculos complejos o propensos a fallos
- [ ] **Feedback**: El usuario debe recibir feedback visual en caso de error (no solo logs en consola).

### 2. Seguridad
- [ ] **Secretos**: Verificar que NO haya claves de API, contraseñas, tokens o URLs sensibles "quemadas" (hardcoded) en el código. Usar variables de entorno (`.env`).
- [ ] **Validación de Entradas**: Sanitizar o validar datos de entrada para prevenir inyecciones.

### 3. Rendimiento (PWA & Mobile)
- [ ] **Eficiencia de Memoria**: Validar que el código no tenga fugas de memoria (e.g., event listeners no removidos).
- [ ] **Bucles Optimizados**: Evitar bucles anidados innecesarios (`O(n^2)`) en grandes conjuntos de datos.
- [ ] **Lazy Loading**: Uso de `React.lazy` o imports dinámicos para componentes pesados.
