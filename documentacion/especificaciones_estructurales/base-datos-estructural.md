---
name: "base-datos-estructural"
version: "1.0.0"
fecha: "2026-06-12"
estado: "approved"
module: "base-datos"
dependencies: ["infraestructura"]
related_adrs: []
---

# Especificación Estructural: Base de Datos

## 1. Propósito

Define el esquema SQLite, el conector, las queries y la estrategia de retención para almacenar datos de ataques, sesiones e informes.

## 2. Decisiones de Arquitectura

### 2.1 SQLite con WAL Mode
- **Contexto:** Concurrencia de lectura/escritura entre honeypots y pipeline nocturno
- **Consecuencias:** Lecturas no bloquean escrituras y viceversa
- **Restricciones:** Un solo writer a la vez (aceptable)

### 2.2 Retención Configurable
- **Contexto:** RPi4 tiene espacio limitado (~32GB SD)
- **Consecuencias:** Los datos más antiguos se purgan automáticamente
- **Restricciones:** Default 90 días, configurable vía `DATA_RETENTION_DAYS`

### 2.3 Connection Manager con Retry
- **Contexto:** SQLite puede fallar por locks o disco lleno
- **Consecuencias:** Reintentos automáticos con backoff exponencial
- **Restricciones:** Máximo 3 reintentos antes de fallar

## 3. Patrones de Diseño

### 3.1 Patrón: Repository Pattern
- **Descripción:** Aislamiento de lógica de acceso a datos
- **Implementación:** `db/queries.js` expone funciones tipadas para cada operación
- **Trade-offs:** Abstracción vs. simplicidad

## 4. Contratos de API

### 4.1 Insertar Attack
```typescript
function insertAttack(attack: AttackRecord): number
// Retorna: rowid insertado
```

### 4.2 Insertar Session
```typescript
function insertSession(session: SessionRecord): number
// Retorna: session_id
```

### 4.3 Obtener Attacks por Fecha
```typescript
function getAttacksByDate(date: string): AttackRecord[]
// date formato: YYYY-MM-DD
```

### 4.4 Obtener Stats del Día
```typescript
function getDailyStats(date: string): DailyStats
```

### 4.5 Purge de Datos Antiguos
```typescript
function purgeOldData(retentionDays: number): number
// Retorna: número de registros eliminados
```

## 5. Modelos de Datos

### 5.1 Tabla: attacks
```sql
CREATE TABLE IF NOT EXISTS attacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER,
  source_ip TEXT NOT NULL,
  service TEXT NOT NULL,          -- 'http' | 'ssh' | 'ftp' | 'mysql'
  attack_type TEXT NOT NULL,      -- 'login_attempt' | 'command' | 'query' | 'request'
  severity TEXT DEFAULT 'low',    -- 'low' | 'medium' | 'high' | 'critical'
  payload TEXT,                   -- datos capturados (comando, query, body)
  response TEXT,                  -- respuesta enviada al atacante
  metadata TEXT,                  -- JSON adicional (user-agent, headers, etc.)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```
- **Índices:** `idx_attacks_source_ip`, `idx_attacks_created_at`, `idx_attacks_service`
- **Relaciones:** FK → sessions.session_id

### 5.2 Tabla: sessions
```sql
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_ip TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  attack_count INTEGER DEFAULT 0,
  services_used TEXT              -- JSON array: ['http', 'ssh']
);
```
- **Índices:** `idx_sessions_source_ip`, `idx_sessions_started_at`

### 5.3 Tabla: reports
```sql
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_date TEXT NOT NULL UNIQUE,
  html_path TEXT,                 -- ruta al archivo HTML generado
  attacks_total INTEGER,
  unique_ips INTEGER,
  generated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## 6. Dependencias

### 6.1 Servicios Externos
- **Ninguno** — SQLite es self-contained

### 6.2 Librerías
- **better-sqlite3:** Driver síncrono con soporte WAL

## 7. Restricciones Técnicas

### 7.1 Rendimiento
- Escrituras: máximo 100/s (limitado por I/O en RPi4)
- Lecturas: sin límite práctico con WAL
- Tamaño máximo de DB: configurable, default 1GB

### 7.2 Seguridad
- El archivo SQLite NO debe ser accesible desde fuera del contenedor
- No loguear payloads que contengan datos sensibles del host

### 7.3 Integridad
- WAL mode DEBE estar habilitado al inicio de cada conexión
- PRAGMA `busy_timeout` DEBE ser 5000ms mínimo
- PRAGMA `synchronous` DEBE ser `NORMAL` (balance rendimiento/integridad)

## 8. Convenciones

### 8.1 Naming
- Tablas: `snake_case` singular
- Columnas: `snake_case`
- Índices: `idx_{tabla}_{columna}`
- Queries: funciones nombradas en `camelCase`

### 8.2 Estructura de Código
```
src/db/
├── connection.js    ← Apertura de conexión, WAL setup, pragmas
├── queries.js       ← Funciones de acceso a datos
├── migrations.js    ← Creación de tablas (IF NOT EXISTS)
└── purge.js         ← Limpieza de datos antiguos
```

## 9. Notas de Implementación

- Usar `better-sqlite3` (síncrono) en lugar de `sqlite3` (async) para simplificar el código
- El purge se ejecuta como parte del pipeline nocturno
- En RPi4, considerar usar una SD card de alta calidad (A2) para I/O

## 10. Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | 2026-06-12 | Versión inicial |
