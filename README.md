# ServerSentinel

Sistema honeypot que simula servidores reales para capturar y analizar comportamiento de atacantes. Incluye generación de respuestas con LLM y pipeline nocturno de reportes de amenazas.

## Características

- **4 Honeypots**: HTTP (panel admin falso), SSH (shell interactiva), FTP (directorio virtual), MySQL (protocolo real)
- **LLM Integrado**: Ollama genera respuestas HTTP realistas en tiempo real
- **Pipeline Nocturno**: Genera diariamente un informe HTML de amenazas
- **Blog Estático**: Reportes publicados como HTML standalone
- **Rate Limiting**: Protección contra saturación del honeypot
- **Clasificación de Severidad**: low, medium, high, critical
- **UI en Español**: Todas las interfaces web en español

## Requisitos

- Node.js >= 18.0.0
- Docker y Docker Compose (para despliegue en contenedor)
- Ollama (opcional, para respuestas LLM)

## Instalación Rápida

```bash
# Clonar repositorio
git clone https://github.com/danizd/ServerSentinel.git
cd ServerSentinel

# Configurar
cp .env.example .env
# Editar .env con tus puertos y configuración

# Ejecutar
# Windows:
start.bat

# Linux/Mac:
npm start
```

## Configuración

Todas las variables se configuran en el archivo `.env`:

| Variable | Default | Descripción |
|----------|---------|-------------|
| `HTTP_PORT` | 80 | Puerto del honeypot HTTP |
| `SSH_PORT` | 2222 | Puerto del honeypot SSH |
| `FTP_PORT` | 2121 | Puerto del honeypot FTP |
| `MYSQL_PORT` | 3306 | Puerto del honeypot MySQL |
| `BLOG_PORT` | 8080 | Puerto del blog de reportes |
| `OLLAMA_URL` | http://localhost:11434 | URL de Ollama |
| `LLM_MODEL` | qwen2.5:1.5b | Modelo LLM a usar |
| `DB_PATH` | ./data/sentinel.db | Ruta de la base de datos |
| `DATA_RETENTION_DAYS` | 90 | Días de retención de datos |
| `RATE_LIMIT_RPM` | 60 | Requests max por minuto por IP |
| `ADMIN_USER` | admin | Usuario del panel admin falso |
| `ADMIN_PASS` | admin | Contraseña del panel admin falso |

## Despliegue

### Opción 1: Docker Compose (Recomendado)

```bash
# Configurar
cp .env.example .env
nano .env

# Construir y ejecutar
docker-compose up -d

# Ver logs
docker-compose logs -f honeypot

# Detener
docker-compose down
```

### Opción 2: Raspberry Pi con Tailscale Funnel

Versión ligera sin Ollama (~256MB RAM):

```bash
# Clonar y configurar
git clone https://github.com/danizd/ServerSentinel.git
cd ServerSentinel
cp .env.example .env

# Ejecutar con compose ligero
docker compose -f docker-compose.lite.yml up -d

# Exponer a internet via Tailscale Funnel
tailscale funnel 80       # honeypot HTTP publico
tailscale funnel 8080     # blog publico
```

Resultado:
- `https://<tu-raspberry>.ts.net` → honeypot HTTP (captura credenciales, payloads)
- `https://<tu-raspberry>.ts.net:8080` → blog con reportes diarios

### Opción 3: Directo en el host

```bash
npm install
cp .env.example .env
nano .env

# Ejecutar en background (Linux)
nohup node src/index.js > logs/server.log 2>&1 &

# Instalar cron jobs
bash scripts/setup-cron.sh
```

## Exposición Pública

### Tailscale Funnel (Más Simple)

Requiere Tailscale instalado. No expone tu IP real ni abre puertos en el router.

```bash
# Exponer honeypot HTTP
tailscale funnel 80

# Exponer blog de reportes
tailscale funnel 8080
```

### Cloudflare Tunnel

