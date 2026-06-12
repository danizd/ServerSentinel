# ServerSentinel

Sistema honeypot que simula servidores reales para capturar y analizar comportamiento de atacantes. Incluye generación de respuestas con LLM y pipeline nocturno de reportes de amenazas.

## Características

- **4 Honeypots**: HTTP (panel admin falso), SSH (shell interactiva), FTP (directorio virtual), MySQL (protocolo real)
- **LLM Integrado**: Ollama genera respuestas HTTP realistas en tiempo real
- **Pipeline Nocturno**: Genera diariamente un informe HTML de amenazas
- **Blog Estático**: Reportes publicados como HTML standalone
- **Rate Limiting**: Protección contra saturación del honeypot
- **Clasificación de Severidad**: low, medium, high, critical

## Requisitos

- Node.js >= 18.0.0
- Docker y Docker Compose (opcional, para despliegue en contenedor)
- Ollama (opcional, para respuestas LLM)

## Instalación Rápida

```bash
# Clonar repositorio
git clone <url> serversentinel
cd serversentinel

# Instalar dependencias
npm install

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

## Despliegue en Producción

### Opción 1: Directo en el host

```bash
# Instalar dependencias
npm install

# Configurar
cp .env.example .env
nano .env  # Editar configuración

# Ejecutar en background (Linux)
nohup node src/index.js > logs/server.log 2>&1 &

# Instalar cron jobs
bash scripts/setup-cron.sh
```

### Opción 2: Docker Compose (Recomendado)

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

### Opción 3: Docker en Raspberry Pi

```bash
# En la RPi4, clonar y configurar
git clone <url> serversentinel
cd serversentinel
cp .env.example .env

# Editar .env para RPi4
# - Reducir LLM_MODEL a un modelo más ligero
# - Aumentar DATA_RETENTION_DAYS si el SD es grande
# - Los puertos 80/22/21/3306 requieren sudo

# Ejecutar con docker-compose
sudo docker-compose up -d
```

## Exposición Pública

### Cloudflare Tunnel (Recomendado)

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

> ⚠️ **Advertencia**: Exponer directamente a Internet requiere firewall configurado. Usa fail2ban y revisa logs regularmente.

## Monitoreo

### Verificar estado de servicios

```bash
# Linux
bash scripts/health-check.sh

# Ver logs
tail -f logs/health-check.log
```

### Revisar ataques capturados

```bash
# Acceder al blog de reportes
# http://localhost:8080/

# Query directa a la DB (requiere sqlite3)
sqlite3 data/sentinel.db "SELECT source_ip, service, COUNT(*) FROM attacks GROUP BY source_ip, service ORDER BY COUNT(*) DESC LIMIT 10;"
```

### Generar reporte manual

```bash
node src/pipeline/run.js 2026-06-12
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

### RPi4: Out of Memory
Reduce `OLLAMA_NUM_PARALLEL=1` en el entorno de Docker o usa un modelo más pequeño.

## Licencia

MIT
