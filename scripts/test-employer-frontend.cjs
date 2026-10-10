// Local-only transport fixture + real PostgreSQL WASM/RLS + actual Next/browser.
// This is NOT GoTrue/PostgREST/Storage-service infrastructure or production QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const https = require('node:https');
const { spawn, spawnSync } = require('node:child_process');
const { chromium } = require(process.env.PROFILE_PLAYWRIGHT_MODULE || 'playwright');
const { createDatabase } = require('./profile-test-db.cjs');
const sharp = require('sharp');
const catalog = require('../lib/organizations/catalogs.json');
const root = path.resolve(__dirname, '..'), out = path.join(root, '.staging-results', 'stage5-frontend');
const origin = 'http://localhost:4368', api = 'https://127.0.0.1:4369';
let db, transport, next, browser, checks = 0, chain = Promise.resolve(), failDelete = false;
const actors = new Map(), objects = new Map(), groups = [], errors = [], logs = [], warnings = [];
const report = { scope: 'Local synthetic HTTP Auth/Storage transport, real PostgreSQL WASM/RLS and actual Next UI', productionAccess: false };
const eq = (a, b, message) => { assert.deepEqual(a, b, message); checks++; };
const ok = (a, message) => { assert.ok(a, message); checks++; };
const serial = task => { const pending = chain.then(task); chain = pending.catch(() => {}); return pending; };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function group(name, task) { await task(); groups.push(name); console.log('PASS ' + name); }
async function actor(kind) {
  return serial(async () => {
    const id = crypto.randomUUID(), email = `${id}@example.invalid`;
    await db.query('reset role');
    await db.query('insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values($1,$2,$3,now())', [id, email, JSON.stringify({ account_role: kind })]);
    await db.query('insert into auth.sessions(id,user_id) values($1,$1)', [id]);
    const claims = { sub: id, session_id: id, role: 'authenticated', exp: Math.floor(Date.now()/1000)+3600 };
    const token = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'LOCAL_SYNTHETIC_SIGNATURE'].join('.');
    const value = { id, email, claims, token, user: { id, email, email_confirmed_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, aud: 'authenticated', role: 'authenticated' } };
    actors.set(token, value); return value;
  });
}
async function rpc(a, name, args = {}) {
  return serial(async () => {
    await db.query('reset role');
    await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify(a?.claims || {})]);
    await db.query(`set role ${a ? 'authenticated' : 'anon'}`);
    const entries = Object.entries(args);
    return (await db.query(`select public."${name}"(${entries.map(([key], i) => `"${key}" => $${i+1}`).join(',')}) value`, entries.map(([, value]) => value && typeof value === 'object' ? JSON.stringify(value) : value))).rows[0].value;
  });
}
async function owner(a) { const bundle = await membership(a); return bundle.length ? rpc(a, 'own_org_context', { organization_id: bundle[0].organization_id }) : null; }
async function membership(a) {
  return serial(async () => {
    await db.query('reset role');
    await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify(a?.claims || {})]);
    await db.query(`set role ${a ? 'authenticated' : 'anon'}`);
    return (await db.query('select organization_id from public.organization_memberships where user_id=$1 and revoked_at is null', [a?.id])).rows;
  });
}
async function mutate(a, name, payload) { const c = await owner(a); return rpc(a, name, { organization_id: c.organization.id, expected_row_version: c.rowVersion, payload }); }
async function approve(a, admin, scope = 'representation') {
  let c = await owner(a);
  const pending = await serial(async () => { await db.query('reset role'); return (await db.query('select id from private.organization_verification_cases where organization_id=$1 and scope=$2 and status=$3', [c.organization.id, scope, 'pending'])).rows.length; });
  if (!pending) c = await mutate(a, scope === 'identity' ? 'request_employer_verification' : 'request_representation_verification', { scope, method: 'official_contact', reference: 'LOCAL SYNTHETIC CONTACT' });
  const caseId = await serial(async () => { await db.query('reset role'); return (await db.query(`select ${scope === 'identity' ? 'identity_case_id' : 'representation_case_id'} id from private.organization_controls where organization_id=$1`, [c.organization.id])).rows[0].id; });
  return rpc(admin, 'admin_resolve_case', { organization_id: c.organization.id, expected_row_version: c.rowVersion, payload: { case_id: caseId, decision: 'approved', method: 'official_contact', reference: 'LOCAL INDEPENDENT SYNTHETIC CONTACT' } });
}
const allowRpc = new Set(['account_capabilities','own_org_context','list_my_pending_transfers','create_org_draft','create_second_profile','patch_org_public','save_org_locations','save_org_legal_draft','save_own_representative_details','save_org_type_block','save_org_benefits','request_org_legal_change','request_employer_verification','request_representation_verification','request_org_transfer','accept_org_transfer','decline_org_transfer','cancel_org_transfer','resolve_org_slug','prepare_org_media','commit_org_media','remove_org_media','read_org_media','read_own_specialist_profile','profile_completeness','profile_catalogs']);
async function serve(req, res) {
  res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Access-Control-Allow-Headers', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.end(); return; }
  const url = new URL(req.url, api), a = actors.get((req.headers.authorization || '').replace(/^Bearer /, ''));
  const chunks = []; for await (const chunk of req) chunks.push(chunk); const body = Buffer.concat(chunks);
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  try {
    if (url.pathname === '/auth/v1/user') { send(a ? 200 : 401, a?.user || { message: 'Local fixture session required' }); return; }
    if (url.pathname.startsWith('/storage/v1/')) {
      if (req.method !== 'GET' && req.headers.apikey !== 'sb_secret_LOCAL_SYNTHETIC_ONLY') { send(403, { message: 'Fixture Storage service credentials required' }); return; }
      const prefix = '/storage/v1/object/', key = decodeURIComponent(url.pathname.slice(prefix.length));
      if (req.method === 'POST') {
        objects.set(key, Buffer.from(body));
        const split = key.indexOf('/');
        await serial(async () => { await db.query('reset role'); await db.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)', [key.slice(0,split), key.slice(split+1), JSON.stringify({size:body.length,mimetype:'image/webp'})]); });
        send(200, { Key: key }); return;
      }
      if (req.method === 'DELETE') {
        if (failDelete) { failDelete = false; send(503, { message: 'LOCAL SYNTHETIC cleanup failure' }); return; }
        const data = JSON.parse(body.toString()); for (const item of data.prefixes || []) { objects.delete(`${key}/${item}`); await serial(async () => { await db.query('reset role'); await db.query('delete from storage.objects where bucket_id=$1 and name=$2', [key,item]); }); } send(200, []); return;
      }
      const actualKey = key.replace(/^authenticated\//, '');
      const split = actualKey.indexOf('/');
      const readable = await serial(async () => {
        await db.query('reset role');
        await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(a?.claims || {})]);
        await db.query(`set role ${a ? 'authenticated' : 'anon'}`);
        return (await db.query('select name from storage.objects where bucket_id=$1 and name=$2',[actualKey.slice(0,split),actualKey.slice(split+1)])).rows.length === 1;
      });
      const bytes = readable ? objects.get(actualKey) : null;
      if (!bytes) { send(404, { message: 'Object not found' }); return; }
      res.writeHead(200, { 'Content-Type': 'image/webp' }); res.end(bytes); return;
    }
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const name = url.pathname.split('/').at(-1); if (!allowRpc.has(name)) { send(403, { code: '42501' }); return; }
      if(name.includes('transfer'))logs.push(`Fixture called ${name}\n`);
      const data = await rpc(a, name, body.length ? JSON.parse(body.toString()) : Object.fromEntries(url.searchParams)); send(200, data); return;
    }
    if (url.pathname === '/rest/v1/organization_memberships') { send(200, await membership(a)); return; }
    if (url.pathname === '/rest/v1/profiles' && a) { send(200, (req.headers.accept || '').includes('vnd.pgrst.object') ? { id: a.id } : [{ id: a.id }]); return; }
    send(404, { code: 'LOCAL_UNSUPPORTED_ROUTE' });
  } catch (error) { logs.push(`Fixture ${url.pathname}: ${error.code || 'LOCAL_FIXTURE_ERROR'}\n`); send(400, { code: error.code || 'LOCAL_FIXTURE_ERROR', message: 'Local fixture request failed' }); }
}
async function session(a, width = 1440) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, ignoreHTTPSErrors: true });
  await context.addCookies([{ name: 'sb-127-auth-token', value: 'base64-' + Buffer.from(JSON.stringify({ access_token: a.token, refresh_token: 'LOCAL_SYNTHETIC_REFRESH', expires_at: a.claims.exp, expires_in: 3600, token_type: 'bearer', user: a.user })).toString('base64url'), domain: 'localhost', path: '/' }]);
  const page = await context.newPage(); page.on('pageerror', e => errors.push(`${page.url()} | ${groups.at(-1) || 'initial'} | ${e.stack || e.message}`));
  page.on('console',entry=>{if(entry.type()==='warning')warnings.push(entry.text());});
  return { context, page };
}
async function edit(page, step) {
  if (page.viewportSize().width <= 760) {
    if (await page.locator('.profile-mobile-steps').count()) await page.getByLabel('Profilio dalis', { exact: true }).selectOption(String(step));
    else await page.locator('.profile-section').filter({ has: page.getByRole('heading', { name: ['Pagrindiniai duomenys','Juridiniai ir atstovo duomenys','Organizacijos pristatymas'][step-1], exact: true }) }).getByRole('button').click();
  } else await page.locator('.profile-steps button').nth(step-1).click();
}
async function save(page) { await page.locator('.employer-save button').click(); await page.getByRole('status').filter({ hasText: 'Pakeitimai išsaugoti.' }).waitFor(); }
async function panel(page, name) { const details = page.locator('.employer-panel').filter({ has: page.locator('summary').filter({ hasText: name }) }); if (!(await details.getAttribute('open') !== null)) await details.locator(':scope > summary').click(); return details; }
async function overview(page) { await page.getByRole('button', { name: 'Grįžti į profilį', exact: true }).click(); }
async function overflow(page) { eq(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, 'Horizontal overflow'); }
async function touchTargets(page) { eq(await page.locator('main').evaluate(main => [...main.querySelectorAll('button, summary, input:not([type=checkbox]):not([type=file]), select, .profile-checks label')].filter(e => e.getClientRects().length).every(e => { const box = e.getBoundingClientRect(); return box.width >= 44 && box.height >= 44; })), true, '44px touch targets'); }
async function run() {
  fs.mkdirSync(out, { recursive: true });
  const cert = path.join(out, 'fixture-cert.pem'), key = path.join(out, 'fixture-key.pem');
  if (process.platform !== 'win32') throw Error('This isolated fixture runner currently requires the approved Windows/WSL workspace.');
  const linux = file => '/mnt/' + file[0].toLowerCase() + file.slice(2).replace(/\\/g, '/');
  const generated = spawnSync('wsl.exe', ['-d','VetKarjera-Stage43','-u','root','--','openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1,DNS:localhost','-keyout',linux(key),'-out',linux(cert)], { windowsHide: true, timeout: 60000 });
  eq(generated.status, 0, 'Local-only test certificate generation');
  db = await createDatabase();
  const employer = await actor('employer'), recipient = await actor('specialist'), third = await actor('specialist'), admin = await actor('specialist');
  await serial(async () => { await db.query('reset role'); await db.query("insert into private.account_admins(user_id,source) values($1,'LOCAL FRONTEND QA')", [admin.id]); });
  transport = https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) }, (req,res) => { void serve(req,res); });
  await new Promise(resolve => transport.listen(4369, '127.0.0.1', resolve));
  next = spawn(process.execPath, [path.join(root,'node_modules/next/dist/bin/next'),'dev','--hostname','localhost','--port','4368'], { cwd: root, windowsHide: true, env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: api, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_LOCAL_SYNTHETIC_ONLY', SUPABASE_STORAGE_SERVICE_ROLE_KEY: 'sb_secret_LOCAL_SYNTHETIC_ONLY', NODE_EXTRA_CA_CERTS: cert, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore','pipe','pipe'] });
  next.stdout.on('data', v => logs.push(v.toString())); next.stderr.on('data', v => logs.push(v.toString()));
  for (let i=0; i<90; i++) { if (logs.join('').includes('Ready in')) break; if (next.exitCode !== null) throw Error('Local Next start failed'); await wait(1000); }
  browser = await chromium.launch({ headless: true, ...(process.env.PROFILE_BROWSER_EXECUTABLE ? { executablePath: process.env.PROFILE_BROWSER_EXECUTABLE } : {}) });
  const { page } = await session(employer);
  await group('Owner entry, partial draft, real server actions and 20/70 publication', async () => {
    await page.goto(origin + '/profilis'); await page.waitForURL('**/profilis/darbdavys');
    await page.getByRole('button', { name: 'Pradėti pildyti profilį' }).click();
    await page.getByLabel('Organizacijos pavadinimas', { exact: true }).fill('Vietinė testų klinika'); await save(page);
    eq((await owner(employer)).completeness.total, 0);
    await page.getByLabel('Organizacijos tipas', { exact: true }).selectOption('veterinary_clinic'); await page.getByRole('button', { name: 'Keisti tipą', exact: true }).click();
    await page.locator('.employer-entries').getByRole('button', { name: 'Pridėti', exact: true }).click(); await page.getByLabel('Miestai 1', { exact: true }).fill('Kaunas'); await save(page);
    eq((await owner(employer)).completeness.total, 20);
    await edit(page, 2); await page.getByLabel('Juridinis pavadinimas', { exact: true }).fill('LOCAL SYNTHETIC UAB'); await save(page);eq((await owner(employer)).completeness.total,20);
    await page.getByLabel('Teisinė forma').selectOption('uab'); await page.getByLabel('Juridinio asmens kodas', { exact: true }).fill('LOCAL-ONLY');
    for (const [label, value] of [['Vardas','Testo'],['Pavardė','Savininkas'],['Atstovavimo pagrindas / pareigos','Vadovas'],['Kontaktinis telefonas','+37000000000']]) await page.getByLabel(label, { exact: true }).fill(value);
    await save(page); const c = await owner(employer); eq(c.profileState,'active'); eq(c.completeness.total,70); eq(c.organization.publicPhone,undefined); eq(c.organization.publicEmail,undefined);
  });
  await group('All 14 adaptive types; Other; distributor multi including mixed; lab free text', async () => {
    for (const type of catalog.typeMatrix) {
      await edit(page,1); await page.getByLabel('Organizacijos tipas', { exact:true }).selectOption(type.type);
      if (await page.getByRole('dialog').count()) await page.getByRole('button',{name:'Keisti tipą',exact:true}).click();
      if (await page.locator('.employer-save button').isEnabled()) await save(page);
      await edit(page,3); const activity = await panel(page,'Organizacijos veikla');
      for (const code of type.groups) {
        const g = catalog.groups.find(g => g.type === type.type && g.code === code);
        const area = activity.locator('.employer-activity-group').filter({has:page.getByText(g.label,{exact:true})});
        if (g.kind === 'text') { await area.getByRole('button',{name:'Pridėti',exact:true}).click(); await area.locator('input[type=text]').fill('Vietinė testų veikla'); }
        else await area.locator('input[type=checkbox]').first().check();
      }
      if (type.type === 'veterinary_wholesale_distributor') {
        const extra = activity.locator('.employer-activity-group').filter({has:page.getByText(catalog.groups.find(g=>g.type===type.type&&g.code==='animal_market_segments').label,{exact:true})});
        for (const checkbox of await extra.locator('input[type=checkbox]').all()) await checkbox.check();
      }
      if (type.type === 'laboratory_diagnostics') {
        const extra = activity.locator('.employer-activity-group').filter({has:page.getByText(catalog.groups.find(g=>g.type===type.type&&g.code==='served_sectors_species').label,{exact:true})});
        await extra.getByRole('button',{name:'Pridėti',exact:true}).click(); await extra.locator('input[type=text]').fill('Smulkieji gyvūnai');
      }
      await save(page); eq((await owner(employer)).completeness.typeQualityPoints,5,type.type);
    }
  });
  await group('Benefits round trip by code; public info; independent media + unsaved text; cleanup recovery', async () => {
    const benefit = await panel(page,'Ką siūlome darbuotojams'); await benefit.getByLabel('Mentorystė',{exact:true}).check();
    await page.getByLabel('Organizacijos aprašymas',{exact:true}).fill('Vietinis organizacijos aprašymas.');
    await panel(page,'Vieši kontaktai'); await page.getByLabel('Komandos dydis').selectOption('size_1'); await page.getByLabel('Viešas el. paštas').fill('public@example.invalid'); await save(page);
    eq((await owner(employer)).organization.employeeSize,'size_1'); eq((await owner(employer)).organization.benefits,['Mentorystė']);
    await page.getByLabel('Organizacijos aprašymas',{exact:true}).fill('Dar neišsaugotas aprašymas.');
    const media = await panel(page,'Logotipas ir viršelio nuotrauka');
    const image = await sharp({ create:{ width:100,height:80,channels:3,background:'#f0f0ff' } }).png().toBuffer();
    for (const kind of ['logo','cover']) {
      await media.locator('.employer-media').nth(kind==='logo'?0:1).locator('input[type=file]').setInputFiles({name:'local-fixture.png',mimeType:'image/png',buffer:image});
      await media.locator('.employer-media').nth(kind==='logo'?0:1).getByRole('status').filter({hasText:'Vaizdas išsaugotas.'}).waitFor();
      const c = await owner(employer); ok(c.organization.media[kind]);
      const response = await page.request.get(origin+c.organization.media[kind].src); eq(response.status(),200); ok((await response.body()).length>0);
      eq(await page.getByLabel('Organizacijos aprašymas',{exact:true}).inputValue(),'Dar neišsaugotas aprašymas.');
    }
    eq((await owner(employer)).completeness.total,100);
    for (const kind of ['logo','cover']) {
      const item = media.locator('.employer-media').nth(kind==='logo'?0:1), previous=(await owner(employer)).organization.media[kind].version;
      const replacement=await sharp({create:{width:80,height:100,channels:3,background:'#eeccaa'}}).png().toBuffer();
      await item.locator('input[type=file]').setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:replacement});
      await page.waitForFunction(({kind,previous})=>{const image=document.querySelector(`.employer-${kind}`);return image && !image.getAttribute('src').includes(previous);},{kind,previous});
      ok((await owner(employer)).organization.media[kind].version!==previous);
      await item.getByRole('button',{name:'Pašalinti',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Pašalinti',exact:true}).click();
      await item.getByRole('status').filter({hasText:'Vaizdas pašalintas.'}).waitFor();eq((await owner(employer)).organization.media[kind],undefined);
      await item.locator('input[type=file]').setInputFiles({name:'local-fixture.png',mimeType:'image/png',buffer:image});await item.getByRole('status').filter({hasText:'Vaizdas išsaugotas.'}).waitFor();
    }
    await media.locator('.employer-media').first().locator('input[type=file]').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('LOCAL INVALID IMAGE')});
    await media.getByRole('status').filter({hasText:'Pasirinkite JPEG, PNG arba WebP failą iki 3 MB.'}).waitFor();
    eq(await page.getByLabel('Organizacijos aprašymas',{exact:true}).inputValue(),'Dar neišsaugotas aprašymas.');
    failDelete = true;
    await media.locator('.employer-media').first().getByRole('button',{name:'Pašalinti',exact:true}).click(); await page.getByRole('dialog').getByRole('button',{name:'Pašalinti',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'Vaizdo operacija nebuvo visiškai užbaigta.'}).waitFor();
    eq((await owner(employer)).organization.media.logo,undefined); eq(await media.locator('.employer-logo').count(),0);
    await save(page);
  });
  await group('Version conflict keeps input; explicit refresh; active→draft→active; old slug 308/private data exclusion', async () => {
    await edit(page,1); await page.getByLabel('Organizacijos pavadinimas',{exact:true}).fill('Vietinis neišsaugotas pavadinimas');
    const old = await owner(employer); await mutate(employer,'patch_org_public',{name:'Kitas serverio pavadinimas'});
    await page.locator('.employer-save button').click(); await page.getByRole('alert').filter({hasText:'Duomenys pasikeitė'}).waitFor(); eq(await page.getByLabel('Organizacijos pavadinimas',{exact:true}).inputValue(),'Vietinis neišsaugotas pavadinimas');
    await page.getByRole('button',{name:'Įkelti naujausius duomenis'}).click(); await page.getByRole('button',{name:'Išeiti neišsaugojus'}).click(); await page.getByLabel('Organizacijos pavadinimas',{exact:true}).filter({visible:true}).waitFor();
    await page.waitForFunction(() => document.querySelector('main input')?.value==='Kitas serverio pavadinimas');
    const publicSession = await browser.newContext({ignoreHTTPSErrors:true}); const publicPage = await publicSession.newPage();publicPage.on('pageerror',e=>errors.push(`${publicPage.url()} | ${e.stack || e.message}`));
    const redirected = await publicSession.request.get(origin+'/darbdaviai/'+old.organization.slug,{maxRedirects:0}); eq(redirected.status(),308);
    await publicPage.goto(origin+'/darbdaviai/'+(await owner(employer)).organization.slug); eq(await publicPage.locator('h1').textContent(),'Kitas serverio pavadinimas');
    const content = await publicPage.locator('main').innerText(); ok(!content.includes('LOCAL SYNTHETIC UAB')); ok(!content.includes('+37000000000')); ok(!content.includes('70 %')); ok(content.includes('1–5'));
    await page.locator('.employer-entries').getByRole('button',{name:/Pašalinti/}).click(); await save(page); eq((await owner(employer)).profileState,'draft');
    eq((await publicSession.request.get(origin+'/darbdaviai/'+(await owner(employer)).organization.slug)).status(),404);
    await page.locator('.employer-entries').getByRole('button',{name:'Pridėti',exact:true}).click(); await page.getByLabel('Miestai 1',{exact:true}).fill('Kaunas'); await save(page); eq((await owner(employer)).profileState,'active');
    eq((await publicSession.request.get(origin+'/darbdaviai/nezinoma-organizacija')).status(),404);
    await publicSession.close();
  });
  await group('Needs-info neutral owner UI; verified identity readonly + real legal change request', async () => {
    await overview(page); await page.getByRole('button',{name:'Pateikti patikrinimui',exact:true}).click();
    await page.getByLabel('Patikrinimo būdas').selectOption('official_contact'); await page.getByLabel('Patikrinimo nuoroda / kontaktas').fill('LOCAL OWNER CONTACT'); await page.getByRole('dialog').getByRole('button',{name:'Pateikti patikrinimui',exact:true}).click();
    await page.getByRole('dialog').waitFor({state:'hidden'}); await page.getByText('Duomenys pateikti patikrinimui.',{exact:true}).first().waitFor();
    let c = await owner(employer); eq(c.verification.state,'pending');
    const caseId = await serial(async()=>{await db.query('reset role');return(await db.query('select identity_case_id id from private.organization_controls where organization_id=$1',[c.organization.id])).rows[0].id;});
    await rpc(admin,'admin_resolve_case',{organization_id:c.organization.id,expected_row_version:c.rowVersion,payload:{case_id:caseId,decision:'needs_info',reason:'PRIVATE ADMIN QA REASON'}});
    await page.reload(); await page.getByText('Patikrinimui reikia papildomos informacijos.',{exact:true}).waitFor(); ok(!(await page.locator('main').innerText()).includes('PRIVATE ADMIN QA REASON'));
    await approve(employer,admin,'identity'); await approve(employer,admin); await page.reload();
    await edit(page,2); eq(await page.getByLabel('Juridinis pavadinimas',{exact:true}).getAttribute('readonly'),'');
    await page.getByRole('button',{name:'Prašyti pakeisti',exact:true}).click(); await page.getByRole('dialog').getByLabel('Juridinis pavadinimas',{exact:true}).fill('LOCAL PROPOSED NAME'); await page.getByRole('button',{name:'Pateikti prašymą'}).click();
    await page.getByRole('status').filter({hasText:'Pakeitimo prašymas pateiktas peržiūrai.'}).waitFor(); eq((await owner(employer)).legal.legalName,'LOCAL SYNTHETIC UAB');
  });
  await group('Transfer cancel/decline/accept; new owner restricted capabilities; representation editing', async () => {
    await overview(page); await page.getByLabel('Gavėjo el. paštas').fill(recipient.email); await page.getByRole('button',{name:'Perduoti savininkystę'}).click(); await page.getByRole('button',{name:'Atšaukti perdavimą'}).waitFor();
    await page.getByRole('button',{name:'Atšaukti perdavimą'}).click(); await page.getByText('Perdavimo pasiūlymas atšauktas.',{exact:true}).waitFor();
    await page.getByLabel('Gavėjo el. paštas').fill(recipient.email); await page.getByRole('button',{name:'Perduoti savininkystę'}).click(); await page.getByRole('button',{name:'Atšaukti perdavimą'}).waitFor();
    const target = await session(recipient,390); await target.page.goto(origin+'/profilis/darbdavys');
    await target.page.waitForFunction(()=>[...document.querySelectorAll('button')].some(e=>e.textContent==='Atsisakyti perimti'&&Object.keys(e).some(k=>k.startsWith('__reactProps$'))));
    await target.page.getByRole('button',{name:'Atsisakyti perimti',exact:true}).click();
    try { await target.page.getByText('Perdavimo pasiūlymas atmestas.',{exact:true}).waitFor({timeout:10000}); }
    catch(error) { console.log('Incoming transfer alerts:',await target.page.getByRole('alert').allTextContents()); console.log('Incoming content:',await target.page.locator('main').innerText()); console.log('Fixture diagnostics:',logs.filter(line=>line.startsWith('Fixture'))); throw error; }
    await page.reload(); await page.getByLabel('Gavėjo el. paštas').fill(recipient.email); await page.getByRole('button',{name:'Perduoti savininkystę'}).click(); await page.getByRole('button',{name:'Atšaukti perdavimą'}).waitFor();
    await target.page.reload();
    for (const [label,value] of [['Vardas','Kitas'],['Pavardė','Savininkas'],['Atstovavimo pagrindas / pareigos','Vadovas'],['Kontaktinis telefonas','+37011111111']]) await target.page.getByLabel(label,{exact:true}).fill(value);
    await target.page.getByRole('button',{name:'Priimti profilio valdymą',exact:true}).click(); await target.page.getByText('Profilį galite peržiūrėti.',{exact:false}).waitFor();
    eq((await owner(recipient)).capabilities.canEditProfile,false); await edit(target.page,1); eq(await target.page.getByLabel('Organizacijos pavadinimas',{exact:true}).isDisabled(),true);
    await edit(target.page,2); eq(await target.page.getByLabel('Kontaktinis telefonas',{exact:true}).isDisabled(),false); await target.page.getByLabel('Kontaktinis telefonas',{exact:true}).fill('+37022222222'); await save(target.page); eq((await owner(recipient)).representative.privatePhone,'+37022222222');
    await approve(recipient,admin); await target.page.reload(); eq((await owner(recipient)).capabilities.canEditProfile,true);
    await mutate(recipient,'request_org_transfer',{target_email:third.email});
    await serial(async()=>{await db.query('reset role');await db.query("update private.organization_ownership_transfers set expires_at=now()-interval '1 second' where to_user_id=$1 and status='pending'",[third.id]);});
    eq((await rpc(third,'list_my_pending_transfers')).length,0);
    await target.context.close();
  });
  await group('Responsive 320/360/390/1440; long brand; focus/dialog; public minimal profile', async () => {
    await mutate(recipient,'patch_org_public',{name:'IlgasProfesionaliosVeterinarijosOrganizacijosPavadinimas'.repeat(3)});
    const target = await session(recipient); await target.page.goto(origin+'/profilis/darbdavys');
    for (const width of [320,360,390,1440]) {
      await target.page.setViewportSize({width,height:900}); await overflow(target.page);
      await target.page.screenshot({path:path.join(out,`overview-${width}.png`),fullPage:true});
      for (const n of [1,2,3]) { await edit(target.page,n); if(n===3) for(const summary of await target.page.locator('.employer-panel > summary').all()) { if(await summary.locator('..').getAttribute('open')===null)await summary.click(); } await overflow(target.page); if(width<=390)await touchTargets(target.page); await target.page.screenshot({path:path.join(out,`step-${n}-${width}.png`),fullPage:true}); }
      await overview(target.page);
    }
    await target.page.setViewportSize({width:390,height:900}); await edit(target.page,1); await target.page.getByLabel('Organizacijos pavadinimas',{exact:true}).fill('Neišsaugota'); await target.page.getByRole('button',{name:'Grįžti į profilį'}).click();
    await target.page.getByRole('dialog').waitFor(); eq(await target.page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)),true); await target.page.getByRole('button',{name:'Likti',exact:true}).click(); eq(await target.page.getByLabel('Organizacijos pavadinimas',{exact:true}).inputValue(),'Neišsaugota');
    await target.page.getByRole('button',{name:'Grįžti į profilį'}).click(); await target.page.getByRole('button',{name:'Išeiti neišsaugojus'}).click();
    await target.context.close();
  });
  await group('Minimal 70% public profile; all public states and invalid slugs; anonymous owner access denied',async()=>{
    const minimal=await actor('employer');await rpc(minimal,'create_org_draft');
    await mutate(minimal,'patch_org_public',{name:'Minimalus vietinis profilis',organization_type_code:'individual_activity'});
    await mutate(minimal,'save_org_locations',{cities:[{city_name:'Kaunas'}]});await mutate(minimal,'save_org_legal_draft',{legal_name:'LOCAL NATURAL PERSON',legal_form_code:'natural_person'});
    let c=await mutate(minimal,'save_own_representative_details',{first_name:'Vietinis',last_name:'Testas',capacity:'Savininkas',private_phone:'LOCAL PRIVATE PHONE'});eq(c.completeness.total,70);
    const anonymous=await browser.newContext({ignoreHTTPSErrors:true});const p=await anonymous.newPage();p.on('pageerror',e=>errors.push(`${p.url()} | ${e.stack || e.message}`));
    for(const width of [390,1440]){await p.setViewportSize({width,height:900});const response=await p.goto(origin+'/darbdaviai/'+c.organization.slug);eq(response.status(),200);eq(await p.locator('main img').count(),0);eq(await p.getByRole('heading',{name:'Kontaktai',exact:true}).count(),0);await overflow(p);eq((await p.locator('main').boundingBox()).x,width===390?16:120);await p.screenshot({path:path.join(out,`public-minimal-${width}.png`),fullPage:true});}
    await p.goto(origin+'/profilis/darbdavys');await p.waitForURL(/\/prisijungti\?next=/);ok(p.url().includes('/prisijungti?next='));
    for(const slug of ['nezinoma','nezinoma.png','invalid.slug','invalid/extra'])eq((await anonymous.request.get(origin+'/darbdaviai/'+slug)).status(),404);
    for(const state of ['suspended','archived']){c=await rpc(admin,'admin_organization_state',{organization_id:c.organization.id,expected_row_version:c.rowVersion,payload:{state,reason:'LOCAL FRONTEND QA'}});eq((await anonymous.request.get(origin+'/darbdaviai/'+c.organization.slug)).status(),404);}
    await anonymous.close();
  });
  eq(errors,[],'Browser runtime errors');
  report.status='PASS'; report.assertions=checks; report.groups=groups; report.browserErrors=errors;report.browserWarnings=[...new Set(warnings)];
}
run().catch(error=>{report.status='FAIL';report.error=error.message;console.error(error.stack);process.exitCode=1;})
  .finally(async()=>{report.assertions=checks;report.groups=groups;fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(out,'next.log'),logs.join(''));await browser?.close();next?.kill();await new Promise(resolve=>transport ? transport.close(resolve) : resolve());await db?.close();console.log(`Stage5.8 frontend ${report.status}: ${checks} assertions`);});