```bash
# Instalar cloudflared
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/

# Crear tunnel
cloudflared tunnel create sentinel
cloudflared tunnel route dns sentinel honeypot.tudominio.com

# Configurar config.yml
cat > ~/.cloudflared/config.yml << EOF
tunnel: <tunnel-id>
credentials-file: ~/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: honeypot.tudominio.com
    service: http://localhost:80
  - service: http_status:404
EOF

# Ejecutar
cloudflared tunnel run sentinel
```

### Port Forwarding (Alternativa)

En tu router, redirigir:
- Puerto 80 → IP del servidor:80 (HTTP)
- Puerto 2222 → IP del servidor:2222 (SSH)
- Puerto 2121 → IP del servidor:2121 (FTP)
- Puerto 3306 → IP del servidor:3306 (MySQL)

> **Advertencia**: Exponer directamente a Internet requiere firewall configurado. Usa fail2ban y revisa logs regularmente.

## Monitoreo

### Ver logs

```bash
# Docker
docker-compose logs -f honeypot

# Linux (directo)
tail -f logs/server.log
```

### Generar reporte manual

```bash
# Docker
docker exec sentinel-honeypot node src/pipeline/run.js

# Directo
node src/pipeline/run.js
```

### Revisar ataques capturados

```bash
# Acceder al blog de reportes
# http://localhost:8080/

# Query directa a la DB
sqlite3 data/sentinel.db "SELECT source_ip, service, COUNT(*) FROM attacks GROUP BY source_ip, service ORDER BY COUNT(*) DESC LIMIT 10;"
```

## Cron Jobs

| Job | Frecuencia | Script |
|-----|-----------|--------|
| Pipeline nocturno | Diario 00:00 | `scripts/nightly.sh` |
| Health check | Cada 5 min | `scripts/health-check.sh` |
| DB maintenance | Domingos 02:00 | `scripts/db-maintenance.sh` |
| Log rotation | Diario 01:00 | `scripts/log-rotation.sh` |

## Estructura de Datos

### Tabla: attacks
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | INTEGER | Primary key |
| session_id | INTEGER | FK → sessions |
| source_ip | TEXT | IP del atacante |
| service | TEXT | http/ssh/ftp/mysql |
| attack_type | TEXT | login_attempt/command/query/request |
| severity | TEXT | low/medium/high/critical |
| payload | TEXT | Datos capturados |
| response | TEXT | Respuesta enviada |
| metadata | TEXT | JSON adicional |
| created_at | TEXT | Timestamp ISO 8601 |

### Tabla: sessions
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | INTEGER | Primary key |
| source_ip | TEXT | IP del atacante |
| started_at | TEXT | Inicio de sesión |
| ended_at | TEXT | Fin de sesión (NULL = activa) |
| attack_count | INTEGER | Número de interacciones |
| services_used | TEXT | JSON array de servicios |

### Tabla: reports
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | INTEGER | Primary key |
| report_date | TEXT | YYYY-MM-DD (UNIQUE) |
| html_path | TEXT | Ruta al HTML generado |
| attacks_total | INTEGER | Total de ataques |
| unique_ips | INTEGER | IPs únicas |

## Seguridad

- Los honeypots **NUNCA** ejecutan código del host real
- Los datos sensibles están en `.env`, nunca en código
- SQLite no es accesible desde fuera del contenedor
- Rate limiting previene saturación
- Circuit breaker protege contra fallos del LLM

## Troubleshooting

### "EADDRINUSE" en el puerto
Otro servicio usa ese puerto. Cambia la variable en `.env` o detén el servicio conflictivo.

### Ollama no responde
El honeypot funciona sin LLM (modo degradado). Las respuestas HTTP usan HTML estático predefinido.

### SQLite "database is locked"
Verifica que no haya otra instancia corriendo. El WAL mode maneja concurrencia, pero un solo writer a la vez.

### Raspberry Pi: Out of Memory
Usa `docker-compose.lite.yml` que excluye Ollama y limita memoria a 256MB.

## Licencia

MIT
