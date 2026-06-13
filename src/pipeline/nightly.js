import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '../../templates/html');

function loadTemplate(name) {
  return readFileSync(join(TEMPLATES_DIR, name), 'utf-8');
}

function generateMarkdown(reportData) {
  const { date, stats, attacks, analysis } = reportData;

  let md = `# Informe de Amenazas — ${date}\n\n`;

  md += `## Resumen Ejecutivo\n\n`;
  if (analysis) {
    md += `${analysis}\n\n`;
  } else {
    md += `El ${date}, el sistema honeypot capturo ${stats.total} ataques desde ${stats.unique_ips} direcciones IP unicas. `;
    md += `El servicio mas atacado fue ${stats.services_breakdown[0]?.service || 'N/A'} con ${stats.services_breakdown[0]?.count || 0} interacciones.\n\n`;
  }

  md += `## Estadisticas de Ataques\n\n`;
  md += `| Metrica | Valor |\n|---------|-------|\n`;
  md += `| Total de Ataques | ${stats.total} |\n`;
  md += `| IPs Unicos | ${stats.unique_ips} |\n`;
  md += `| IP Mas Activa | ${stats.top_ips[0]?.source_ip || 'N/A'} (${stats.top_ips[0]?.count || 0} ataques) |\n\n`;

  md += `### Desglose por Servicio\n\n`;
  md += `| Servicio | Ataques |\n|----------|----------|\n`;
  for (const s of stats.services_breakdown) {
    md += `| ${s.service} | ${s.count} |\n`;
  }
  md += `\n`;

  md += `## Detalle por IP\n\n`;
  const ipGroups = {};
  for (const a of attacks) {
    if (!ipGroups[a.source_ip]) ipGroups[a.source_ip] = [];
    ipGroups[a.source_ip].push(a);
  }

  for (const [ip, ipAttacks] of Object.entries(ipGroups).slice(0, 20)) {
    md += `### ${ip}\n\n`;
    md += `- **Total de ataques:** ${ipAttacks.length}\n`;
    md += `- **Servicios:** ${[...new Set(ipAttacks.map(a => a.service))].join(', ')}\n`;
    md += `- **Rango de tiempo:** ${ipAttacks[0].created_at} — ${ipAttacks[ipAttacks.length - 1].created_at}\n`;

    const criticals = ipAttacks.filter(a => a.severity === 'critical');
    if (criticals.length > 0) {
      md += `- **Carga critica:** ${criticals.length}\n`;
      for (const c of criticals.slice(0, 3)) {
        md += `  - \`${(c.payload || '').substring(0, 100)}\`\n`;
      }
    }
    md += `\n`;
  }

  md += `## IOCs\n\n`;
  md += `| Tipo | Valor | Confianza |\n|------|-------|------------|\n`;
  const iocs = [];
  for (const [ip, ipAttacks] of Object.entries(ipGroups)) {
    if (ipAttacks.length >= 3) {
      iocs.push({ type: 'ip', value: ip, confidence: Math.min(0.95, 0.5 + ipAttacks.length * 0.05).toFixed(2) });
    }
    const criticals = ipAttacks.filter(a => a.severity === 'critical');
    if (criticals.length > 0) {
      iocs.push({ type: 'ip', value: ip, confidence: '0.95' });
    }
  }
  for (const ioc of iocs.slice(0, 20)) {
    md += `| ${ioc.type} | ${ioc.value} | ${ioc.confidence} |\n`;
  }
  md += `\n`;

  md += `---\n\n*Generado por ServerSentinel — ${new Date().toISOString()}*\n`;

  return md;
}

export function generateReport(reportData) {
  const markdown = generateMarkdown(reportData);
  const html = marked.parse(markdown);

  const styledHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Informe de Amenazas — ${reportData.date}</title>
<style>
:root{--bg:#0a0a0a;--bg2:#1a1a2e;--text:#e0e0e0;--muted:#a0a0a0;--accent:#00ff41;--danger:#ff4444;--warn:#ffaa00;--info:#4488ff}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--text);font-family:'Courier New',monospace;line-height:1.6;padding:20px;max-width:1000px;margin:0 auto}
h1{color:var(--accent);border-bottom:2px solid var(--accent);padding-bottom:10px;margin:20px 0}
h2{color:var(--accent);margin:20px 0 10px}
h3{color:var(--info);margin:15px 0 5px}
table{width:100%;border-collapse:collapse;margin:10px 0}
th,td{padding:8px 12px;text-align:left;border:1px solid #333}
th{background:var(--bg2);color:var(--accent)}
tr:nth-child(even){background:rgba(26,26,46,0.5)}
code{background:var(--bg2);padding:2px 6px;border-radius:3px;font-size:0.9em;color:var(--warn)}
pre{background:var(--bg2);padding:15px;border-radius:5px;overflow-x:auto;border:1px solid #333}
a{color:var(--accent)}
hr{border:none;border-top:1px solid #333;margin:20px 0}
ul,ol{padding-left:20px}
li{margin:5px 0}
strong{color:var(--accent)}
</style>
</head>
<body>
${html}
</body>
</html>`;

  return styledHtml;
}

export function generateIndex(reports) {
  let html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ServerSentinel — Informes de Amenazas</title>
<style>
:root{--bg:#0a0a0a;--bg2:#1a1a2e;--text:#e0e0e0;--accent:#00ff41}
body{background:var(--bg);color:var(--text);font-family:'Courier New',monospace;padding:20px;max-width:800px;margin:0 auto}
h1{color:var(--accent);border-bottom:2px solid var(--accent);padding-bottom:10px;margin:20px 0}
.report{background:var(--bg2);padding:15px;margin:10px 0;border:1px solid #333;border-radius:5px}
.report a{color:var(--accent);text-decoration:none;font-size:1.1em}
.report .meta{color:#a0a0a0;font-size:0.9em;margin-top:5px}
.empty{color:#a0a0a0;text-align:center;padding:40px}
</style>
</head>
<body>
<h1>ServerSentinel — Informes de Amenazas</h1>
<p style="color:#a0a0a0">Inteligencia diaria de amenazas desde sensores honeypot</p>
<hr style="border:none;border-top:1px solid #333;margin:20px 0">`;

  if (reports.length === 0) {
    html += `<div class="empty">No hay informes disponibles aun.</div>`;
  } else {
    for (const r of reports) {
      html += `<div class="report">
<a href="/blog/${r.filename}">${r.date}</a>
<div class="meta">${r.attacks_total} ataques — ${r.unique_ips} IPs unicos</div>
</div>`;
    }
  }

  html += `
<hr style="border:none;border-top:1px solid #333;margin:20px 0">
<p style="color:#a0a0a0;font-size:0.8em">Generado por ServerSentinel</p>
</body></html>`;

  return html;
}
