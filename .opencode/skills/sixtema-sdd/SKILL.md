---
name: sixtema-sdd
description: Pipeline SDD que convierte los outputs de grill-with-docs en documentación de arquitectura production-grade. Clasifica documentos en especificaciones estructurales y funcionales, lanza interrogación socrática con Comité de Arquitectura Hostil, y genera AGENTS.md de enrutado. Úsalo cuando el usuario quiera convertir, estructurar, validar o refinar documentación generada por grill-with-docs, o cuando mencione "sixtema", "SDD", "especificaciones estructurales", "especificaciones funcionales", "comité de arquitectura", o quiera crear carpeta documentacion/.
---

# SIXTEMA-SDD

Pipeline de Especificaciones Dirigidas por Diseño (SDD) que convierte los outputs de grill-with-docs en documentación de arquitectura production-grade, validada por un Comité de Arquitectura Hostil y enrutada para agentes de IA.

---

## FASE 0 — DESCUBRIMIENTO DE INPUTS

Antes de cualquier otra acción, explora el repositorio en busca de los documentos generados por grill-with-docs:

**Buscar en este orden:**
1. `CONTEXT.md` en la raíz
2. `docs/adr/*.md` (ADRs individuales)
3. `CONTEXT-MAP.md` + contextos múltiples si existe
4. Cualquier `.md` que contenga frontmatter `name`/`description` o secciones como `## Glossary`, `## Decision`, `## Context`, `## Status`

**Si no encuentras ningún documento input, detente y avisa:**

> "No encuentro documentos generados por grill-with-docs en este repositorio. Por favor ejecuta primero /grill-with-docs o proporciona la ruta de los .md a procesar."

---

## FASE 1 — CLASIFICACIÓN AUTOMÁTICA

Lee el documento completo e identifica la naturaleza de cada sección.

### Criterio de clasificación

**ESTRUCTURAL** — responde a "¿cómo está construido el sistema?":
- Decisiones de arquitectura (ADRs)
- Patrones de diseño y principios estructurales
- Esquemas de datos, modelos de dominio, contratos de API
- Dependencias, integraciones, topología de servicios
- Restricciones técnicas (rendimiento, seguridad, escala)
- Convenciones de código y fronteras de contexto

**FUNCIONAL** — responde a "¿qué hace el sistema y para quién?":
- Glosario de dominio (términos del negocio)
- Casos de uso, flujos de usuario, comportamientos esperados
- Reglas de negocio y invariantes del dominio
- Terminología canónica del proyecto

### Regla para documentos mixtos

Si una sección mezcla ambas naturalezas, NO la rechaces. En su lugar:
1. Extrae las frases/párrafos de naturaleza estructural → van al archivo estructural
2. Extrae las frases/párrafos de naturaleza funcional → van al archivo funcional
3. Si una frase es genuinamente indivisible, clasifícala por su peso dominante y añade una nota `<!-- clasificado por peso dominante: [razón] -->` al final de la sección

---

## FASE 2 — INTERROGACIÓN SOCRÁTICA IMPLACABLE (OBLIGATORIA SIEMPRE)

> ⚠️ Esta fase es NO NEGOCIABLE y se ejecuta sobre TODOS los documentos, incluso cuando aparentemente no hay errores. Un documento sin errores visibles es simplemente un documento con errores no encontrados todavía.

### Adopta el rol del Comité de Arquitectura Hostil

Eres un comité de arquitectura de software compuesto por tres perfiles:
- **El Escéptico**: cuestiona cada asunción implícita
- **El Forense**: busca contradicciones entre secciones
- **El Futurista**: señala decisiones que no escalan o envejecen mal

### Protocolo de interrogación

1. Para **CADA** sección del documento, evalúa los siguientes vectores y genera al menos 2 preguntas por vector presente
2. Haz las preguntas de una en una, espera respuesta, y continúa
3. Lee `references/interrogation-vectors.md` para la lista completa de vectores y ejemplos de preguntas por tipo de documento

### Formato de pregunta socrática

```
🔍 **Comité de Arquitectura** [vector: AMBIGÜEDAD_TERMINOLÓGICA]

En la sección "Gestión de Pedidos" defines 'Orden' como la intención de compra,
pero en el ADR-003 tratas 'Orden' y 'Pedido' como sinónimos.

→ ¿Son conceptos intercambiables o representan estados distintos del proceso?
  Mi recomendación: separarlos. 'Orden' = intención validada; 'Pedido' = fulfillment iniciado.
```

### Criterio de fin de interrogación

La interrogación termina cuando se cumplan las **tres condiciones**:
1. Todos los vectores de todos los documentos han sido cuestionados al menos una vez
2. Cada respuesta del usuario ha sido confrontada con el resto del documento (sin contradicciones pendientes sin resolver)
3. El usuario confirma explícitamente: "Continuad" / "Proceder" / "Aprobado"

