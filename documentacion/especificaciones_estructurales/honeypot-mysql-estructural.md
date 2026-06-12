---
name: "honeypot-mysql-estructural"
version: "1.0.0"
fecha: "2026-06-12"
estado: "approved"
module: "honeypot-mysql"
dependencies: ["infraestructura", "base-datos"]
related_adrs: []
---

# Especificación Estructural: Honeypot MySQL

## 1. Propósito

Define el servidor MySQL falso que responde al handshake de protocolo MySQL, acepta autenticación y responde a queries básicas, capturando intentos de acceso y consultas SQL.

## 2. Decisiones de Arquitectura

### 2.1 Aceptar Cualquier Credencial
- **Contexto:** Maximizar engagement del atacante
- **Consecuencias:** Handshake completo exitoso con cualquier user/password
- **Restricciones:** El atacante obtiene acceso a "base de datos" ficticia

### 2.2 Respuestas a Queries Básicas
- **Contexto:** Simular una base de datos real para mantener al atacante interactuando
- **Consecuencias:** Queries SELECT retornan datos ficticios; DDL/DML retornan OK
- **Restricciones:** No hay estado real entre queries (cada query es independiente)

### 2.3 Protocolo MySQL Nativo
- **Contexto:** Herramientas como mysql client, sqlmap, Navicat deben conectarse correctamente
- **Consecuencias:** Implementación del wire protocol MySQL (handshake, auth, queries)
- **Restricciones:** Complejidad de implementación del protocolo

## 3. Patrones de Diseño

### 3.1 Patrón: Wire Protocol Handler
- **Descripción:** Implementación del protocolo MySQL a nivel de bytes
- **Implementación:** Parsing de packets MySQL, generación de respuestas according al protocol
- **Trade-offs:** Compatibilidad total vs. complejidad de implementación

## 4. Contratos de API

### 4.1 Handshake MySQL
- **Protocolo:** MySQL 5.7.x compatible
- **Server Greeting:** Versión ficticia, scramble (salt) para auth
- **Auth Response:** Acepta cualquier combinación user/password
- **Response:** OK packet tras auth exitosa

### 4.2 Queries Soportadas
| Query | Respuesta |
|-------|-----------|
| `SELECT VERSION()` | `5.7.42-0ubuntu0.18.04.1` |
| `SELECT USER()` | `root@localhost` |
| `SELECT DATABASE()` | `NULL` |
| `SHOW DATABASES` | Lista de DBs ficticias |
| `SHOW TABLES` | Lista de tablas ficticias |
| `DESCRIBE [table]` | Estructura ficticia de tabla |
| `SELECT * FROM [table]` | Datos ficticios (máx 10 rows) |
| `INSERT/UPDATE/DELETE` | `Query OK, 0 rows affected` |
| `CREATE TABLE` | `Query OK, 0 rows affected` |
| `USE [db]` | `Database changed` |
| `*` (cualquier otra) | `You have an error in your SQL syntax` |

### 4.3 Base de Datos Ficticia
```
Database: production_db
├── users (id, username, email, password_hash, role, created_at)
├── orders (id, user_id, total, status, created_at)
├── products (id, name, price, stock, category)
├── logs (id, action, ip_address, timestamp)
└── config (key, value, updated_at)
```

## 5. Modelos de Datos

### 5.1 MySQL Session
```typescript
interface MySQLSession {
  session_id: number;       // FK → sessions.id
  username: string;         // username intentado
  authenticated: boolean;   // siempre true
  current_db: string;       // database seleccionada
  queries: MySQLQuery[];    // queries ejecutadas
}
```

### 5.2 MySQL Query
```typescript
interface MySQLQuery {
  query: string;            // SQL query completa
  response_code: number;    // 0 = OK, 1 = error
  response_data: any;       // datos de respuesta (si SELECT)
  affected_rows: number;    // rows afectados (si DML)
  execution_time_ms: number; // tiempo ficticio de ejecución
  timestamp: string;        // ISO 8601
}
```

## 6. Dependencias

### 6.1 Librerías
- **Ninguna externa** — Implementación nativa del wire protocol MySQL
- Alternativa: `mysql2` solo para parsing de packets (no para conexión real)

## 7. Restricciones Técnicas

### 7.1 Rendimiento
- Conexiones MySQL simultáneas: máximo 20
- Timeout de sesión inactiva: 8 horas (como MySQL real)
- Queries por segundo: máximo 50

### 7.2 Seguridad
- NO debe ejecutar ninguna query real contra una DB
- NO debe exponer datos del sistema de archivos
- NO debe permitir LOAD DATA INFILE (lectura de archivos del host)
- NO debe permitir UDF (User Defined Functions)
- Puerto por defecto: 3306 (puerto estándar MySQL)

### 7.3 Compatibilidad
- Compatible con: mysql client, sqlmap, Navicat, DBeaver, Workbench
- Soportar: charset utf8mb4, collation utf8mb4_unicode_ci
- Handshake: MySQL 5.7 compatible (no 8.0 para evitar cambios de auth)

## 8. Convenciones

### 8.1 Naming
- Puerto por defecto: 3306
- Charset: utf8mb4
- Collation: utf8mb4_unicode_ci

### 8.2 Estructura de Código
```
src/honeypots/mysql.js
├── server.js           ← TCP server + MySQL wire protocol
├── handshake.js        ← Server greeting + auth
├── protocol.js         ← Packet parsing/generation
├── queries.js          ← Query handlers + fake data
└── data/
    └── fake-data.js    ← Datos ficticios para cada tabla
```

## 9. Notas de Implementación

- El handshake DEBE incluir scramble (salt) para que sqlmap no detecte el honeypot
- Las respuestas DEBEN ser binariamente compatibles con el protocolo MySQL
- Los datos ficticios DEBEN ser consistentes entre queries (mismos usuarios, mismos productos)
- Registrar cada query SQL en SQLite para análisis posterior

## 10. Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | 2026-06-12 | Versión inicial |
