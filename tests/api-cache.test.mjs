import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal browser stand-ins; api.js only needs localStorage and fetch
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
};

let calls = 0;
let mode = 'ok';
globalThis.fetch = async () => {
  calls++;
  if (mode === 'down') throw new Error('network down');
  if (mode === '429' && calls === 1) {
    return { status: 429, ok: false, headers: { get: () => '1' } };
  }
  return {
    status: 200,
    ok: true,
    headers: { get: () => null },
    json: async () => ({
      data: { Page: { media: [{ id: 1, title: { english: 'A' }, format: 'TV', episodes: 12, genres: [] }] } },
    }),
  };
};

const reset = () => {
  calls = 0;
  mode = 'ok';
  for (const k of Object.keys(store)) delete store[k];
};

// Each test imports a fresh copy of the module so its in-memory cache starts empty
const load = (tag) => import(`../src/services/api.js?${tag}`);

test('identical concurrent requests share one network call', async () => {
  reset();
  const api = await load('dedupe');
  await Promise.all([api.getTrendingAnime(), api.getTrendingAnime()]);
  assert.equal(calls, 1);
});

test('fresh responses are served from cache and persisted', async () => {
  reset();
  const api = await load('fresh');
  await api.getTrendingAnime();
  await api.getTrendingAnime();
  assert.equal(calls, 1);
  assert.equal(Object.keys(JSON.parse(store.otaku_api_cache_v1)).length, 1);
});

test('stale persisted data is used when the network is down', async () => {
  reset();
  const first = await load('stale-a');
  await first.getTrendingAnime();

  const entries = JSON.parse(store.otaku_api_cache_v1);
  for (const k of Object.keys(entries)) entries[k].t = Date.now() - 60 * 60 * 1000; // 1h old
  store.otaku_api_cache_v1 = JSON.stringify(entries);

  mode = 'down';
  calls = 0;
  const restarted = await load('stale-b'); // simulates an app restart
  const result = await restarted.getTrendingAnime();
  assert.equal(calls, 1);
  assert.ok(result.length > 0);
});

test('HTTP 429 is retried after Retry-After', async () => {
  reset();
  mode = '429';
  const api = await load('rate');
  await api.getPopularAnime();
  assert.equal(calls, 2);
});
