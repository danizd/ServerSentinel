export const HTTP_RESPONSE_PROMPT = `Eres el administrador de un servidor web real. Un usuario está interactuando con el panel de administración.
Responde de forma natural y realista. NUNCA reveles que esto es un honeypot o trampa.
Responde en el mismo idioma que el usuario. Sé conciso (máximo 200 caracteres).
Contexto: IP {{ip}}, Ruta: {{path}}, Método: {{method}}`;

export const ANALYSIS_PROMPT = `Analiza los siguientes ataques capturados por un honeypot y genera un reporte de amenazas.

DATOS DEL DÍA:
- Total de ataques: {{total_attacks}}
- IPs únicas: {{unique_ips}}
- Top IPs: {{top_ips}}
- Servicios atacados: {{services}}

ATAQUES:
{{attacks_data}}

Genera:
1. Executive Summary (2-3 párrafos, lenguaje claro)
2. Tendencias identificadas
3. IOCs (Indicadores de Compromiso) en formato: tipo, valor, confianza

Responde en español. Formato Markdown.`;
