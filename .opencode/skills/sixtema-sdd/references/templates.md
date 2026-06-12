# Plantillas de Especificaciones — SIXTEMA-SDD

## Plantilla: Especificación Estructural

```markdown
---
name: "[nombre-modulo]-estructural"
version: "1.0.0"
fecha: "YYYY-MM-DD"
estado: "draft | review | approved"
module: "[nombre-del-modulo]"
dependencies: []
related_adrs: ["ADR-001", "ADR-002"]
---

# Especificación Estructural: [Nombre del Módulo]

## 1. Propósito

[Descripción en 1-2 oraciones de qué resuelve este módulo en la arquitectura]

## 2. Decisiones de Arquitectura

### 2.1 [Decisión 1]
- **ADR Referencia:** [ADR-XXX]
- **Contexto:** [Situación que motivó la decisión]
- **Consecuencias:** [Impacto en la arquitectura]
- **Restricciones:** [Limitaciones impuestas]

### 2.2 [Decisión 2]
[Repetir estructura]

## 3. Patrones de Diseño

### 3.1 Patrón Utilizado: [Nombre del Patrón]
- **Descripción:** [Qué resuelve]
- **Implementación:** [Cómo se aplica en este contexto]
- **Trade-offs:** [Qué se gana y qué se pierde]

## 4. Contratos de API

### 4.1 [Nombre del Endpoint/Servicio]
- **Método:** [GET/POST/PUT/DELETE/etc.]
- **Ruta:** [/api/v1/recurso]
- **Request:**
  ```json
  {
    "campo": "tipo (requerido/opcional) - descripción"
  }
  ```
- **Response 200:**
  ```json
  {
    "campo": "tipo - descripción"
  }
  ```
- **Errores:**
  - `400`: [Descripción]
  - `401`: [Descripción]
  - `500`: [Descripción]

## 5. Modelos de Datos

### 5.1 [Nombre de la Entidad]
```typescript
interface Entidad {
  id: string;          // UUID v4
  campo: string;       // Descripción
  timestamp: Date;     // ISO 8601
}
```
- **Restricciones:** [Validaciones, longitudes, formatos]
- **Relaciones:** [Cómo se conecta con otras entidades]

## 6. Dependencias

### 6.1 Servicios Externos
- **[Servicio X]:** [Propósito, SLA, fallback si falla]

### 6.2 Librerías Internas
- **[Librería Y]:** [Versión, propósito]

## 7. Restricciones Técnicas

### 7.1 Rendimiento
- Latencia máxima: [Xms]
- Throughput mínimo: [Y req/s]
- Conexiones simultáneas: [Z]

### 7.2 Seguridad
- Autenticación: [Mecanismo]
- Autorización: [Modelo]
- Datos sensibles: [Cómo se manejan]

### 7.3 Disponibilidad
- Uptime requerido: [X%]
- Estrategia de fallback: [Descripción]
- Recovery Point Objective: [X horas/minutos]

## 8. Convenciones

### 8.1 Naming
- Endpoints: [kebab-case / camelCase]
- Variables: [camelCase]
- Tablas: [snake_case]

### 8.2 Estructura de Código
- [Convención 1]
- [Convención 2]

## 9. Notas de Implementación

- [Cualquier nota relevante para developers]
- [Advertencias conocidas]
- [Tech debt identificado]

## 10. Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | YYYY-MM-DD | Versión inicial |
```

---

## Plantilla: Especificación Funcional

