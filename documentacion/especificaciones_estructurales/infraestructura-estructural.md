---
name: "infraestructura-estructural"
version: "1.0.0"
fecha: "2026-06-12"
estado: "approved"
module: "infraestructura"
dependencies: []
related_adrs: []
---

# Especificación Estructural: Infraestructura

## 1. Propósito

Define la estructura base del proyecto, dependencias, sistema de build, orquestación con Docker y configuración de entorno para el honeypot ServerSentinel.

## 2. Decisiones de Arquitectura

### 2.1 Runtime: Node.js
- **Contexto:** Necesidad de un runtime ligero con ecosistema maduro para servicios de red
- **Consecuencias:** Dependencia del ecosistema npm, acceso a librerías de protocolos (SSH, FTP, MySQL)
- **Restricciones:** Versión mínima Node.js 18 LTS (por soporte ESM y fetch nativo)

### 2.2 Web Framework: Fastify
- **Contexto:** Necesidad de un framework HTTP de alto rendimiento con bajo overhead
- **Consecuencias:** Rendimiento superior a Express, schema validation integrada, plugins decoradores
- **Restricciones:** Ecosistema de plugins menor que Express

### 2.3 Containerización: Docker Compose
- **Contexto:** Orquestación de múltiples servicios (honeypots, Ollama, blog server) en un solo comando
- **Consecuencias:** Aislamiento de servicios, facilita deployment en RPi4 y Mini PC
- **Restricciones:** Requiere Docker y Docker Compose instalados en el host

### 2.4 SQLite con WAL Mode
- **Contexto:** Persistencia de datos de atacantes con concurrencia de lectura/escritura
- **Consecuencias:** Escrituras concurrentes sin bloqueo, lecturas paralelas
- **Restricciones:** Un solo writer a la vez (aceptable para honeypot personal)

## 3. Patrones de Diseño

### 3.1 Patrón: Microservicios Ligeros
- **Descripción:** Cada honeypot es un módulo independiente con su propio servidor de red
- **Implementación:** Módulos ES separados que se importan en el proceso principal
- **Trade-offs:** Flexibilidad vs. complejidad de orquestación

### 3.2 Patrón: Fail-Fast con Degradación
- **Descripción:** Si un componente crítico falla, el sistema continúa en modo degradado
- **Implementación:** Honeypots funcionan sin LLM; respuestas estáticas predefinidas
- **Trade-offs:** Disponibilidad vs. calidad de respuestas

## 4. Contratos de API

### 4.1 API de Administración (Interna)
- **Método:** GET
- **Ruta:** `/admin/stats`
- **Request:** Sin body
- **Response 200:**
  ```json
  {
    "attacks_today": "number",
    "active_sessions": "number",
    "top_attacker_ips": ["string"],
    "uptime_seconds": "number"
  }
  ```
- **Errores:**
  - `503`: Servicio no disponible (sistema en modo degradado)

## 5. Modelos de Datos

### 5.1 Configuración de Entorno
```typescript
interface EnvConfig {
  // Puerto del honeypot HTTP
  HTTP_PORT: number;          // default: 80
  // Puerto del honeypot SSH
  SSH_PORT: number;           // default: 2222
  // Puerto del honeypot FTP
  FTP_PORT: number;           // default: 2121
  // Puerto del honeypot MySQL
  MYSQL_PORT: number;         // default: 3306
  // Puerto del blog
  BLOG_PORT: number;          // default: 8080
  // URL de Ollama
  OLLAMA_URL: string;         // default: http://localhost:11434
  // Modelo LLM
  LLM_MODEL: string;          // default: qwen2.5:1.5b
  // Ruta de la BD SQLite
  DB_PATH: string;            // default: ./data/sentinel.db
  // Retención de datos en días
  DATA_RETENTION_DAYS: number; // default: 90
  // Rate limit: requests por minuto por IP
  RATE_LIMIT_RPM: number;     // default: 60
  // Modo de simulación
  SIMULATION_MODE: string;    // "full" | "minimal"
}
```

## 6. Dependencias

### 6.1 Servicios Externos
- **Ollama:** Runtime LLM local. Requiere que esté corriendo antes del honeypot HTTP. Fallback: respuestas estáticas.

### 6.2 Librerías Principales
- **fastify:** ~4.x — Framework HTTP de alto rendimiento
- **better-sqlite3:** ~9.x — Driver SQLite síncrono con WAL support
- **ssh2:** ~1.x — Server SSH falso
- **basic-ftp:** ~5.x — Server FTP falso
- **mysql2:** ~3.x — Protocolo MySQL handshake
- **marked:** ~12.x — Conversión Markdown a HTML

## 7. Restricciones Técnicas

### 7.1 Rendimiento
- Latencia máxima de respuesta HTTP: 200ms (sin LLM)
- Conexiones SSH simultáneas: máximo 50
- Escrituras SQLite por segundo: máximo 100

### 7.2 Seguridad
- El honeypot NO debe exponer datos del host real
- No hardcodear IPs privadas del host en respuestas
- Variables sensibles (si las hubiera) en `.env`, nunca en código

### 7.3 Disponibilidad
- Uptime requerido: 99% (honeypot personal)
- Estrategia de fallback: modo degradado sin LLM
- Recovery: redeploy desde Docker Compose

## 8. Convenciones

### 8.1 Naming
- Archivos de configuración: `kebab-case`
- Variables de entorno: `UPPER_SNAKE_CASE`
- Módulos de código: `camelCase`

### 8.2 Estructura de Código
```
/
├── src/
│   ├── index.js              ← Entry point
│   ├── honeypots/
│   │   ├── http.js
│   │   ├── ssh.js
│   │   ├── ftp.js
│   │   └── mysql.js
│   ├── llm/
│   │   └── ollama.js
│   ├── db/
│   │   ├── connection.js
│   │   └── queries.js
│   ├── pipeline/
│   │   └── nightly.js
│   └── utils/
│       ├── rate-limiter.js
│       └── classifier.js
├── data/                     ← SQLite DB (gitignored)
├── blog/                     ← HTML output (gitignored)
├── templates/                ← HTML templates
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

## 9. Notas de Implementación

- El directorio `data/` DEBE estar en `.gitignore`
- El directorio `blog/` puede ser servido por cualquier web server estático
- Docker Compose maneja la secuencia de startup: DB → Ollama → Honeypots → Blog
- En RPi4, considerar `--memory` limits en docker-compose para evitar OOM

## 10. Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | 2026-06-12 | Versión inicial |
