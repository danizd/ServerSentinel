---
name: "honeypot-ftp-estructural"
version: "1.0.0"
fecha: "2026-06-12"
estado: "approved"
module: "honeypot-ftp"
dependencies: ["infraestructura", "base-datos"]
related_adrs: []
---

# Especificación Estructural: Honeypot FTP

## 1. Propósito

Define el servidor FTP falso que simula un servidor de archivos con directorios y archivos ficticios, capturando comandos FTP del atacante.

## 2. Decisiones de Arquitectura

### 2.1 Aceptar Cualquier Credencial
- **Contexto:** Maximizar engagement
- **Consecuencias:** Login exitoso con cualquier user/password
- **Restricciones:** Directorio raíz虚拟 contiene archivos falsos

### 2.2 Directorios Ficticios Consistentes
- **Contexto:** Simular un servidor FTP real
- **Consecuencias:** Mismos archivos y directorios en cada conexión
- **Restricciones:** Archivos no se pueden descargar (solo listing)

### 2.3 Solo Listing, No Transferencia
- **Contexto:** Simplificar implementación, evitar payload issues
- **Consecuencias:** `RETR` retorna error, `LIST` muestra archivos
- **Restricciones:** El atacante puede intentar descargar pero fallará

## 3. Patrones de Diseño

### 3.1 Patrón: Virtual Filesystem
- **Descripción:** Sistema de archivos en memoria, no real
- **Implementación:** Árbol de directorios como objeto JavaScript
- **Trade-offs:** Rápido y seguro vs. no persistente

## 4. Contratos de API

### 4.1 Comandos FTP Soportados
| Comando | Respuesta |
|---------|-----------|
| `USER` + `PASS` | 230 Login successful |
| `LIST` | Listado de archivos ficticios |
| `PWD` | `/home/admin` |
| `CWD` | Cambio de directorio virtual |
| `SIZE` | Tamaño ficticio del archivo |
| `MDTM` | Fecha ficticia de modificación |
| `RETR` | 550 Permission denied (no se puede descargar) |
| `STOR` | 550 Permission denied (no se puede subir) |
| `QUIT` | 221 Goodbye |
| `*` | 502 Command not implemented |

### 4.2 Estructura de Directorios Ficticia
```
/
├── public_html/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── logs/
│   ├── access.log
│   └── error.log
├── config/
│   ├── nginx.conf
│   └── database.yml
├── backup/
│   ├── db_backup_2026-06-01.sql.gz
│   └── www_backup.tar.gz
└── secrets/
    └── .htpasswd
```

## 5. Modelos de Datos

### 5.1 FTP Session
```typescript
interface FTPSession {
  session_id: number;       // FK → sessions.id
  username: string;         // username intentado
  authenticated: boolean;   // siempre true
  current_dir: string;      // directorio actual
  commands: FTPCommand[];   // comandos ejecutados
}
```

### 5.2 FTP Command
```typescript
interface FTPCommand {
  command: string;          // LIST, RETR, CWD, etc.
  argument: string | null;  // argumento del comando
  response_code: number;    // código de respuesta FTP
  response_text: string;    // texto de respuesta
  timestamp: string;        // ISO 8601
}
```

## 6. Dependencias

### 6.1 Librerías
- **basic-ftp:** Server FTP compatible con clientes estándar

## 7. Restricciones Técnicas

### 7.1 Rendimiento
- Conexiones FTP simultáneas: máximo 20
- Timeout de sesión inactiva: 10 minutos

### 7.2 Seguridad
- NO debe permitir upload de archivos
- NO debe permitir download de archivos reales
- NO debe exponer el filesystem del host
- Puerto por defecto: 2121 (evitar conflicto con FTP real)

### 7.3 Compatibilidad
- Compatible con: FileZilla, WinSCP, curl, lftp, navegadores FTP nativos
- Soportar modo pasivo (EPSV/PASV)

## 8. Convenciones

### 8.1 Naming
- Puerto por defecto: 2121
- Protocolo: FTP estándar (no SFTP)

### 8.2 Estructura de Código
```
src/honeypots/ftp.js
├── server.js           ← FTP server setup
├── filesystem.js       ← Virtual filesystem tree
├── commands.js         ← Command handlers
└── responses.js        ← FTP response codes
```

## 9. Notas de Implementación

- El listing de archivos DEBE ser consistente entre conexiones
- Los archivos NO DEBEN ser descargables (RETR siempre falla)
- El directorio `secrets/` DEBE contener un `.htpasswd` ficticio para capturar intentos de acceso
- Registrar todos los comandos FTP en SQLite

## 10. Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | 2026-06-12 | Versión inicial |
