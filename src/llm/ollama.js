import * as circuitBreaker from './circuit-breaker.js';
import { HTTP_RESPONSE_PROMPT, ANALYSIS_PROMPT } from './prompts.js';
import { getFallbackResponse, getFallbackError } from './fallback.js';

const DEFAULT_TIMEOUT = 5000;

export function createOllamaClient(config) {
  const baseUrl = config.ollamaUrl || 'http://localhost:11434';
  const model = config.llmModel || 'qwen2.5:1.5b';
  const timeout = config.llmTimeoutMs || DEFAULT_TIMEOUT;

  async function isAvailable() {
    try {
      const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function generate(prompt, options = {}) {
    if (circuitBreaker.isCircuitOpen()) {
      return null;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeout || timeout);

      const res = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: { num_predict: options.maxTokens || 500 }
        }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!res.ok) {
        console.error(`[LLM] generate() HTTP ${res.status}: ${res.statusText}`);
        circuitBreaker.recordFailure();
        return null;
      }

      const data = await res.json();
      circuitBreaker.recordSuccess();
      return data.response;
    } catch (err) {
      console.error(`[LLM] generate() failed: ${err.message}`);
      circuitBreaker.recordFailure();
      return null;
    }
  }

  async function generateHttpResponse(context) {
    const prompt = HTTP_RESPONSE_PROMPT
      .replace('{{ip}}', context.attacker_ip || 'unknown')
      .replace('{{path}}', context.path || '/')
      .replace('{{method}}', context.method || 'GET');

    const response = await generate(prompt);
    if (!response) return getFallbackResponse(context.path);
    return response;
  }

  async function analyzeAttack(attackData) {
    const prompt = ANALYSIS_PROMPT
      .replace('{{total_attacks}}', attackData.total_attacks)
      .replace('{{unique_ips}}', attackData.unique_ips)
      .replace('{{top_ips}}', JSON.stringify(attackData.top_ips))
      .replace('{{services}}', JSON.stringify(attackData.services_breakdown))
      .replace('{{attacks_data}}', attackData.attacks_json);

    const response = await generate(prompt, { maxTokens: 200, timeout: 300000 });
    return response;
  }

  return {
    isAvailable,
    generate,
    generateHttpResponse,
    analyzeAttack,
    circuitBreaker
  };
}
