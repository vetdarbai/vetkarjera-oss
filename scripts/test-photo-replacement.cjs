// Loopback-only browser -> actual React component -> actual routes/Sharp/Storage SDK.
// Auth/database and Storage persistence are synthetic transports, not live Supabase.
// No .env, credentials, WSL, Docker or hosted endpoints are used.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const http = require('node:http'), crypto = require('node:crypto'), Module = require('node:module');
const { spawnSync } = require('node:child_process'), ts = require('typescript'), sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');
const root = path.resolve(__dirname, '..'), out = path.join(root, '.staging-results/photo-replacement');
const owner = '11111111-1111-4111-8111-111111111111', foreign = '22222222-2222-4222-8222-222222222222';
let stored = null, previous = null, inPut = false, staleRead = false, downloads = 0, writes = 0, checks = 0;
let actor = { id: owner, isAdmin: false }, specialist = true, live = true, writeFailure = false;
let server, browser, origin, bundleRequests = [], storageNonces = [], errors = [], blockedExternalRequests = 0;
const groups = [], legacy = process.argv.includes('--prove-legacy');
const eq = (a, b, message) => { assert.deepEqual(a, b, message); checks++; };
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const sdk = createClient('https://synthetic-storage.invalid', 'synthetic-only-key', {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: async input => {
    const url = new URL(input instanceof Request ? input.url : input);
    assert.equal(url.hostname, 'synthetic-storage.invalid'); // Never forward to a network.
    downloads++;
    const nonce = url.searchParams.get('cacheNonce'); storageNonces.push(nonce);
    const bytes = inPut || (staleRead && !nonce) ? previous : stored;
    if (nonce && stored && nonce === hash(stored)) staleRead = false;
    return bytes ? new Response(bytes, { headers: { 'Content-Type': 'image/webp' } }) :
      new Response(JSON.stringify({ code: 'NoSuchKey', message: 'Synthetic missing object' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  } },
});
const client = {
  storage: sdk.storage,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: specialist ? { user_id: owner } : null, error: null }) }) }) }),
  rpc: async () => ({ data: live && actor ? { id: actor.id, hasSpecialistProfile: true } : null, error: null }),
};
const load = Module._load;
require.extensions['.ts'] = (m, file) => {
  let source = fs.readFileSync(file, 'utf8');
  if (legacy && [path.join(root, 'lib/profiles/photo.ts'), path.join(root, 'app/api/profilis/nuotrauka/route.ts')].includes(file)) {
    const r = spawnSync('git', ['show', 'ae23f425863f6800fc424eca9aa690ca265a7ee7:' + path.relative(root, file).replaceAll('\\', '/')], { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 0); source = r.stdout;
  }
  m._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, file);
};
Module._load = function (name, parent, main) {
  if (name === 'server-only') return {};
  if (name === '@/lib/auth/session') return { getActiveUser: async () => actor };
  if (name === '@/lib/supabase/server') return { createClient: async () => client };
  if (name === '@/lib/supabase/storage-admin') return { createStorageAdmin: () => ({
    upload: async (key, bytes, options) => {
      eq(key, owner + '/profile.webp'); eq(options, { contentType: 'image/webp', upsert: true, cacheControl: '0' });
      if (writeFailure) return { error: { message: 'Synthetic write failure' } };
      previous = stored; stored = Buffer.from(bytes); staleRead = true; writes++; return { error: null };
    },
    remove: async keys => { eq(keys, [owner + '/profile.webp']); stored = null; staleRead = false; writes++; return { error: null }; },
  }) };
  if (name.startsWith('@/')) return load.call(this, path.join(root, name.slice(2)), parent, main);
  return load.call(this, name, parent, main);
};
const photo = require('../lib/profiles/photo.ts'), route = require('../app/api/profilis/nuotrauka/route.ts');
const imageRoute = require('../app/api/profilis/nuotrauka/vaizdas/route.ts');
const request = (method, suffix = '', bytes, headers = {}) => new Request((origin || 'http://127.0.0.1:4349') + '/api/profilis/nuotrauka' + suffix, {
  method, headers: { origin: origin || 'http://127.0.0.1:4349', ...(bytes ? { 'content-type': 'image/png' } : {}), ...headers }, body: bytes,
});
async function put(bytes, suffix = '', headers = {}) { inPut = true; try { return await route.PUT(request('PUT', suffix, bytes, headers)); } finally { inPut = false; } }
async function fixture(width, height, color) { return sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer(); }
async function group(name, fn) { await fn(); groups.push(name); console.log('PASS ' + name); }
async function buildBrowser() {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'entry.js'), `const React=require('react');const{createRoot}=require('react-dom/client');const{ProfilePhoto}=require(${JSON.stringify(path.join(root, 'components/ProfileOwnerAssets.tsx'))});createRoot(document.getElementById('root')).render(React.createElement(ProfilePhoto,{editable:true}));`);
  fs.writeFileSync(path.join(out, 'actions.js'), 'export function readOwnLicense(){throw Error("Unused fixture action")} export function saveLicense(){throw Error("Unused fixture action")}');
  fs.writeFileSync(path.join(out, 'loader.cjs'), `const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=function(s){return ts.transpileModule(s,{fileName:this.resourcePath,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText};`);
  const bundled = require('next/dist/compiled/webpack/webpack'); bundled.init();
  const compiler = bundled.webpack({ mode: 'development', devtool: false, target: 'web', entry: path.join(out, 'entry.js'),
    output: { path: out, filename: 'browser.js' },
    plugins: [new bundled.webpack.DefinePlugin({ 'process.env.__NEXT_IMAGE_OPTS': 'undefined', 'process.env.NEXT_RUNTIME': JSON.stringify('nodejs'), 'process.env.NEXT_DEPLOYMENT_ID': 'undefined' })],
    resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@/app/profilis/actions': path.join(out, 'actions.js'), '@': root } },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(out, 'loader.cjs') }] },
  });
  await new Promise((resolve, reject) => compiler.run((error, stats) => compiler.close(() => error || stats.hasErrors() ? reject(error || Error(stats.toString({ all: false, errors: true }))) : resolve())));
}
async function serve() {
  server = http.createServer(async (req, res) => {
    try {
      if (req.url === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><html lang="lt"><head><meta charset="utf-8"></head><body><div id="root"></div><script src="/browser.js"></script></body></html>'); return; }
      if (req.url === '/browser.js') { res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.end(fs.readFileSync(path.join(out, 'browser.js'))); return; }
      if (!req.url.startsWith('/api/profilis/nuotrauka')) { res.writeHead(404).end(); return; }
      const chunks = []; for await (const b of req) chunks.push(b);
      const r = new Request(origin + req.url, { method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined });
      let result;
      if (req.method === 'PUT') { inPut = true; try { result = await route.PUT(r); } finally { inPut = false; } }
      else if (req.url.startsWith('/api/profilis/nuotrauka/vaizdas')) { bundleRequests.push(req.url); result = await imageRoute.GET(r); }
      else result = await route[req.method](r);
      res.writeHead(result.status, Object.fromEntries(result.headers)); res.end(Buffer.from(await result.arrayBuffer()));
    } catch { res.writeHead(500).end('Synthetic test server error'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); origin = 'http://127.0.0.1:' + server.address().port;
}
async function main() {
  const a = await fixture(120, 90, '#e42135'), b = await fixture(86, 110, '#136ac5'), c = await fixture(72, 64, '#1cb344');
  if (legacy) {
    stored = await photo.processPhoto(a); const old = hash(stored);
    const result = await put(b), metadata = await result.json();
    eq(result.status, 200); eq(hash(stored) === old, false); eq(metadata.version, old);
    eq(metadata.imageUrl.includes('&v='), false);
    console.log('PASS legacy reproduction: successful overwrite returns previous hash and unchanged image URL when immediate read is stale'); return;
  }
  await group('Authoritative PUT metadata despite stale immediate Storage reads', async () => {
    stored = await photo.processPhoto(a); const count = downloads, result = await put(b), metadata = await result.json();
    eq(result.status, 200); eq(downloads, count); eq(metadata.version, hash(stored));
    eq(new URL(metadata.imageUrl, 'http://local.invalid').searchParams.get('v'), hash(stored));
    eq(result.headers.get('cache-control'), 'private, no-store, max-age=0');
  });
  await group('Version is presentation-only; owner/admin/foreign/anonymous/live-session security', async () => {
    const suffix = '/vaizdas?userId=' + owner + '&v=' + hash(stored), before = writes;
    const result = await imageRoute.GET(request('GET', suffix)); eq(result.status, 200); eq(hash(Buffer.from(await result.arrayBuffer())), hash(stored));
    eq(result.headers.get('content-type'), 'image/webp'); eq(result.headers.get('cache-control'), 'private, no-store, max-age=0');
    actor = { id: foreign, isAdmin: false }; eq((await imageRoute.GET(request('GET', suffix))).status, 403);
    actor = null; eq((await imageRoute.GET(request('GET', suffix))).status, 401);
    actor = { id: foreign, isAdmin: true }; eq((await imageRoute.GET(request('GET', suffix))).status, 200);
    actor = { id: owner, isAdmin: false }; specialist = false; eq((await imageRoute.GET(request('GET', suffix))).status, 403); specialist = true;
    live = false; eq((await put(a)).status, 401); live = true;
    eq((await put(a, '?v=' + hash(stored))).status, 403);
    eq((await put(a, '', { origin: 'https://foreign.invalid' })).status, 403); eq(writes, before);
    for (const q of ['?v=x', '?v=' + hash(stored) + '&v=' + hash(stored), '?token=x', '?userId=' + owner + '&userId=' + owner]) eq((await imageRoute.GET(request('GET', '/vaizdas' + q))).status, 400);
  });
  await group('Invalid files and failed uploads do not replace saved data', async () => {
    const before = hash(stored), count = writes;
    eq((await put(Buffer.from('<svg/>'))).status, 415);
    eq((await put(Buffer.alloc(3 * 1024 * 1024 + 1))).status, 413);
    eq((await put(a, '', { 'content-type': 'image/svg+xml' })).status, 415);
    eq((await put(Buffer.from([137,80,78,71,13,10,26,10,0]))).status, 400);
    writeFailure = true; eq((await put(a)).status, 503); writeFailure = false;
    eq(hash(stored), before); eq(writes, count);
  });
  if (process.argv.includes('--routes-only')) { console.log('PASS ' + checks + ' photo route assertions; synthetic transports only'); return; }
  stored = null; previous = null; staleRead = false;
  await buildBrowser(); await serve();
  const { chromium } = require(process.env.PROFILE_PLAYWRIGHT_MODULE || 'playwright');
  browser = await chromium.launch({ headless: true, executablePath: process.env.PROFILE_BROWSER_EXECUTABLE });
  const context = await browser.newContext();
  await context.route('**/*', r => {
    if (new URL(r.request().url()).origin === origin) return r.continue();
    blockedExternalRequests++; return r.abort('blockedbyclient');
  });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin); await page.getByRole('button', { name: 'Įkelti nuotrauką', exact: true }).waitFor();
  async function render(bytes, width, height) {
    const expected = await photo.processPhoto(bytes), expectedHash = hash(expected);
    const response = page.waitForResponse(r => r.request().method() === 'PUT' && r.url() === origin + '/api/profilis/nuotrauka');
    await page.locator('input[type=file]').setInputFiles({ name: 'synthetic.png', mimeType: 'image/png', buffer: bytes });
    const putResponse = await response; eq(putResponse.status(), 200); eq((await putResponse.json()).version, expectedHash);
    await page.waitForFunction(({ width, height, version }) => {
      const i = document.querySelector('img[alt="Profilio nuotrauka"]');
      return i?.complete && i.naturalWidth === width && i.naturalHeight === height && new URL(i.src).searchParams.get('v') === version;
    }, { width, height, version: expectedHash });
    const pixel = await page.getByRole('img', { name: 'Profilio nuotrauka' }).evaluate(i => {
      const canvas = document.createElement('canvas'); canvas.width = i.naturalWidth; canvas.height = i.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(i, 0, 0); return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
    });
    const raw = await sharp(expected).removeAlpha().raw().toBuffer(); eq(pixel, Array.from(raw.subarray(0, 3)));
    eq(hash(stored), expectedHash); eq(bundleRequests.some(u => new URL(u, origin).searchParams.get('v') === expectedHash), true);
    eq(storageNonces.includes(expectedHash), true);
  }
  await group('Real React/Next Image first upload and A->B->C immediate pixels WITHOUT reload', async () => {
    await render(a, 120, 90); await render(b, 86, 110); await render(c, 72, 64);
    await page.screenshot({ path: path.join(out, 'immediate-c.png') });
  });
  await group('Normal reload preserves C; delete and re-upload', async () => {
    await page.reload(); await page.waitForFunction(() => { const i = document.querySelector('img'); return i?.complete && i.naturalWidth === 72 && i.naturalHeight === 64; });
    eq(new URL(await page.getByRole('img', { name: 'Profilio nuotrauka' }).getAttribute('src'), origin).searchParams.get('v'), hash(stored));
    await page.getByRole('button', { name: 'Pašalinti nuotrauką' }).click(); await page.getByRole('button', { name: 'Įkelti nuotrauką', exact: true }).waitFor();
    eq(await page.getByRole('img').count(), 0); eq(stored, null); await render(a, 120, 90);
  });
  await group('Failed replacement preserves old rendered photo and supports retry', async () => {
    const before = await page.getByRole('img').getAttribute('src'); writeFailure = true;
    await page.locator('input[type=file]').setInputFiles({ name: 'synthetic.png', mimeType: 'image/png', buffer: b }); await page.getByRole('alert').waitFor();
    eq(await page.getByRole('img').getAttribute('src'), before); writeFailure = false;
    await page.getByRole('button', { name: 'Bandyti dar kartą' }).click();
    await page.waitForFunction(() => { const i = document.querySelector('img'); return i?.complete && i.naturalWidth === 86; }); eq(errors, []);
  });
  eq(blockedExternalRequests, 0);
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ verdict: 'PASS', checks, groups, browser: await browser.version(), blockedExternalRequests, scope: 'Actual routes/Sharp/SDK and React/Next Image; synthetic Auth/DB/Storage transports; loopback only; no live Storage/RLS claim' }, null, 2));
  console.log('PASS ' + checks + ' photo replacement assertions; ' + groups.length + ' groups; no production connection');
}
main().catch(e => { console.error(e); if (errors.length) console.error('Synthetic browser errors:', errors); process.exitCode = 1; }).finally(async () => { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); });
