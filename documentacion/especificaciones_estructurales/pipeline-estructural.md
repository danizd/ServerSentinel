---
name: "pipeline-estructural"
version: "1.0.0"
fecha: "2026-06-12"
estado: "approved"
module: "pipeline"
dependencies: ["base-datos", "llm"]
related_adrs: []
---

# Especificación Estructural: Pipeline Nocturno

## 1. Propósito

Define el proceso automatizado que ejecuta diariamente: lee ataques de SQLite, analiza con LLM, genera reporte Markdown, convierte a HTML y publica en el blog estático.

## 2. Decisiones de Arquitectura

### 2.1 Ejecución Via Cron
- **Contexto:** Proceso batch diario, no necesita servidor persistente
- **Consecuencias:** System cron ejecuta el script a las 00:00
- **Restricciones:** Si el sistema está apagado a medianoche, se pierde la ejecución

### 2.2 Agrupación por Timestamp
- **Contexto:** Los ataques se agrupan por día usando `created_at`
- **Consecuencias:** Un ataque de las 23:55 va al informe del día correcto
- **Restricciones:** El pipeline procesa un día completo por ejecución

### 2.3 Markdown → HTML
- **Contexto:** El reporte se genera en Markdown y se convierte a HTML estático
- **Consecuencias:** Fácil de leer, fácil de generar, fácil de servir
- **Restricciones:** Sin interactividad (es un documento estático)

## 3. Patrones de Diseño

### 3.1 Patrón: ETL (Extract, Transform, Load)
- **Descripción:** Extraer de SQLite, transformar con LLM, cargar a HTML
- **Implementación:** Pipeline secuencial de 4 pasos
- **Trade-offs:** Simple vs. no paralelizable

## 4. Contratos de API

### 4.1 Ejecutar Pipeline
```typescript
function runNightlyPipeline(date?: string): Promise<PipelineResult>
// date: día a procesar (default: ayer)
// Retorna: resultado de la ejecución
```

### 4.2 Pipeline Result
```typescript
interface PipelineResult {
  success: boolean;
  date: string;              // YYYY-MM-DD
  attacks_processed: number;
  unique_ips: number;
  report_path: string;       // ruta al HTML generado
  error?: string;            // si falló
}
```

## 5. Modelos de Datos

### 5.1 Flujo del Pipeline
```
1. Extract: queries.getAttacksByDate(date)
2. Transform: llm.analyzeAttack(attacks) → AnalysisResult
3. Generate: markdown generation from AnalysisResult
4. Convert: marked.parse(markdown) → HTML
5. Publish: write to blog/{date}.html
6. Record: db.insertReport(...)
7. Cleanup: db.purgeOldData(retentionDays)
```

### 5.2 Estructura del Reporte Markdown
```markdown
# Threat Report — {date}

## Executive Summary
{resumen ejecutivo del LLM}

## Attack Statistics
- Total attacks: {n}
- Unique IPs: {n}
- Most active: {top IPs}

## Per-IP Detail
### {ip_1}
- Attacks: {n}
- Services: {lista}
- Notable: {comportamiento notable}

## Trends
{tendencias identificadas por el LLM}

## IOCs
| Type | Value | Confidence |
|------|-------|------------|
| ip   | x.x.x.x | 0.9    |
```

## 6. Dependencias

### 6.1 Servicios Externos
- **Ollama:** Para análisis de ataques. Fallback: análisis básico sin LLM
- **SQLite:** Fuente de datos de ataques

### 6.2 Librerías
- **marked:** Conversión Markdown → HTML
- **meow** (opcional): CLI argument parsing

## 7. Restricciones Técnicas

### 7.1 Rendimiento
- Tiempo máximo de ejecución: 5 minutos
- Memoria máxima: 512MB (para RPi4)
- Output máximo: 1MB de HTML por reporte

### 7.2 Seguridad
- El pipeline NO debe exponer datos sensibles del host
- Los IOCs generados NO deben incluir IPs del honeypot
- El HTML generado NO debe contener scripts inline

### 7.3 Fiabilidad
- Si el pipeline falla, DEBE loggear el error y notificar
- Si el LLM falla, el pipeline DEBE continuar con análisis básico
- El reporte del día anterior NO debe ser sobrescrito

## 8. Convenciones

### 8.1 Naming
- Reportes: `blog/{YYYY-MM-DD}.html`
- Scripts: `src/pipeline/nightly.js`
- Logs: `logs/pipeline-{date}.log`

### 8.2 Estructura de Código
```
src/pipeline/
├── nightly.js         ← Entry point del pipeline
├── extract.js         ← Queries a SQLite
├── analyze.js         ← Análisis con LLM
├── generate.js        ← Generación de Markdown
├── convert.js         ← Markdown → HTML
└── publish.js         ← Escritura a blog/
```

## 9. Notas de Implementación

- El pipeline DEBE ser idempotente (ejecutar dos veces el mismo día no duplica reportes)
- El template HTML DEBE ser responsivo (se ve bien en móvil y desktop)
- Los logs DEBEN incluir timestamp y nivel de severidad
- En RPi4, considerar ejecutar el pipeline con `nice` para no afectar honeypots

## 10. Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | 2026-06-12 | Versión inicial |
