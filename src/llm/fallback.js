const FALLBACK_RESPONSES = {
  '/': `<!DOCTYPE html>
<html lang="es"><head><title>Servidor — Inicio de Sesion</title>
<style>body{background:#0a0a0a;color:#e0e0e0;font-family:monospace;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}
.login{background:#1a1a2e;padding:2rem;border:1px solid #00ff41;border-radius:8px;width:320px}
h1{color:#00ff41;font-size:1.2rem;text-align:center}
input{width:100%;padding:8px;margin:8px 0;box-sizing:border-box;background:#0a0a0a;border:1px solid #333;color:#e0e0e0;border-radius:4px}
button{width:100%;padding:10px;background:#00ff41;color:#0a0a0a;border:none;cursor:pointer;font-weight:bold;border-radius:4px}
</style></head><body>
<div class="login"><h1>Panel de Administracion del Servidor</h1>
<form method="POST" action="/login">
<input type="text" name="username" placeholder="Usuario" required>
<input type="password" name="password" placeholder="Contrasena" required>
<button type="submit">Iniciar Sesion</button>
</form></div></body></html>`,

  '/dashboard': `<!DOCTYPE html>
<html lang="es"><head><title>Panel de Control</title>
<style>body{background:#0a0a0a;color:#e0e0e0;font-family:monospace;margin:0;padding:20px}
.nav{background:#1a1a2e;padding:10px 20px;border-bottom:1px solid #00ff41}
.nav a{color:#00ff41;text-decoration:none;margin-right:20px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:20px}
.card{background:#1a1a2e;padding:20px;border:1px solid #333;border-radius:8px}
.card h3{color:#00ff41;margin-top:0}
table{width:100%;border-collapse:collapse}
td,th{padding:8px;text-align:left;border-bottom:1px solid #333}
th{color:#00ff41}
</style></head><body>
<div class="nav"><a href="/dashboard">Panel</a><a href="/api/v1/users">API</a><a href="/api/v1/logs">Registros</a></div>
<div class="grid">
<div class="card"><h3>Estado del Sistema</h3><p>Tiempo activo: 47d 12h 33m</p><p>CPU: 23%</p><p>RAM: 1.2GB / 4GB</p></div>
<div class="card"><h3>Usuarios Activos</h3><table><tr><th>Usuario</th><th>Rol</th><th>Ultimo Acceso</th></tr>
<tr><td>admin</td><td>superuser</td><td>hace 2 min</td></tr>
<tr><td>operator</td><td>admin</td><td>hace 15 min</td></tr>
<tr><td>viewer</td><td>solo lectura</td><td>hace 1 hora</td></tr>
<tr><td>backup</td><td>sistema</td><td>hace 3 horas</td></tr>
<tr><td>monitor</td><td>sistema</td><td>hace 5 min</td></tr></table></div>
<div class="card"><h3>Registros Recientes</h3><p>[2026-06-12 23:45:01] Sesion: admin desde 192.168.1.100</p>
<p>[2026-06-12 23:42:15] Configuracion actualizada: nginx.conf</p>
<p>[2026-06-12 23:38:44] Copia de seguridad completada: db_backup_2026-06-12.sql.gz</p>
<p>[2026-06-12 23:30:00] Verificacion de salud: todos los servicios OK</p></div>
</div></body></html>`,

  '/error': `<!DOCTYPE html>
<html lang="es"><head><title>Error de Inicio de Sesion</title>
<style>body{background:#0a0a0a;color:#e0e0e0;font-family:monospace;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}
.error{background:#1a1a2e;padding:2rem;border:1px solid #ff4444;border-radius:8px;text-align:center}
h1{color:#ff4444}</style></head><body>
<div class="error"><h1>Credenciales Invalidas</h1><p>Por favor verifique su usuario y contrasena.</p>
<a href="/" style="color:#00ff41">Volver al Inicio de Sesion</a></div></body></html>`
};

export function getFallbackResponse(path) {
  if (path === '/') return FALLBACK_RESPONSES['/'];
  if (path === '/dashboard') return FALLBACK_RESPONSES['/dashboard'];
  return FALLBACK_RESPONSES['/'];
}

export function getFallbackError() {
  return FALLBACK_RESPONSES['/error'];
}
