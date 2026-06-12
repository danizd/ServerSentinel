---
name: "blog-estructural"
version: "1.0.0"
fecha: "2026-06-12"
estado: "approved"
module: "blog"
dependencies: ["pipeline"]
related_adrs: []
---

# Especificación Estructural: Blog Estático

## 1. Propósito

Define la plantilla HTML/CSS del blog de informes de amenazas, el sistema de generación de páginas y el servidor web estático.

## 2. Decisiones de Arquitectura

### 2.1 HTML Estático (Sin Framework)
- **Contexto:** Los informes son documentos, no aplicaciones
- **Consecuencias:** Sin dependencias de frontend, carga instantánea
- **Restricciones:** Sin interactividad dinámica

### 2.2 Template con Variables
- **Contexto:** Cada informe usa la misma estructura visual
- **Consecuencias:** Consistencia visual entre reportes
- **Restricciones:** Cambios en el template afectan todos los reportes

### 2.3 CSS Embebido
- **Contexto:** Cada página es autocontenida (standalone)
- **Consecuencias:** Sin dependencias externas, funciona offline
- **Restricciones:** Tamaño de archivo mayor, pero aceptable para informes

## 3. Patrones de Diseño

### 3.1 Patrón: Static Site Generation
- **Descripción:** Generación de HTML en tiempo de build, no de request
- **Implementación:** Pipeline nocturno genera el HTML completo
- **Trade-offs:** Rápido de servir vs. requiere regeneración para cambios

## 4. Contratos de API

### 4.1 Estructura del Blog
```
blog/
├── index.html              ← Página principal (lista de reportes)
├── 2026-06-01.html         ← Reporte diario
├── 2026-06-02.html
├── ...
└── assets/
    └── style.css           ← CSS compartido (si se decide extraer)
```

### 4.2 Página Principal
- **Ruta:** `/` o `/index.html`
- **Contenido:** Lista de reportes disponibles ordenados por fecha descendente
- **Formato:** Cada reporte es un link a su HTML completo

### 4.3 Reporte Diario
- **Ruta:** `/{YYYY-MM-DD}.html`
- **Contenido:** Reporte completo con executive summary, stats, detail, trends, IOCs
- **Formato:** HTML standalone con CSS embebido

## 5. Modelos de Datos

### 5.1 Template Variables
```typescript
interface ReportTemplate {
  date: string;              // YYYY-MM-DD
  executive_summary: string; // HTML del resumen
  statistics: {
    total_attacks: number;
    unique_ips: number;
    top_ips: IPStat[];
    services_breakdown: ServiceStat[];
  };
  per_ip_detail: IPDetail[];
  trends: string[];          // HTML de tendencias
  iocs: IOC[];              // Tabla de IOCs
  generated_at: string;     // ISO 8601
}
```

### 5.2 CSS Variables
```css
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a2e;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --accent: #00ff41;         /* Verde Matrix */
  --danger: #ff4444;
  --warning: #ffaa00;
  --info: #4488ff;
}
```

## 6. Dependencias

### 6.1 Librerías
- **marked:** Conversión Markdown → HTML (ya en dependencias del pipeline)

## 7. Restricciones Técnicas

### 7.1 Rendimiento
- Tamaño máximo de página: 500KB
- Carga sin JavaScript (CSS puro)
- Tiempo de renderizado: < 100ms

### 7.2 Compatibilidad
- Navegadores: Chrome, Firefox, Safari, Edge (últimas 2 versiones)
- Responsive: móvil, tablet, desktop
- Accesibilidad: contraste WCAG AA

### 7.3 Seguridad
- NO debe contener `<script>` inline
- NO debe cargar recursos externos (CDN, fonts)
- CSP: `default-src 'none'; style-src 'unsafe-inline'`

## 8. Convenciones

### 8.1 Naming
- CSS: tema oscuro estilo "hacker" / "cybersecurity"
- Font: monospace para datos técnicos
- Colores: fondo oscuro, texto claro, acentos verdes/rojos

### 8.2 Estructura de Código
```
templates/
├── report.html        ← Template base del reporte
├── index.html         ← Template de la página principal
├── partials/
│   ├── header.html
│   ├── statistics.html
│   ├── per-ip.html
│   ├── trends.html
│   └── iocs.html
└── css/
    └── style.css      ← CSS del tema
```

## 9. Notas de Implementación

- El template DEBE ser testeado con datos ficticios antes de usar en producción
- El CSS DEBE mantener contraste adecuado para legibilidad
- Los reportes DEBEN ser accesibles vía URL directa (para compartir)
- El index.html DEBE actualizarse con cada nuevo reporte

## 10. Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | 2026-06-12 | Versión inicial |
