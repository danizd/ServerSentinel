---
name: "honeypot-ssh-estructural"
version: "1.0.0"
fecha: "2026-06-12"
estado: "approved"
module: "honeypot-ssh"
dependencies: ["infraestructura", "base-datos"]
related_adrs: []
---

# Especificación Estructural: Honeypot SSH

## 1. Propósito

Define el servidor SSH falso que simula una shell real, captura intentos de login y comandos ejecutados por el atacante.

## 2. Decisiones de Arquitectura

### 2.1 Aceptar Cualquier Credencial
- **Contexto:** Maximizar tiempo de engagement del atacante
- **Consecuencias:** El atacante obtiene "acceso" y ejecuta comandos
- **Restricciones:** La shell es completamente falsa, no ejecuta nada real

### 2.2 Fake Shell Interactiva
- **Contexto:** Simular un entorno Linux realista
- **Consecuencias:** Comandos como `ls`, `cat`, `whoami` retornan respuestas predefinidas
- **Restricciones:** Solo comandos conocidos generan respuestas; el resto retorna "command not found"

### 2.3 Registro Completo de Sesión
- **Contexto:** Capturar todo lo que el atacante intenta
- **Consecuencias:** Cada comando se almacena en SQLite con timestamp
- **Restricciones:** No ejecutar nada del host real, nunca

## 3. Patrones de Diseño

### 3.1 Patrón: Command Pattern
- **Descripción:** Cada comando SSH se mapea a una función generadora de respuesta
- **Implementación:** Map de comandos → funciones de respuesta
- **Trade-offs:** Extensible vs. mantenimiento de respuestas

## 4. Contratos de API

### 4.1 Conexión SSH
- **Protocolo:** SSH-2.0 (falso banner)
- **Banner:** `SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.3`
- **Auth:** Acepta cualquier combinación user/password
- **Response:** Shell interactiva tras autenticación exitosa

### 4.2 Comandos Soportados
| Comando | Respuesta |
|---------|-----------|
| `ls` | Listado de directorios ficticios |
| `pwd` | `/home/admin` |
| `whoami` | `admin` |
| `cat /etc/passwd` | Contenido ficticio |
| `uname -a` | `Linux server 5.4.0 #1 SMP ...` |
| `ps aux` | Procesos ficticios |
| `df -h` | Uso de disco ficticio |
| `history` | Comandos previos del atacante |
| `help` | Lista de comandos disponibles |
| `*` (cualquier otro) | `bash: [comando]: command not found` |

## 5. Modelos de Datos

### 5.1 SSH Session
```typescript
interface SSHSession {
  session_id: number;       // FK → sessions.id
  username: string;         // username intentado
  authenticated: boolean;   // siempre true (acepta todo)
  commands: Command[];      // lista de comandos ejecutados
  started_at: string;       // ISO 8601
  ended_at: string | null;  // cuando se cierra la conexión
}
```

### 5.2 SSH Command
```typescript
interface SSHCommand {
  command: string;          // comando completo ejecutado
  response: string;         // respuesta generada
  timestamp: string;        // ISO 8601
}
```

## 6. Dependencias

### 6.1 Librerías
- **ssh2:** Server SSH compatible con clientes estándar (OpenSSH, PuTTY)

## 7. Restricciones Técnicas

### 7.1 Rendimiento
- Conexiones SSH simultáneas: máximo 50
- Timeout de sesión inactiva: 30 minutos
- Máximo de comandos por sesión: 500

### 7.2 Seguridad
- El servidor SSH NO debe ejecutar ningún comando del host
- NO debe exponer el filesystem real
- NO debe establecer túneles ni port forwarding
- Banner NO debe revelar que es un honeypot

### 7.3 Compatibilidad
- Compatible con OpenSSH client, PuTTY, WinSCP (modo shell)
- Soportar SSH key authentication (acepta cualquier key)

## 8. Convenciones

### 8.1 Naming
- Puerto por defecto: 2222 (para evitar conflicto con SSH real del host)

### 8.2 Estructura de Código
```
src/honeypots/ssh.js
├── server.js           ← SSH server setup
├── shell.js            ← Fake shell interactiva
├── commands.js         ← Map de comandos → respuestas
└── banner.js           ← Banner SSH
```

## 9. Notas de Implementación

- El banner SSH DEBE ser idéntico a un OpenSSH real
- La shell DEBE mantener contexto de directorio (cd cambia el prompt)
- Los comandos DEBEN registrarse en SQLite en tiempo real
- Si el atacante intenta `sudo`, responder "Permission denied" (no revelar que es honeypot)

## 10. Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | 2026-06-12 | Versión inicial |
