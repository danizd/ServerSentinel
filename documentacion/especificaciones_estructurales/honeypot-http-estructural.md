---
name: "honeypot-http-estructural"
version: "1.0.0"
fecha: "2026-06-12"
estado: "approved"
module: "honeypot-http"
dependencies: ["infraestructura", "base-datos", "llm"]
related_adrs: []
---

# Especificación Estructural: Honeypot HTTP

## 1. Propósito

Define el servidor HTTP falso que simula un panel de administración, captura requests de atacantes y genera respuestas realistas usando LLM con fallback a respuestas estáticas.

## 2. Decisiones de Arquitectura

### 2.1 Fastify como Framework
- **Contexto:** Necesidad de alto rendimiento con schema validation
- **Consecuencias:** Plugins para CORS, helmet, rate limiting
- **Restricciones:** Ecosistema de plugins menor que Express

### 2.2 Dual Mode Login
- **Contexto:** Maximizar tiempo de engagement del atacante
- **Consecuencias:** Login captura credenciales Y simula dashboard si coinciden con predefinidas
- **Restricciones:** Credenciales hardcodeadas: admin/admin

### 2.3 Respuestas Estáticas como Fallback
- **Contexto:** Ollama puede no estar disponible
- **Consecuencias:** HTML predefinido para cada ruta, sin dependencia del LLM
- **Restricciones:** Respuestas menos realistas pero funcionales

### 2.4 Rate Limiting por IP
- **Contexto:** Prevenir DoS contra el honeypot
- **Consecuencias:** Máximo 60 requests/min por IP (configurable)
- **Restricciones:** Atacante puede rotar IPs para evadir

## 3. Patrones de Diseño

### 3.1 Patrón: Middleware Chain
- **Descripción:** Request → Rate Limit → Logger → Router → Responder
- **Implementación:** Fastify hooks y plugins
- **Trade-offs:** Separación de concerns vs. latencia acumulada

### 3.2 Patrón: Strategy Pattern (Respuestas)
- **Descripción:** Selección de estrategia de respuesta según disponibilidad del LLM
- **Implementación:** Si Ollama disponible → LLM; si no → estático
- **Trade-offs:** Complejidad vs. resiliencia

## 4. Contratos de API

### 4.1 Login Page
- **Método:** GET
- **Ruta:** `/`
- **Response 200:** HTML con formulario de login falso

### 4.2 Process Login
- **Método:** POST
- **Ruta:** `/login`
- **Request:**
  ```json
  {
    "username": "string (requerido)",
    "password": "string (requerido)"
  }
  ```
- **Response 200:** HTML del dashboard (si credenciales = admin/admin)
- **Response 200:** HTML de error de login (si credenciales incorrectas)
- **Response 429:** Rate limit excedido
- **Nota:** SIEMPRE retorna 200 (nunca 401) para no alertar al atacante

### 4.3 Dashboard
- **Método:** GET
- **Ruta:** `/dashboard`
- **Response 200:** HTML con panel falso (solo accesible post-login exitoso)
- **Response 302:** Redirect a `/` (si no hay sesión activa)

### 4.4 API Endpoints (Falsos)
- **Método:** GET/POST
- **Ruta:** `/api/v1/*`
- **Response 200:** JSON con datos ficticios (usuarios, logs, config)
- **Nota:** Todos los endpoints son capturados y registrados

### 4.5 Captura de Assets
- **Método:** GET
- **Ruta:** `/*` (catch-all)
- **Response 200:** 404 page falso o redirect a `/`
- **Nota:** Cualquier path no definido se registra como attack

## 5. Modelos de Datos

### 5.1 HTTP Request Capturado
```typescript
interface HttpRequest {
  method: string;         // GET, POST, PUT, DELETE
  path: string;           // /login, /api/v1/users
  headers: object;        // todos los headers
  body: string | null;    // body del request
  query: object;          // query parameters
  source_ip: string;      // IP del atacante
  user_agent: string;     // User-Agent header
  timestamp: string;      // ISO 8601
}
```

### 5.2 Session HTTP
```typescript
interface HttpSession {
  session_id: number;     // FK → sessions.id
  cookies: object;        // cookies seteadas
  logged_in: boolean;     // si completó login
  pages_visited: string[]; // paths visitados
}
```

## 6. Dependencias

### 6.1 Servicios Externos
- **Ollama:** Para generar respuestas realistas. Fallback: respuestas estáticas

### 6.2 Librerías
- **fastify:** Framework HTTP
- **@fastify/rate-limit:** Rate limiting
- **@fastify/helmet:** Security headers
- **@fastify/static:** Servir archivos estáticos (si aplica)

## 7. Restricciones Técnicas

### 7.1 Rendimiento
- Latencia máxima de respuesta: 200ms (sin LLM)
- Latencia con LLM: 2-5s (aceptable, el atacante espera)
- Conexiones HTTP simultáneas: sin límite práctico

### 7.2 Seguridad
- El honeypot NO debe filtrar información del host real
- Headers `Server` DEBEN ser genéricos (ej: "Apache/2.4.41")
- No exponer stack traces en errores

### 7.3 Logging
- Cada request DEBE ser registrado en SQLite
- Severity se asigna por clasificación del payload
- Logs DEBEN incluir: IP, method, path, user-agent, timestamp

## 8. Convenciones

### 8.1 Naming
- Rutas: `/kebab-case`
- Headers: lowercase
- Cookies: `sentinel_session`

### 8.2 Estructura de Código
```
src/honeypots/http.js
├── routes/
│   ├── login.js
│   ├── dashboard.js
│   └── api.js
├── middleware/
│   ├── rate-limiter.js
│   └── logger.js
├── templates/
│   ├── login.html
│   ├── dashboard.html
│   └── error.html
└── responses/
    └── static.js         ← Respuestas predefinidas
```

## 9. Notas de Implementación

- El dashboard DEBE parecer real: mostrar "usuarios activos", "logs recientes", "configuración"
- Los datos del dashboard DEBEN ser ficticios pero consistentes entre visits
- Si el LLM genera una respuesta, registrar tanto el prompt como la respuesta en DB
- El login NEVER debe retornar 401 o 403 — siempre 200 con HTML de error

## 10. Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | 2026-06-12 | Versión inicial |