---

## FASE 3 — GENERACIÓN DE ESTRUCTURA DE CARPETAS

Una vez finalizada la interrogación socrática, crea la siguiente estructura:

```
AGENTS.md                                    ← En raíz del proyecto
documentacion/
├── especificaciones_estructurales/
│   ├── [nombre-modulo]-estructural.md    (uno por contexto/módulo)
│   └── ...
└── especificaciones_funcionales/
    ├── [nombre-modulo]-funcional.md      (uno por contexto/módulo)
    └── ...
```

> **Nota importante:** El `AGENTS.md` DEBE estar en la raíz del proyecto para que los agentes de IA lo encuentren inmediatamente. Las rutas dentro de `AGENTS.md` deben ser relativas desde la raíz (ej: `documentacion/especificaciones_funcionales/core-funcional.md`).

### Reglas de nombrado:
- Usa el nombre del módulo/contexto en `kebab-case`
- Nunca `spec-1.md` ni `documento.md` — el nombre debe ser semánticamente descriptivo
- Si el input es solo `CONTEXT.md` sin contextos múltiples: `core-estructural.md` y `core-funcional.md`
- Si hay ADRs individuales: cada ADR va al archivo estructural del módulo que afecta

---

## FASE 4 — ESCRITURA DE ESPECIFICACIONES

Para cada especificación, usa la plantilla correspondiente.

Lee `references/templates.md` para las plantillas exactas de:
- Especificación Estructural
- Especificación Funcional

### Principios de escritura

- **Sin ambigüedad tolerable**: Cada término debe tener exactamente una definición
- **Sin "puede" ni "podría"**: Usa "DEBE", "NO DEBE", "PUEDE" (RFC 2119)
- **Sin referencias circulares**: Si A depende de B, B debe estar definido antes que A
- **Versionado obligatorio**: Cada spec incluye `version`, `fecha` y `estado`
- **Trazabilidad**: Cada decisión estructural referencia el ADR que la originó

---

## FASE 5 — VALIDACIÓN POST-ESCRITURA

Antes de escribir los archivos a disco, ejecuta esta checklist interna:

### VALIDACIÓN ESTRUCTURAL:
- [ ] ¿Toda decisión técnica referencia su ADR origen?
- [ ] ¿Todos los términos técnicos están definidos en la spec funcional del mismo módulo?
- [ ] ¿Las restricciones no se contradicen entre secciones?
- [ ] ¿Los contratos de API son completos (request + response + errores)?

### VALIDACIÓN FUNCIONAL:
- [ ] ¿Todo término del glosario aparece en al menos un caso de uso?
- [ ] ¿Todas las reglas de negocio tienen un invariante explícito?
- [ ] ¿Los flujos de usuario tienen precondiciones y postcondiciones?
- [ ] ¿Los casos de uso están escritos en lenguaje del dominio (no técnico)?

### VALIDACIÓN CRUZADA:
- [ ] ¿Ningún término funcional contradice su implementación estructural?
- [ ] ¿Todos los módulos referenciados en AGENTS.md tienen su spec correspondiente?

> Si algún ítem falla, vuelve a la **Fase 2** con el vector específico fallido antes de escribir el archivo.

---

## FASE 6 — GENERACIÓN DE AGENTS.md

El `AGENTS.md` es el mapa de navegación para agentes de IA. Cada funcionalidad del proyecto tiene su propia entrada con los punteros exactos a las specs que ese agente necesita leer.

Lee `references/agents-format.md` para la plantilla completa y ejemplos de enrutado.

### Principios de enrutado

- **Mínimo contexto necesario**: El agente debe leer SOLO lo que necesita
- **Sin specs completas innecesarias**: Si una feature solo necesita 2 secciones de una spec, cita las secciones, no el archivo entero
- **Orden de lectura explícito**: Cuando hay dependencias entre specs, indica el orden
- **Aviso de contratos**: Señala explícitamente qué contratos/interfaces no debe romper

---

## MODO REPARACIÓN

Si el usuario proporciona specs ya existentes en `documentacion/` para revisar:

1. Lee todos los archivos existentes
2. Ejecuta la **Fase 2** completa (interrogación socrática)
3. Propón un diff de los cambios necesarios, sección por sección
4. Espera aprobación antes de escribir

---

## NOTAS DE COMPATIBILIDAD CON WINDSURF/DEVIN

- Todas las rutas son relativas a la raíz del proyecto
- Los archivos se crean con `create_file` o equivalente del agente
- El `AGENTS.md` usa rutas relativas desde la raíz del proyecto
- Compatible con el sistema de reglas `.windsurfrules` y `CLAUDE.md` del proyecto