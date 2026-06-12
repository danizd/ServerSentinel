---
name: "lecciones-aprendidas"
version: "1.0.0"
fecha: "2026-06-12"
estado: "approved"
module: "meta"
---

# Lecciones Aprendidas — ServerSentinel

## Errores Comunes y Cómo Evitarlos

### 1. Colisión de nombres con importaciones de dotenv

**Error:**
```
SyntaxError: Identifier 'config' has already been declared
```

**Causa:** Importar `config` desde dotenv y declarar `const config = {...}` en el mismo archivo.

**Solución:** Renombrar la variable a `appConfig` o usar alias en la importación:
```js
import { config as dotenvConfig } from 'dotenv';
```

**Regla:** Nunca usar el nombre `config` como variable cuando se importa `config` de dotenv.

---

### 2. Módulos CommonJS en ES Modules

**Error:**
```
SyntaxError: Named export 'Server' not found. The requested module 'ssh2' is a CommonJS module
```

**Causa:** Paquetes npm como `ssh2` son CommonJS y no soportan named exports en ESM.

**Solución:** Importar como default y desestructurar:
```js
import ssh2pkg from 'ssh2';
const { Server } = ssh2pkg;
```

**Regla:** Verificar si un paquete es CommonJS antes de importar. Si es así, usar import default.

---

### 3. better-sqlite3 requiere compilación nativa

**Error:**
```
gyp ERR! find VS You need to install the latest version of Visual Studio
```

**Causa:** `better-sqlite3` usa node-gyp para compilar código C++. Requiere Visual Studio Build Tools en Windows.

**Solución:** Usar `sql.js` en su lugar — SQLite puro en JavaScript/WebAssembly, sin compilación nativa.

**Regla:** En Windows sin Visual Studio, usar `sql.js` en lugar de `better-sqlite3`.

---

### 4. Inicialización asíncrona de sql.js

**Error:** La DB retorna `undefined` o falla silenciosamente.

**Causa:** `sql.js` requiere `await initSqlJs()` antes de crear la DB, pero `better-sqlite3` es síncrono.

**Solución:** Hacer que `getDb()` sea `async` y usar `await` en todos los puntos de llamada.

**Regla:** Cuando se migra de better-sqlite3 a sql.js, todos los callers de `getDb()` DEBEN usar `await`.

---

### 5. Persistencia manual de sql.js

**Causa:** A diferencia de better-sqlite3 que escribe a disco automáticamente, sql.js guarda en memoria.

**Solución:** Llamar `saveDb()` explícitamente antes de cerrar la DB:
```js
import { saveDb, closeDb } from './db/connection.js';
// Al cerrar:
saveDb();
closeDb();
```

**Regla:** sql.js requiere `saveDb()` antes de `closeDb()` para persistir cambios.

---

## Patrones de Codeo para Este Proyecto

### ESM (ES Modules)
- Usar `import/export` en todos los archivos
- `import pkg from 'cjs-package'; const { named } = pkg;` para CommonJS
- `import { config as dotenvConfig } from 'dotenv';` para evitar colisiones

### Base de Datos
- `sql.js` para compatibilidad cross-platform
- `getDb()` es async, siempre usar `await`
- `saveDb()` antes de `closeDb()` para persistir
- `queryAll()`, `queryOne()`, `runSql()` como helpers internos

### Honeypots
- Cada honeypot exporta `start[Service]Honeypot(db, config)`
- Todos logean ataques via `insertAttack(db, attack)`
- Ninguno ejecuta código del host real
- Todos usan respuestas predefinidas, no dinámicas

### LLM
- Circuit breaker: 3 fallos → fallback 5 minutos
- Fallback SIEMPRE disponible para cada ruta
- `isAvailable()` check antes de generar
- Timeout de 5 segundos máximo
