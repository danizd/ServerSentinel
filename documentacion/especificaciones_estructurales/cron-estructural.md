---
name: "cron-estructural"
version: "1.0.0"
fecha: "2026-06-12"
estado: "approved"
module: "cron"
dependencies: ["pipeline"]
related_adrs: []
---

# Especificación Estructural: Cron Setup

## 1. Propósito

Define la configuración del sistema de tareas programadas para el pipeline nocturno, monitoreo de servicios y mantenimiento de la base de datos.

## 2. Decisiones de Arquitectura

### 2.1 System Cron (No Agenda de Node.js)
- **Contexto:** Procesos que deben ejecutarse aunque la app Node.js no esté corriendo
- **Consecuencias:** Independencia del runtime de la aplicación
- **Restricciones:** Sin manejo de errores ni reintentos (depende del script)

### 2.2 Scripts Shell como Orquestadores
- **Contexto:** Necesidad de verificar prerequisitos antes de ejecutar
- **Consecuencias:** Scripts bash que verifican servicios antes de ejecutar el pipeline
- **Restricciones:** Depende de bash y herramientas del sistema

### 2.3 Logging a Archivo
- **Contexto:** Auditoría y debug de ejecuciones programadas
- **Consecuencias:** Cada ejecución genera un log con timestamp
- **Restricciones:** Logs crecen indefinidamente (necesita rotación)

## 3. Patrones de Diseño

### 3.1 Patrón: Guard Clause en Shell
- **Descripción:** Verificar prerequisitos antes de ejecutar
- **Implementación:** Scripts bash con checks iniciales
- **Trade-offs:** Fiabilidad vs. complejidad del script

## 4. Contratos de API

### 4.1 Cron Jobs
| Job | Frecuencia | Script | Propósito |
|-----|-----------|--------|-----------|
| nightly-pipeline | Diario 00:00 | `scripts/nightly.sh` | Generar reporte diario |
| health-check | Cada 5 min | `scripts/health-check.sh` | Verificar honeypots |
| db-maintenance | Semanal (dom 02:00) | `scripts/db-maintenance.sh` | VACUUM, purge, backup |
| log-rotation | Diario 01:00 | `scripts/log-rotation.sh` | Rotar archivos de log |

### 4.2 Script: nightly.sh
```bash
#!/bin/bash
# Verifica que Ollama esté corriendo
# Verifica que SQLite esté accesible
# Ejecuta: node src/pipeline/nightly.js
# Loguea resultado a logs/pipeline-{date}.log
# Exit code: 0 = éxito, 1 = error
```

### 4.3 Script: health-check.sh
```bash
#!/bin/bash
# Verifica HTTP honeypot (curl localhost:80)
# Verifica SSH honeypot (nc -z localhost 2222)
# Verifica FTP honeypot (nc -z localhost 2121)
# Verifica MySQL honeypot (nc -z localhost 3306)
# Verifica Ollama (curl localhost:11434/api/tags)
# Si algún servicio falla: log + restart via docker-compose
```

## 5. Modelos de Datos

### 5.1 Cron Expression Reference
```
# Pipeline nocturno: todos los días a las 00:00
0 0 * * * /path/to/scripts/nightly.sh

# Health check: cada 5 minutos
*/5 * * * * /path/to/scripts/health-check.sh

# DB maintenance: domingos a las 02:00
0 2 * * 0 /path/to/scripts/db-maintenance.sh

# Log rotation: todos los días a las 01:00
0 1 * * * /path/to/scripts/log-rotation.sh
```

## 6. Dependencias

### 6.1 Servicios del Sistema
- **cron / crond:** Daemon de tareas programadas
- **bash:** Shell para scripts
- **curl:** Health checks HTTP
- **nc (netcat):** Health checks TCP
- **docker-compose:** Restart de servicios

## 7. Restricciones Técnicas

### 7.1 Rendimiento
- Health check: máximo 30 segundos por ejecución
- Pipeline nocturno: máximo 5 minutos
- DB maintenance: máximo 10 minutos

### 7.2 Seguridad
- Scripts DEBEN tener permisos `755` (exec para owner, read para otros)
- Logs NO deben contener contraseñas ni tokens
- Scripts DEBEN usar rutas absolutas (no depender de PATH)

### 7.3 Fiabilidad
- Si un cron job falla 3 veces seguidas, DEBE notificar (email/webhook)
- Los logs DEBEN rotarse después de 30 días
- El backup semanal DEBE verificarse (test restore)

## 8. Convenciones

### 8.1 Naming
- Scripts: `scripts/{nombre}.sh`
- Logs: `logs/{nombre}-{date}.log`
- PIDs: `/tmp/sentinel-{service}.pid`

### 8.2 Estructura de Código
```
scripts/
├── nightly.sh           ← Pipeline nocturno
├── health-check.sh      ← Monitoreo de servicios
├── db-maintenance.sh    ← VACUUM + purge + backup
├── log-rotation.sh      ← Rotación de logs
├── setup-cron.sh        ← Instalación de cron jobs
└── utils.sh             ← Funciones compartidas
```

## 9. Notas de Implementación

- `setup-cron.sh` DEBE ser ejecutado una vez durante el deployment inicial
- Los cron jobs DEBEN usar la timezone del servidor (configurable)
- En RPi4, considerar que el sistema puede estar apagado (cron no ejecuta si está off)
- Alternativa: usar Docker healthchecks + restart policy en lugar de cron externo

## 10. Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | 2026-06-12 | Versión inicial |
