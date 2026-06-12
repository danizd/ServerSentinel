const SQL_INJECTION_PATTERNS = [
  /UNION\s+(ALL\s+)?SELECT/i,
  /OR\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,
  /OR\s+1\s*=\s*1/i,
  /;\s*DROP/i,
  /;\s*DELETE/i,
  /SLEEP\s*\(/i,
  /BENCHMARK\s*\(/i,
  /LOAD_FILE\s*\(/i,
  /INTO\s+(OUTFILE|DUMPFILE)/i
];

const XSS_PATTERNS = [
  /<script[\s>]/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i
];

const SUSPICIOUS_COMMANDS = [
  'wget', 'curl', 'nc', 'ncat', 'nmap', 'python', 'perl', 'ruby',
  'chmod', 'chown', 'passwd', 'su', 'mount', 'dd', 'mkfs', 'rm'
];

export function classifySeverity(service, payload, attackType) {
  if (!payload) return 'low';

  if (service === 'mysql' || attackType === 'query') {
    if (SQL_INJECTION_PATTERNS.some(p => p.test(payload))) return 'critical';
  }

  if (service === 'http') {
    if (SQL_INJECTION_PATTERNS.some(p => p.test(payload))) return 'critical';
    if (XSS_PATTERNS.some(p => p.test(payload))) return 'critical';
  }

  if (service === 'ssh' && attackType === 'command') {
    const cmd = payload.trim().split(/\s+/)[0];
    if (cmd === 'sudo') return 'high';
    if (SUSPICIOUS_COMMANDS.includes(cmd)) return 'medium';
  }

  if (service === 'ftp') {
    const cmd = payload.trim().split(/\s+/)[0].toUpperCase();
    if (cmd === 'RETR' || cmd === 'STOR') return 'medium';
    if (cmd === 'STOR') {
      const target = payload.trim().split(/\s+/)[1] || '';
      if (/\.(sh|exe|php|py|pl|rb)$/.test(target)) return 'critical';
    }
  }

  if (attackType === 'login_attempt') return 'medium';

  return 'low';
}
