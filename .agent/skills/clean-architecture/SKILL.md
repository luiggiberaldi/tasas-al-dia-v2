---
name: clean-architecture
description: Asegura que el código siga principios SOLID, DRY y KISS para mejorar la mantenibilidad
---

# Clean Architecture Skill

## Checklist de Revisión

### 1. Nomenclatura
- [ ] **Descriptiva**: Las variables y funciones deben indicar claramente su propósito.
- [ ] **Idioma**: Inglés o Español, pero consistente en todo el archivo/proyecto.
- [ ] **Convenciones**: camelCase para variables/funciones, PascalCase para clases/componentes, CONSTANT_CASE para constantes.

### 2. Modularidad
- [ ] **Tamaño**: Las funciones no deben exceder las 40 líneas de código.
- [ ] **Responsabilidad Única (SRP)**: Cada función debe hacer una sola cosa y hacerla bien.
- [ ] **Reutilización**: Extraer lógica repetida a funciones auxiliares o hooks (DRY).

### 3. Desacoplamiento
- [ ] **Separación de Capas**: Clara separación entre lógica de negocio, acceso a datos y la interfaz de usuario (UI).
- [ ] **Dependencias**: Inyección de dependencias donde sea posible en lugar de hardcoding.
- [ ] **Componentes Puros**: En React, preferir componentes presentacionales puros cuando sea posible.
