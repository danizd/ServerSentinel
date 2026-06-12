let failCount = 0;
let isOpen = false;
let openUntil = 0;

const MAX_FAILS = 3;
const TIMEOUT_MS = 5 * 60 * 1000;

export function recordFailure() {
  failCount++;
  if (failCount >= MAX_FAILS) {
    isOpen = true;
    openUntil = Date.now() + TIMEOUT_MS;
    console.log(`[CircuitBreaker] OPEN — fallback active for ${TIMEOUT_MS / 1000}s`);
  }
}

export function recordSuccess() {
  failCount = 0;
  if (isOpen) {
    isOpen = false;
    openUntil = 0;
    console.log('[CircuitBreaker] CLOSED — LLM reconnected');
  }
}

export function isCircuitOpen() {
  if (!isOpen) return false;
  if (Date.now() > openUntil) {
    isOpen = false;
    openUntil = 0;
    failCount = 0;
    console.log('[CircuitBreaker] HALF-OPEN — retrying LLM');
    return false;
  }
  return true;
}

export function reset() {
  failCount = 0;
  isOpen = false;
  openUntil = 0;
}
