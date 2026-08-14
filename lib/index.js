/**
 * ds-usage — host half.
 *
 * Provides GET /ds-usage on the harness webserver: a cached proxy to the
 * DeepSeek Get User Balance endpoint. The API key is resolved through the
 * harness credentials service (DEEPSEEK_API_KEY), so the secret never leaves
 * the host process.
 *
 * Route payload: { ok: true, balance } | { ok: false, error, detail? }
 */
import { credentialRef } from '@deepseek-ai/dsh-credentials';

const BALANCE_ENDPOINT = 'https://api.deepseek.com/user/balance';
const CACHE_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;

export default {
  name: 'ds-usage',
  inject: ['webServer', 'credentials'],
  apply(ctx) {
    let cache = { at: 0, payload: null };

    async function loadBalance() {
      const hit = await ctx.credentials.resolve(credentialRef('DEEPSEEK_API_KEY'));
      if (!hit) return { ok: false, error: 'missing-api-key' };
      let res;
      try {
        res = await fetch(BALANCE_ENDPOINT, {
          headers: {
            Authorization: 'Bearer ' + hit.value,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (err) {
        return { ok: false, error: 'network', detail: String(err?.message ?? err) };
      }
      if (!res.ok) return { ok: false, error: 'http-' + res.status };
      try {
        const body = await res.json();
        return { ok: true, balance: body };
      } catch {
        return { ok: false, error: 'bad-json' };
      }
    }

    async function fetchBalance() {
      const now = Date.now();
      if (cache.payload !== null && now - cache.at < CACHE_MS) return cache.payload;
      const payload = await loadBalance();
      cache = { at: now, payload };
      return payload;
    }

    ctx.effect(
      () =>
        ctx.webServer.register({
          kind: 'exact',
          path: '/ds-usage',
          handler: async (_req, res) => {
            const data = await fetchBalance();
            const body = JSON.stringify(data);
            res.writeHead(200, {
              'content-type': 'application/json; charset=utf-8',
              'cache-control': 'no-store',
            });
            res.end(body);
          },
        }),
      'ds-usage: /ds-usage route',
    );
  },
};
