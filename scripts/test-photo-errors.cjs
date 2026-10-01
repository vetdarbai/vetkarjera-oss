// Actual installed Storage SDK + route regression; synthetic transports only.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const Module = require('node:module'), ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');
const load = Module._load, id = '11111111-1111-4111-8111-111111111111';
let status = 404, body = { code: 'NoSuchKey', message: 'Not found' }, downloads = 0, removes = 0, active = true;
const sdk = createClient('https://storage.example.invalid', 'synthetic-test-key', {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: async () => { downloads++; return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }); } },
});
const client = { storage: sdk.storage, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: id }, error: null }) }) }) }), rpc: async () => ({ data: { id, hasSpecialistProfile: true }, error: null }) };
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, f);
Module._load = function (name, parent, main) {
  if (name === 'server-only') return {};
  if (name === '@/lib/auth/session') return { getActiveUser: async () => active ? { id, isAdmin: false } : null };
  if (name === '@/lib/supabase/server') return { createClient: async () => client };
  if (name === '@/lib/supabase/storage-admin') return { createStorageAdmin: () => ({ remove: async () => { removes++; return { error: null }; } }) };
  if (name.startsWith('@/')) return load.call(this, path.resolve(name.slice(2)), parent, main);
  return load.call(this, name, parent, main);
};
async function main() {
  const p = require('../lib/profiles/photo.ts'), route = require('../app/api/profilis/nuotrauka/route.ts');
  const auth = { target: id, path: id + '/profile.webp', client };
  const actual = (await sdk.storage.from('specialist-profile-photos').download(auth.path)).error;
  assert.equal(actual.status, 404); assert.equal(actual.statusCode, 'NoSuchKey'); assert.equal(actual.code, 'NoSuchKey');
  // Reproduce the old false negative using the real SDK error shape.
  assert.equal(Number(actual.statusCode) === 404 || actual.error === 'NoSuchKey', false);
  assert.equal(await p.readPhoto(auth), null);
  body = { statusCode: '404', error: 'not_found', message: 'Not found' }; assert.equal(await p.readPhoto(auth), null);
  for (const [http, code] of [[403, 'AccessDenied'], [503, 'InternalError'], [400, 'InvalidRequest']]) {
    status = http; body = { code, message: 'Synthetic failure' };
    await assert.rejects(() => p.readPhoto(auth), e => e.status === 503);
  }
  const before = downloads;
  const r = await route.DELETE(new Request('https://app.example.invalid/api/profilis/nuotrauka', { method: 'DELETE', headers: { origin: 'https://app.example.invalid' } }));
  assert.equal(r.status, 200); assert.equal((await r.json()).hasPhoto, false); assert.equal(downloads, before); assert.equal(removes, 1);
  const denied = await route.DELETE(new Request('https://app.example.invalid/api/profilis/nuotrauka', { method: 'DELETE', headers: { origin: 'https://foreign.invalid' } }));
  assert.equal(denied.status, 403); assert.equal(removes, 1);
  active = false;
  assert.equal((await route.DELETE(new Request('https://app.example.invalid/api/profilis/nuotrauka', { method: 'DELETE', headers: { origin: 'https://app.example.invalid' } }))).status, 401);
  assert.equal(removes, 1);
  console.log('PASS 17 photo SDK/error/DELETE regression assertions; old NoSuchKey failure reproduced');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