```markdown
---
name: "[nombre-modulo]-funcional"
version: "1.0.0"
fecha: "YYYY-MM-DD"
estado: "draft | review | approved"
module: "[nombre-del-modulo]"
---

# Especificación Funcional: [Nombre del Módulo]

## 1. Propósito

[Descripción en 1-2 oraciones de qué resuelve este módulo para el negocio/usuario]

## 2. Glosario de Dominio

| Término | Definición | Ejemplo |
|---------|------------|---------|
| [Término 1] | [Definición clara y concisa] | [Ejemplo de uso] |
| [Término 2] | [Definición clara y concisa] | [Ejemplo de uso] |

> **Regla:** Cada término DEBE tener exactamente una definición. Si un término tiene múltiples significados, crear entradas separadas con contexto de uso.

## 3. Casos de Uso

### 3.1 [Nombre del Caso de Uso]
- **ID:** CU-001
- **Actor:** [Quién lo ejecuta]
- **Precondiciones:** [Qué debe ser cierto antes]
- **Postcondiciones:** [Qué será cierto después]
- **Flujo Principal:**
  1. [Paso 1]
  2. [Paso 2]
  3. [Paso 3]
- **Flujos Alternativos:**
  - [Escenario A]: [Descripción]
  - [Escenario B]: [Descripción]
- **Flujos de Excepción:**
  - [Error X]: [Cómo se maneja]
  - [Error Y]: [Cómo se maneja]

### 3.2 [Nombre del Caso de Uso]
[Repetir estructura]

## 4. Reglas de Negocio

### 4.1 [Nombre de la Regla]
- **ID:** RN-001
- **Descripción:** [Regla clara e inequívoca]
- **Invariante:** [Propiedad que siempre debe cumplirse]
- **Validación:** [Cómo se verifica]
- **Ejemplo:** [Caso de aplicación]

### 4.2 [Nombre de la Regla]
[Repetir estructura]

## 5. Flujos de Usuario

### 5.1 [Nombre del Flujo]
```mermaid
graph LR
    A[Inicio] --> B[Paso 1]
    B --> C[Paso 2]
    C --> D[Fin]
```

- **Descripción:** [Qué logra el usuario]
- **Pasos detallados:**
  1. [Acción del usuario]
  2. [Respuesta del sistema]
  3. [Acción del usuario]

## 6. Invariantes del Dominio

| ID | Invariante | Verificación |
|----|------------|--------------|
| INV-001 | [Propiedad que siempre debe ser cierta] | [Cómo se verifica] |
| INV-002 | [Propiedad que siempre debe ser cierta] | [Cómo se verifica] |

## 7. Restricciones de Negocio

### 7.1 [Categoría]
- [Restricción 1]
- [Restricción 2]

## 8. Métricas de Éxito

- [Métrica 1]: [Objetivo]
- [Métrica 2]: [Objetivo]

## 9. No Funcional (desde perspectiva de usuario)

- **Tiempo de respuesta:** [X segundos máximo]
- **Disponibilidad:** [X%]
- **Usabilidad:** [Requisitos específicos]

## 10. Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | YYYY-MM-DD | Versión inicial |
```

---

## Principios de Escritura

### Sin Ambigüedad Tolerable
- ❌ "El sistema maneja errores de forma apropiada"
- ✅ "El sistema retorna HTTP 500 con body `{"error": "Descripción del error"}` cuando falla"

### Sin "Puede" ni "Podría"
- ❌ "El usuario podría querer cancelar el pedido"
- ✅ "El usuario DEBE poder cancelar el pedido antes de que cambie a estado ENVIADO"

### Sin Referencias Circulares
- ❌ "Módulo A depende de Módulo B, que depende de Módulo A"
- ✅ "Módulo A depende de Módulo B. Módulo B NO depende de Módulo A."

### Versionado Obligatorio
Cada spec DEBE incluir:
- `version`: SemVer (1.0.0)
- `fecha`: YYYY-MM-DD
- `estado`: draft | review | approved

### Trazabilidad
Cada decisión estructural DEBE referencia el ADR que la originó:
```markdown
### 2.1 Base de Datos
- **ADR Referencia:** ADR-003
- **Contexto:** Necesitábamos persistencia con transacciones ACID
- **Consecuencias:** Acoplamiento a PostgreSQL, pero ganamos consistencia
```