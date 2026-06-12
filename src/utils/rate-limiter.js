const requests = new Map();

export function createRateLimiter(maxPerMinute = 60) {
  return function checkRateLimit(ip) {
    const now = Date.now();
    const windowStart = now - 60000;

    if (!requests.has(ip)) {
      requests.set(ip, []);
    }

    const timestamps = requests.get(ip).filter(t => t > windowStart);
    requests.set(ip, timestamps);

    if (timestamps.length >= maxPerMinute) {
      return false;
    }

    timestamps.push(now);
    return true;
  };
}

export function cleanupOldEntries() {
  const now = Date.now();
  const windowStart = now - 120000;
  for (const [ip, timestamps] of requests) {
    const valid = timestamps.filter(t => t > windowStart);
    if (valid.length === 0) {
      requests.delete(ip);
    } else {
      requests.set(ip, valid);
    }
  }
}

setInterval(cleanupOldEntries, 60000);
