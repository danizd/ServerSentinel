# Vectores de Interrogación — Comité de Arquitectura Hostil

## Vectores Generales (aplican a todos los documentos)

### AMBIGÜEDAD_TERMINOLÓGICA
**Pregunta clave:** ¿Los términos tienen definiciones únicas y consistentes?

**Ejemplos:**
- "En la sección X defines 'servicio' como X, pero en la sección Y lo usas para referirte a Z. ¿Cuál es la definición canónica?"
- "El término 'módulo' aparece 15 veces con 3 significados diferentes. ¿Podemos acordar una sola definición?"

### CONTRADICCIÓN_IMPLÍCITA
**Pregunta clave:** ¿Las afirmaciones de diferentes secciones son mutuamente consistentes?

**Ejemplos:**
- "En ADR-001 declaras que 'no hay estado compartido', pero en el diagrama de componentes muestras una caché compartida. ¿Cómo reconciliamos esto?"
- "La sección de restricciones dice 'latencia < 100ms' pero la de escalabilidad asume 'procesamiento asíncrono'. ¿Son compatibles?"

### ASUNCIÓN_NO_EXPLICITA
**Pregunta clave:** ¿Qué está dando por sentado sin declararlo?

**Ejemplos:**
- "Asumes que todos los clientes son HTTP/2. ¿Qué pasa con clientes legacy que usen HTTP/1.1?"
- "No mencionas manejo de errores. ¿Qué ocurre cuando el servicio externo falla?"

### INCOMPLETITUD
**Pregunta clave:** ¿Qué falta que debería estar?

**Ejemplos:**
- "Defines los endpoints pero no mencionas autenticación. ¿Es intencional o se omitió?"
- "El glosario tiene 20 términos pero solo 8 aparecen en casos de uso. ¿Los demás son decorativos?"

### VIOLACIÓN_RFC2119
**Pregunta clave:** ¿El lenguaje cumple con RFC 2119?

**Ejemplos:**
- "Dices 'el sistema podría reintentar'. ¿DEBE reintentar o es opcional? La ambigüedad genera implementaciones inconsistentes."
- "Usas 'debe' y 'debería' indistintamente. ¿Cuál es la intensión real?"

---

## Vectores para Documentos Estructurales

### ESCALABILIDAD
**Pregunta clave:** ¿La decisión escala con el crecimiento del sistema?

**Ejemplos:**
- "Usas una cola Redis单一 para todo. ¿Qué pasa cuando necesitas 10x el tráfico actual?"
- "El patrón monolítico funciona con 5 endpoints. ¿Qué pasa con 50?"

### Mantenibilidad
**Pregunta clave:** ¿Un developer nuevo entendería esta decisión en 6 meses?

**Ejemplos:**
- "El acoplamiento entre módulos A y B es tan estrecho que cambios en A rompen B. ¿Es esto sostenible?"
- "No hay documentación de por qué se eligió tecnología X sobre Y. ¿Qué pasa cuando alguien pregunte?"

### Seguridad
**Pregunta clave:** ¿La decisión introduce superficies de ataque?

**Ejemplos:**
- "Almacenas tokens en localStorage. ¿Has considerado XSS?"
- "El endpoint de debug está en producción. ¿Está protegido?"

### Consistencia
**Pregunta clave:** ¿La decisión es coherente con el resto del sistema?

**Ejemplos:**
- "En el módulo A usas REST, en B usas GraphQL, en C usas gRPC. ¿Hay una razón arquitectónica?"
- "La estrategia de errores es inconsistente entre módulos. ¿Es intencional?"

### Trazabilidad
**Pregunta clave:** ¿Cada decisión referencia su origen?

**Ejemplos:**
- "Esta decisión de diseño no referencia ningún ADR. ¿De dónde vino?"
- "El ADR-003 dice 'según análisis del Q1' pero no hay link al análisis."

---

## Vectores para Documentos Funcionales

### Casos de Uso
**Pregunta clave:** ¿Los flujos cubren todos los escenarios?

**Ejemplos:**
- "El flujo de compra asume que el usuario siempre está autenticado. ¿Qué pasa con invitados?"
- "No hay flujo de error. ¿Qué ve el usuario cuando falla el pago?"

### Reglas de Negocio
**Pregunta clave:** ¿Las reglas son completas y no contradictorias?

**Ejemplos:**
- "Dices 'máximo 5 productos por orden' pero el carrito permite 10. ¿Quién tiene razón?"
- "La regla de descuentos no considera devoluciones. ¿Qué pasa?"

### Glosario
**Pregunta clave:** ¿Los términos son suficientes y no redundantes?

**Ejemplos:**
- "Tienes 'cliente' y 'usuario' definidos diferente. ¿Cuándo se usa cada uno?"
- "Falta definir 'transacción' que aparece en 3 flujos."

### Invariantes
**Pregunta clave:** ¿Las propiedades que siempre deben ser ciertas están declaradas?

**Ejemplos:**
- "¿El saldo de una cuenta NUNCA puede ser negativo? No lo mencionas."
- "¿Un pedido EN PROCESO puede cancelarse? No está claro."

---

## Vectores para el Futurista

### Obsolescencia
**Pregunta clave:** ¿Envejecerá mal esta decisión?

**Ejemplos:**
- "Te estás acoplando fuertemente a la API de proveedor X. ¿Qué pasa si cambian el contrato?"
- "La arquitectura asume monolito. ¿Qué pasa cuando necesites microservicios?"

### Portabilidad
**Pregunta clave:** ¿La decisión es dependiente del proveedor?

**Ejemplos:**
- "Usas una特性 exclusiva de PostgreSQL. ¿Qué pasa si necesitas migrar a MySQL?"
- "El SDK de proveedor X está en todo el código. ¿Es extraíble?"

### Evolución
**Pregunta clave:** ¿La decisión permite evolución sin reescritura?

**Ejemplos:**
- "El esquema de BD no tiene campos de auditoría. ¿Cómo evolucionas sin perder histórico?"
- "Los contratos de API son v1 sin versionado. ¿Cómo manejas breaking changes?"

---

## Guía de Aplicación

### Para cada sección del documento:

1. **Identificar** qué vectores aplican (no todos aplican a todas las secciones)
2. **Generar** al menos 2 preguntas por vector presente
3. **Priorizar** preguntas por impacto potencial (contradicciones > ambigüedad > incompletitud)
4. **Formatear** usando el formato socrático estándar
5. **Esperar** respuesta antes de continuar con la siguiente pregunta

### Ejemplo de aplicación:

**Sección: "Autenticación"**

Vectores aplicables: AMBIGÜEDAD_TERMINOLÓGICA, SEGURIDAD, COMPLETITUD

**Pregunta 1 (SEGURIDAD):**
🔍 **Comité de Arquitectura** [vector: SEGURIDAD]

Defines autenticación por JWT pero no mencionas:
- Tiempo de expiración del token
- Revocación de tokens
- Rate limiting en el endpoint de login

→ ¿Estas omisiones son intencionales o se omitieron? Un atacante podría explotar tokens que nunca expiran.

**Pregunta 2 (COMPLETITUD):**
🔍 **Comité de Arquitectura** [vector: COMPLETITUD]

El flujo de autenticación asume que el usuario siempre tiene credenciales válidas.

→ ¿Qué ve el usuario cuando falla la autenticación? ¿Hay flujos de recuperación de contraseña?