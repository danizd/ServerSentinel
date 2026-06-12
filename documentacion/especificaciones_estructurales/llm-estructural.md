---
name: "llm-estructural"
version: "1.0.0"
fecha: "2026-06-12"
estado: "approved"
module: "llm"
dependencies: ["infraestructura"]
related_adrs: []
---

# Especificación Estructural: Integración LLM

## 1. Propósito

Define la conexión con Ollama para generar respuestas HTTP realistas en tiempo real y análisis de ataques en el pipeline nocturno.

## 2. Decisiones de Arquitectura

### 2.1 Ollama como Runtime LLM
- **Contexto:** LLM local en el hardware del honeypot, sin dependencia de APIs externas
- **Consecuencias:** Sin costo por tokens, sin latencia de red, sin rate limits externos
- **Restricciones:** Requiere hardware con suficiente RAM (RPi4 con 4GB+)

### 2.2 Modelo Qwen 2.5:1.5b
- **Contexto:** Modelo pequeño optimizado para hardware limitado
- **Consecuencias:** Respuestas rápidas (~1-2s en RPi4), calidad aceptable para honeypot
- **Restricciones:** No apto para análisis complejo, solo para respuestas simuladas

### 2.3 Fail-Fast con Fallback
- **Contexto:** Ollama puede no estar disponible al inicio
- **Consecuencias:** Si Ollama no responde, se usan respuestas estáticas
- **Restricciones:** El honeypot DEBE funcionar sin LLM

## 3. Patrones de Diseño

### 3.1 Patrón: Circuit Breaker
- **Descripción:** Si Ollama falla 3 veces consecutivas, se desactiva temporalmente
- **Implementación:** Contador de fallos con timeout de reconexión (5 minutos)
- **Trade-offs:** Evita retry storm vs. puede desactivar LLM innecesariamente

### 3.2 Patrón: Prompt Template
- **Descripción:** Prompts predefinidos para cada tipo de interacción
- **Implementación:** Templates con variables interpoladas (IP, payload, contexto)
- **Trade-offs:** Consistencia vs. rigidez

## 4. Contratos de API

### 4.1 Generar Respuesta HTTP
```typescript
function generateHTTPResponse(context: HTTPContext): Promise<string>
// context: { path, method, body, previous_messages }
// Retorna: respuesta HTML/JSON para el atacante
```

### 4.2 Analizar Ataque
```typescript
function analyzeAttack(attacks: AttackRecord[]): Promise<AnalysisResult>
// Retorna: resumen, severidad, IOCs, tendencias
```

### 4.3 Verificar Disponibilidad
```typescript
function isOllamaAvailable(): Promise<boolean>
// Retorna: true si Ollama responde health check
```

## 5. Modelos de Datos

### 5.1 HTTP Context (Input para LLM)
```typescript
interface HTTPContext {
  path: string;
  method: string;
  body: string | null;
  headers: Record<string, string>;
  previous_messages: ChatMessage[];
  attacker_ip: string;
}
```

### 5.2 Chat Message
```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
```

### 5.3 Analysis Result (Output del pipeline)
```typescript
interface AnalysisResult {
  executive_summary: string;
  per_ip_detail: IPDetail[];
  trends: string[];
  iocs: IOC[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}
```

### 5.4 IOC (Indicador de Compromiso)
```typescript
interface IOC {
  type: 'ip' | 'user_agent' | 'payload_pattern';
  value: string;
  confidence: number;  // 0-1
  context: string;
}
```

## 6. Dependencias

### 6.1 Servicios Externos
- **Ollama:** Runtime LLM local
  - URL: configurable (default `http://localhost:11434`)
  - Modelo: `qwen2.5:1.5b`
  - Health check: `GET /api/tags`

### 6.2 Librerías
- **fetch nativo (Node 18+):** Comunicación HTTP con Ollama

## 7. Restricciones Técnicas

### 7.1 Rendimiento
- Latencia máxima de respuesta LLM: 5s (timeout)
- Máximo de tokens de output: 500 (para respuestas HTTP)
- Máximo de tokens de input: 2000 (para análisis de pipeline)

### 7.2 Seguridad
- Los prompts NO deben revelar que es un honeypot
- Las respuestas NO deben contener información del host real
- Los datos de atacantes NO deben enviarse a APIs externas

### 7.3 Disponibilidad
- Si Ollama no está disponible, el sistema continúa en modo degradado
- Circuit breaker: 3 fallos → desactivar por 5 minutos
- Reintentos: máximo 2 con backoff de 1s, 2s

## 8. Convenciones

### 8.1 Naming
- Prompts: `prompt-{contexto}.txt` en `templates/prompts/`
- Variables en prompts: `{{variable}}`

### 8.2 Estructura de Código
```
src/llm/
├── ollama.js           ← Cliente Ollama (health, generate, analyze)
├── prompts/
│   ├── http-response.js  ← Templates para respuestas HTTP
│   └── analysis.js       ← Templates para análisis de pipeline
├── circuit-breaker.js  ← Lógica de circuit breaker
└── fallback.js         ← Respuestas estáticas predefinidas
```

## 9. Notas de Implementación

- El modelo DEBE estar descargado antes de iniciar el honeypot (verificar con `ollama list`)
- Los prompts DEBEN ser testeados manualmente para calidad
- El fallback DEBE cubrir todas las rutas HTTP del honeypot
- En RPi4, considerar `OLLAMA_NUM_PARALLEL=1` para evitar OOM

## 10. Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | 2026-06-12 | Versión inicial |
