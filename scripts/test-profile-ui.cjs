// Real local Next HTTP/cookie + Auth/RPC/Storage browser tests; no hosted targets.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const { chromium } = require(process.env.PROFILE_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..'), out = path.join(root, '.staging-results'), origin = 'http://localhost:4345';
let browser, checks = 0, actorIndex = 0;
const groups = [], run = Date.now().toString(36);
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const ok = (a, message) => { assert.ok(a, message); checks++; };
async function group(name, task) { await task(); groups.push(name); console.log('PASS ' + name); }
function localStatus() {
  const command = 'cd /opt/vetkarjera-stage43; test ! -f supabase/.temp/project-ref; node node_modules/supabase/dist/supabase.js status --output json';
  const r = process.platform === 'win32' ? spawnSync('wsl.exe', ['-d','VetKarjera-Stage43','-u','root','--','bash','-lc',command], { encoding: 'utf8' }) : spawnSync('bash',['-lc',command], { encoding:'utf8' });
  if (r.status !== 0) throw Error('Local staging status unavailable');
  const s = JSON.parse(r.stdout.slice(r.stdout.indexOf('{'))), u = new URL(s.API_URL);
  assert.ok(['127.0.0.1','localhost'].includes(u.hostname) && u.port === '54321');
  // WSL's Docker port is not exposed on this Windows host; use the guarded local TLS proxy.
  if (process.platform === 'win32') s.API_URL = 'https://127.0.0.1:4355';
  return s;
}
const s = localStatus(), opts = { auth: { persistSession:false, autoRefreshToken:false } };
const admin = createClient(s.API_URL, s.SERVICE_ROLE_KEY, opts);
async function actor(role, kind = 'specialist') {
  const email = `profile-ui-${run}-${++actorIndex}-${role}@example.test`, password = crypto.randomBytes(24).toString('base64url') + '!';
  const client = createClient(s.API_URL,s.ANON_KEY,opts);
  const metadata = kind === 'specialist' ? { account_role:kind,profile_contract_version:2,first_name:'Testo',last_name:'Specialistas',professional_role_code:role,...(role === 'other_veterinary_specialty' ? {specialty_free_text:'Testų specialybė'} : {}) } : { account_role:kind,profile_contract_version:2,organization_name_input:'Testų organizacija',organization_type_code:'veterinary_clinic' };
  const created = await client.auth.signUp({ email,password,options:{data:metadata} }); assert.ifError(created.error);
  assert.ifError((await admin.auth.admin.updateUserById(created.data.user.id,{email_confirm:true})).error);
  assert.ifError((await client.auth.signInWithPassword({email,password})).error);
  return { client,email,password,id:created.data.user.id,role,kind };
}
function trustedLocalAdmin(id) {
  // Synthetic fixture only in the unlinked local stack, using a parameterized query.
  assert.match(id,/^[0-9a-f-]{36}$/);
  const program="const {Client}=require('/opt/vetkarjera-stage43/node_modules/pg');(async()=>{const c=new Client({host:'127.0.0.1',port:54322,user:'postgres',password:'postgres',database:'postgres'});await c.connect();try{await c.query(\"insert into private.account_admins(user_id,source) values($1,'Stage4.5 local QA')\",[process.argv[2]]);}finally{await c.end();}})().catch(()=>process.exitCode=1);";
  const r=process.platform==='win32'?spawnSync('wsl.exe',['-d','VetKarjera-Stage43','-u','root','--','node','-',id],{input:program}):spawnSync('node',['-',id],{input:program});
  eq(r.status,0);
}
async function rpc(a,name,args={}) { const r = await a.client.rpc(name,args); assert.ifError(r.error); return r.data; }
async function state(a) { return rpc(a,'profile_completeness'); }
async function login(a,width=1440) {
  const context = await browser.newContext({ viewport:{width,height:900}, ignoreHTTPSErrors:true }), page = await context.newPage();
  page.on('dialog', async d => { await d.dismiss(); });
  const errors=[];page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin+'/prisijungti');
  await page.getByLabel('El. paštas',{exact:true}).fill(a.email); await page.getByLabel('Slaptažodis',{exact:true}).fill(a.password);
  await page.getByRole('button',{name:'Prisijungti',exact:true}).click(); await page.waitForURL(origin+'/'); await page.goto(origin+'/profilis');
  try { await page.getByRole('heading',{name:a.kind==='employer'?'Profilis':'Testo Specialistas',exact:true}).waitFor(); }
  catch (e) { console.log('Profile headings:',await page.locator('h1').allTextContents()); console.log('Profile alerts:',await page.locator('[role=alert]').allTextContents()); throw e; }
  return {context,page,errors};
}
async function edit(page,title) { await page.locator('.profile-section').filter({has:page.getByRole('heading',{name:title,exact:true})}).getByRole('button',{name:'Redaguoti',exact:true}).click(); }
async function step(page,n) { if (page.viewportSize().width <= 760) await page.getByLabel('Profilio dalis',{exact:true}).selectOption(String(n)); else await page.locator('.profile-steps').getByRole('button').nth(n-1).click(); }
async function returnAndReopen(page, n) { await page.locator('.profile-identity').waitFor(); eq(new URL(page.url()).pathname,'/profilis'); if (page.viewportSize().width <= 760) await edit(page,['Pagrindiniai duomenys','Profesinis profilis','Kompetencijos ir tobulėjimas'][n-1]); else await step(page,n); }
async function save(page) { const n=await page.locator('.profile-content > h1').innerText(); const index=['Pagrindiniai duomenys','Profesinis profilis','Kompetencijos ir tobulėjimas'].indexOf(n)+1; await page.getByRole('button',{name:'Išsaugoti',exact:true}).first().click(); await page.locator('.profile-notice.success').waitFor(); eq(await page.getByRole('button',{name:'Išsaugoti',exact:true}).first().isDisabled(),true); await returnAndReopen(page,index); }
async function overview(page) { await page.getByRole('button',{name:'‹ Grįžti į profilį',exact:true}).click();await page.locator('.profile-identity').waitFor();if(await page.locator('.profile-license').count())await page.locator('.profile-license-status').waitFor(); }
async function overflow(page) { eq(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true); }
async function fullStep2(a) {
  await rpc(a,'save_education',{payload:{institution_code:a.role === 'veterinarian' || a.role === 'veterinary_student' ? 'lsmu' : null,institution_name:'Testų įstaiga',program_or_qualification:'Testų kvalifikacija',...(a.role==='veterinary_student'?{current_course:2}:{})}});
  await rpc(a,'save_specialist_step2',{payload:{home_location_code:'lt_kauno_m',experience_band_code:'3_5_years',job_search_status_code:'actively_looking',start_option_code:'one_month',profile_visibility:'application_only',animal_groups:['small_animals'],activity_areas:['clinical'],work_locations:['nationwide'],workloads:['full_time'],languages:[{language_code:'lt',proficiency_code:'native'}]}});
  if(a.role==='veterinarian') await rpc(a,'save_license',{number_input:'LOCAL-'+crypto.randomBytes(12).toString('hex')});
}
async function main() {
  fs.mkdirSync(out,{recursive:true}); browser=await chromium.launch({headless:true,executablePath:process.env.PROFILE_BROWSER_EXECUTABLE});
  const vet=await actor('veterinarian'), other=await actor('other_veterinary_specialty');
  for (const [,table] of fs.readFileSync(path.join(root,'lib/profiles/read.ts'),'utf8').matchAll(/from\('([^']+)'\)/g)) {
    let query=vet.client.from(table).select('*').limit(1);
    if(!table.startsWith('specialist_')&&!['professional_role_interests','autonomy_options','development_areas'].includes(table)) query=query.eq('is_active',true).order(table==='locations'?'label_lt':'sort_order');
    const r=await query; if(r.error) throw Error('Owner profile projection '+table+' failed: '+r.error.code);
  }
  let {context,page,errors}=await login(vet);
  await group('Login, session reload, specialist capabilities and overview missingRequired',async()=>{
    eq(await page.locator('.desktop-navigation a[href="/skelbti"]').count(),0); eq((await state(vet)).total,20);
    await page.getByText('Licencija nepateikta',{exact:true}).waitFor();
    ok((await page.locator('.profile-readiness').innerText()).includes('Profilis dar neparuoštas kandidatavimui'));
    ok((await page.locator('.profile-readiness').innerText()).includes('gyvūnų grupės'));
    await page.reload(); await page.getByRole('heading',{name:'Testo Specialistas'}).waitFor(); await overflow(page);
    await page.screenshot({path:path.join(out,'overview-20-desktop.png'),fullPage:true});
  });
  await group('Stage4.7 profession, persistent nav, header overview and account email',async()=>{
    eq(await page.locator('.profile-steps button').count(),3);
    ok((await page.locator('.profile-identity').innerText()).includes('Profesija: Veterinarijos gydytojas'));
    for(const n of [1,2,3]){
      await step(page,n);
      eq(await page.locator('.profile-steps [aria-current=step]').count(),1);
      if(n===1){eq(await page.getByLabel('El. paštas',{exact:true}).inputValue(),vet.email);eq(await page.getByLabel('El. paštas',{exact:true}).evaluate(i=>i.readOnly),true);}
      await page.locator('.desktop-navigation .profile-link').click();await page.locator('.profile-identity').waitFor();
    }
    for(const button of await page.locator('.profile-section-heading button').all()){ok((await button.boundingBox()).height>=44);ok((await button.getAttribute('class')).includes('profile-edit'));}
    await rpc(vet,'save_specialist_step1',{payload:{professional_role_code:null}});await page.reload();
    await page.getByText('Profesija: Nepasirinkta',{exact:true}).filter({visible:true}).waitFor();eq(await page.locator('.profile-missing-profession').innerText(),'Nepasirinkta');
    await page.getByRole('button',{name:'Tęsti pildymą',exact:true}).click();await page.getByLabel('Vardas',{exact:true}).waitFor();
    await rpc(vet,'save_specialist_step1',{payload:{professional_role_code:'veterinarian'}});await page.reload();
  });
  await group('STEP1 partial clear/save/reload, exit dialog, profession confirmation and preservation',async()=>{
    await edit(page,'Pagrindiniai duomenys'); await page.getByLabel('Vardas',{exact:true}).fill(''); await save(page); eq((await state(vet)).total,0);
    await page.reload();await edit(page,'Pagrindiniai duomenys');eq(await page.getByLabel('Vardas',{exact:true}).inputValue(),'');
    await page.getByLabel('Vardas',{exact:true}).fill('Testo');await save(page);eq((await state(vet)).total,20);
    await page.getByLabel('Pavardė',{exact:true}).fill('Neišsaugota');await step(page,2);await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Tęsti redagavimą'}).click();eq(await page.getByLabel('Pavardė',{exact:true}).inputValue(),'Neišsaugota');
    await step(page,2);await page.getByRole('button',{name:'Išeiti neišsaugojus',exact:true}).click();await step(page,1);eq(await page.getByLabel('Pavardė',{exact:true}).inputValue(),'Specialistas');
    await page.getByLabel('Profesija',{exact:true}).selectOption('other_veterinary_specialty');await page.getByLabel('Specialybės pavadinimas').fill('Kita specialybė');await page.getByRole('button',{name:'Išsaugoti',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Grįžti',exact:true}).click();eq((await vet.client.from('specialist_profiles').select('professional_role_code').single()).data.professional_role_code,'veterinarian');
    await page.getByRole('button',{name:'Išsaugoti',exact:true}).click();await page.getByRole('button',{name:'Išsaugoti pakeitimą'}).click();await page.locator('.profile-notice.success').waitFor();await returnAndReopen(page,1);
    eq((await vet.client.from('specialist_profiles').select('professional_role_code').single()).data.professional_role_code,'other_veterinary_specialty');
    await page.getByLabel('Profesija',{exact:true}).selectOption('veterinarian');await page.getByRole('button',{name:'Išsaugoti',exact:true}).click();await page.getByRole('button',{name:'Išsaugoti pakeitimą'}).click();await page.locator('.profile-notice.success').waitFor();await returnAndReopen(page,1);
  });
  await group('Photo HTTP owner upload/render/replace/reload/delete, invalid file and retry',async()=>{
    const input=await sharp({create:{width:420,height:300,channels:3,background:'#e6f0fb'}}).jpeg().toBuffer();
    await page.locator('input[type=file]').setInputFiles({name:'profile.jpg',mimeType:'image/jpeg',buffer:input});await page.getByRole('img',{name:'Profilio nuotrauka'}).waitFor();await page.waitForFunction(()=>{const i=document.querySelector('img[alt="Profilio nuotrauka"]');return i?.complete&&i.naturalWidth>0;});eq(await page.getByRole('img',{name:'Profilio nuotrauka'}).evaluate(i=>i.complete&&i.naturalWidth>0),true);
    const response=await page.request.get(origin+'/api/profilis/nuotrauka');eq(response.status(),200);ok((await response.json()).hasPhoto);eq((await state(vet)).total,20);
    const before=(await response.json()).version;const replacement=await sharp({create:{width:260,height:400,channels:3,background:'#1e4a8c'}}).png().toBuffer();
    await page.locator('input[type=file]').setInputFiles({name:'replace.png',mimeType:'image/png',buffer:replacement});await page.getByRole('button',{name:'Pakeisti nuotrauką',exact:true}).waitFor();
    const metadata=await page.request.get(origin+'/api/profilis/nuotrauka');ok((await metadata.json()).version!==before);
    await page.reload();await edit(page,'Pagrindiniai duomenys');await page.getByRole('img',{name:'Profilio nuotrauka'}).waitFor();
    await page.locator('input[type=file]').setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});ok((await page.locator('.profile-notice.error').innerText()).includes('JPG, PNG arba WebP'));
    await page.getByRole('button',{name:'Pašalinti nuotrauką'}).click();await page.getByRole('button',{name:'Įkelti nuotrauką',exact:true}).waitFor();eq((await (await page.request.get(origin+'/api/profilis/nuotrauka')).json()).hasPhoto,false);
    await page.reload();await edit(page,'Pagrindiniai duomenys');await page.getByRole('button',{name:'Įkelti nuotrauką',exact:true}).waitFor();eq(await page.getByRole('img',{name:'Profilio nuotrauka'}).count(),0);
    await page.route('**/api/profilis/nuotrauka',r=>r.request().method()==='PUT'?r.fulfill({status:503,contentType:'application/json',body:'{}'}):r.continue());
    await page.getByLabel('Vardas',{exact:true}).fill('Išliks');await page.locator('input[type=file]').setInputFiles({name:'profile.jpg',mimeType:'image/jpeg',buffer:input});await page.locator('.profile-notice.error').waitFor();eq(await page.getByLabel('Vardas',{exact:true}).inputValue(),'Išliks');
    await page.unroute('**/api/profilis/nuotrauka');await page.getByRole('button',{name:'Bandyti dar kartą',exact:true}).click();await page.getByRole('img',{name:'Profilio nuotrauka'}).waitFor();eq(await page.getByLabel('Vardas',{exact:true}).inputValue(),'Išliks');
    await page.getByLabel('Vardas',{exact:true}).fill('Testo');
  });
  await group('STEP2 partial/clear/reload, education Other/LSMU, full preferences/languages/visibility and about validation',async()=>{
    await rpc(vet,'save_specialist_step2',{payload:{work_model_code:'hybrid',schedules:['regular']}});
    await step(page,2);eq(await page.getByLabel('Darbo modelis',{exact:true}).count(),0);eq(await page.getByText('Pageidaujamas darbo grafikas',{exact:true}).count(),0);
    for(const title of ['Darbas savaitgaliais','Naktinis darbas','Budėjimai'])eq(await page.getByLabel(title,{exact:true}).count(),1);
    eq((await page.getByLabel('Kada galėtumėte pradėti?').locator('option').allTextContents()).includes('Po įspėjimo termino (20 kalendorinių dienų)'),true);
    await page.getByLabel('Kada galėtumėte pradėti?').selectOption('notice_period');await save(page);
    eq((await vet.client.from('specialist_profiles').select('start_option_code').single()).data.start_option_code,'notice_period');
    await page.reload();await edit(page,'Profesinis profilis');eq(await page.getByLabel('Kada galėtumėte pradėti?').inputValue(),'notice_period');
    await page.screenshot({path:path.join(out,'start-option-selected-desktop.png'),fullPage:true});
    await overview(page);eq(await page.getByText('Po įspėjimo termino (20 kalendorinių dienų)',{exact:true}).count(),1);
    await page.screenshot({path:path.join(out,'start-option-overview-desktop.png'),fullPage:true});
    await step(page,2);await page.getByLabel('Kada galėtumėte pradėti?').selectOption('');await save(page);
    await page.getByLabel('Apie mane',{exact:true}).fill('Dalinis profilis');await save(page);eq((await state(vet)).total,20);
    eq((await vet.client.from('specialist_profiles').select('work_model_code').single()).data.work_model_code,'hybrid');
    eq((await vet.client.from('specialist_schedules').select('schedule_code')).data,[{schedule_code:'regular'}]);
    await page.reload();await edit(page,'Profesinis profilis');eq(await page.getByLabel('Apie mane',{exact:true}).inputValue(),'Dalinis profilis');
    await page.getByLabel('Apie mane',{exact:true}).fill('a'.repeat(501));await page.getByRole('button',{name:'Išsaugoti',exact:true}).first().click();await page.getByText('Aprašymas negali viršyti 500 simbolių.',{exact:true}).waitFor();eq(await page.getByLabel('Apie mane',{exact:true}).inputValue(),'a'.repeat(501));
    await page.getByLabel('Apie mane',{exact:true}).fill('');await page.getByLabel('Mokymo įstaiga',{exact:true}).selectOption('other');await page.getByLabel('Mokymo įstaigos pavadinimas').fill('Testų įstaiga');await page.getByLabel('Šalis',{exact:true}).fill('Lietuva');await page.getByLabel('Studijų programa / kvalifikacija').fill('Veterinarinė medicina');await save(page);
    await page.getByLabel('Mokymo įstaiga',{exact:true}).selectOption('lsmu');await page.getByLabel(/^Baigimo metai/).fill('2020');
    await page.getByLabel('Gyvenamoji vieta',{exact:true}).selectOption('lt_kauno_m');await page.getByLabel('Darbo patirtis',{exact:true}).selectOption('3_5_years');await page.getByLabel('Smulkieji gyvūnai',{exact:true}).check();await page.getByLabel('Klinikinė praktika',{exact:true}).check();
    await page.getByLabel('Darbo paieškos statusas',{exact:true}).selectOption('actively_looking');await page.getByLabel('Kada galėtumėte pradėti?').selectOption('one_month');
    await page.locator('fieldset.profile-multi').filter({has:page.locator('legend').getByText('Pageidaujamos darbo vietos',{exact:true})}).locator('summary').click();await page.getByLabel('Visa Lietuva',{exact:true}).check();
    await page.locator('fieldset.profile-multi').filter({has:page.locator('legend').getByText('Pageidaujamas darbo krūvis',{exact:true})}).locator('summary').click();await page.getByLabel('Pilnas etatas',{exact:true}).check();
    await page.getByLabel('Pridėti kalbą',{exact:true}).selectOption('lt');await page.getByLabel('Mokėjimo lygis',{exact:true}).selectOption('native');await page.getByLabel('Matomas tik kai kandidatuoju',{exact:true}).check();await save(page);eq((await state(vet)).readyToApply,false);
    await page.getByRole('button',{name:'Pateikti licenciją',exact:true}).click();await page.getByLabel('Licencijos numeris',{exact:true}).fill('LOCAL-'+crypto.randomBytes(12).toString('hex'));await page.locator('.profile-license').getByRole('button',{name:'Išsaugoti',exact:true}).click();await page.getByText('Laukiama patvirtinimo',{exact:true}).waitFor();eq((await state(vet)).total,70);eq((await state(vet)).readyToApply,true);
    await overview(page);await page.getByRole('heading',{name:'Profilis paruoštas kandidatavimui',exact:true}).waitFor();ok((await page.locator('.profile-readiness').innerText()).includes('Profilis paruoštas kandidatavimui'));eq(await page.getByLabel('Licencijos numeris',{exact:true}).count(),0);await page.screenshot({path:path.join(out,'overview-70-desktop.png'),fullPage:true});
  });
  await group('License missing/pending/verified/rejected UI, unchanged readiness and owner/private photo boundaries',async()=>{
    const reviewer=await actor('veterinary_assistant');trustedLocalAdmin(reviewer.id);
    for(const [decision,text] of [['verified','Patvirtinta'],['rejected','Nepatvirtinta']]) {
      await rpc(reviewer,'review_license',{target_user_id:vet.id,expected_revision:1,decision});await page.reload();await page.getByText(text,{exact:true}).waitFor();eq((await state(vet)).total,70);await overflow(page);
    }
    const number=(await rpc(vet,'read_license',{target_user_id:vet.id})).license_number;
    eq((await page.locator('body').innerText()).includes(number),false);
    eq(await page.evaluate(n=>[location.href,JSON.stringify({...localStorage}),JSON.stringify({...sessionStorage})].some(s=>s.includes(n)),number),false);
    const denied=await other.client.rpc('read_license',{target_user_id:vet.id});ok(denied.error);
    eq((await page.request.get(origin+'/api/profilis/nuotrauka?userId='+other.id)).status(),403);
    const anonymous=await browser.newContext();eq((await anonymous.request.get(origin+'/api/profilis/nuotrauka?userId='+vet.id)).status(),401);await anonymous.close();
    const employer=await actor('employer','employer'),e=await login(employer);
    eq((await e.page.request.get(origin+'/api/profilis/nuotrauka?userId='+vet.id)).status(),403);
    eq((await e.page.request.get(origin+'/api/profilis/nuotrauka/vaizdas?userId='+vet.id)).status(),403);
    ok((await employer.client.rpc('read_license',{target_user_id:vet.id})).error);
    eq((await e.page.locator('body').innerText()).includes(number),false);eq(await e.page.locator('.desktop-navigation a[href="/skelbti"]').count(),1);await e.context.close();
  });
  await group('STEP3 vet, server 100%, mobile accordion preserves answers and responsive 390/768/1440',async()=>{
    await edit(page,'Kompetencijos ir tobulėjimas');const inputs=page.locator('.profile-competency-items select');eq(await inputs.count(),24);
    const autonomy=page.locator('.profile-radio input');if(await autonomy.count())await autonomy.first().check();
    const development=page.locator('fieldset.profile-multi');if(await development.count()){await development.locator('summary').click();await development.locator('input[type=checkbox]').first().check();}
    for(let i=0;i<5;i++)await inputs.nth(i).selectOption('independent');await save(page);eq((await state(vet)).total,76.25);await overview(page);
    await page.getByRole('button',{name:'Tęsti pildymą',exact:true}).click();await page.locator('.profile-content > h1').getByText('Kompetencijos ir tobulėjimas',{exact:true}).waitFor();
    for(let i=0;i<24;i++)await inputs.nth(i).selectOption('independent');await save(page);eq((await state(vet)).total,100);
    await overview(page);ok((await page.locator('.profile-readiness').innerText()).includes('Išsamus profilis'));eq(await page.getByRole('button',{name:'Tęsti pildymą',exact:true}).count(),0);await page.screenshot({path:path.join(out,'overview-100-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});eq(await page.locator('.profile-steps').isVisible(),false);await overflow(page);
    for(const n of [1,2,3]){await edit(page,['Pagrindiniai duomenys','Profesinis profilis','Kompetencijos ir tobulėjimas'][n-1]);eq(await page.getByLabel('Profilio dalis',{exact:true}).inputValue(),String(n));await page.locator('.mobile-navigation .profile-link').click();await page.locator('.profile-identity').waitFor();}
    await page.locator('.profile-license-status').waitFor();await page.screenshot({path:path.join(out,'overview-100-mobile.png'),fullPage:true});await edit(page,'Kompetencijos ir tobulėjimas');
    const accordion=page.getByRole('button',{name:/Procedūros.*Atsakyta/});await accordion.click();await accordion.click();eq(await page.getByLabel('IV kateterio įvedimas',{exact:true}).inputValue(),'independent');
    const rect=await page.getByLabel('IV kateterio įvedimas',{exact:true}).boundingBox();ok(rect.height>=44);ok(rect.width>290);await overflow(page);await page.screenshot({path:path.join(out,'step3-vet-mobile.png'),fullPage:true});
    await step(page,2);await overflow(page);await page.screenshot({path:path.join(out,'step2-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:900});await overflow(page);await page.screenshot({path:path.join(out,'step2-desktop.png'),fullPage:true});await page.setViewportSize({width:768,height:900});await overflow(page);eq(errors,[]);
  });
  await group('Save transport failure/network error, input preservation, retry and logout/protected profile',async()=>{
    await page.getByLabel('Smulkieji gyvūnai',{exact:true}).uncheck();await page.getByRole('button',{name:/Pašalinti kalbą:/}).click();await page.getByLabel('Paslėptas',{exact:true}).check();await save(page);eq((await state(vet)).readyToApply,false);await page.reload();await edit(page,'Profesinis profilis');eq(await page.getByLabel('Smulkieji gyvūnai',{exact:true}).isChecked(),false);eq(await page.getByLabel('Paslėptas',{exact:true}).isChecked(),true);eq(await page.getByLabel('Mokėjimo lygis',{exact:true}).count(),0);
    await page.getByLabel('Smulkieji gyvūnai',{exact:true}).check();await page.getByLabel('Pridėti kalbą',{exact:true}).selectOption('lt');await page.getByLabel('Mokėjimo lygis',{exact:true}).selectOption('native');await page.getByLabel('Matomas tik kai kandidatuoju',{exact:true}).check();await save(page);eq((await state(vet)).total,100);
    await page.getByLabel('Apie mane',{exact:true}).fill('Įrašyta prieš skaitymo klaidą');await page.route('**/profilis',r=>r.request().method()==='POST'&&r.request().postData()==='[]'?r.abort('failed'):r.continue());await page.getByRole('button',{name:'Išsaugoti',exact:true}).first().click();await page.getByText(/Pakeitimai išsaugoti\. Nepavyko atnaujinti profilio peržiūros/).waitFor();
    await page.getByLabel('Apie mane',{exact:true}).fill('Naujas pakeitimas po skaitymo klaidos');await page.unroute('**/profilis');await page.locator('form').getByRole('button',{name:'Bandyti dar kartą',exact:true}).click();await page.locator('form .profile-notice.error').waitFor({state:'hidden'});eq(await page.getByLabel('Apie mane',{exact:true}).inputValue(),'Naujas pakeitimas po skaitymo klaidos');eq(await page.getByRole('button',{name:'Išsaugoti',exact:true}).first().isEnabled(),true);await save(page);
    await page.getByLabel('Apie mane',{exact:true}).fill('Išsaugoti po klaidos');await page.route('**/profilis',r=>r.request().method()==='POST'&&r.request().postData()?.includes('about_me')?r.abort('failed'):r.continue());await page.getByRole('button',{name:'Išsaugoti',exact:true}).first().click();await page.locator('form .profile-notice.error').waitFor();eq(await page.getByLabel('Apie mane',{exact:true}).inputValue(),'Išsaugoti po klaidos');await page.waitForTimeout(2200);eq(await page.locator('.profile-identity').count(),0);
    await page.unroute('**/profilis');await page.locator('form').getByRole('button',{name:'Bandyti dar kartą',exact:true}).click();await page.locator('.profile-notice.success').waitFor();await returnAndReopen(page,2);eq((await vet.client.from('specialist_profiles').select('about_me').single()).data.about_me,'Išsaugoti po klaidos');
    await page.getByLabel('Apie mane',{exact:true}).fill('Išsaugoma patikra');await page.route('**/profilis',async r=>{if(r.request().method()==='POST'&&r.request().postData()?.includes('about_me'))await new Promise(t=>setTimeout(t,1500));await r.continue();});
    await page.getByRole('button',{name:'Išsaugoti',exact:true}).first().click();await page.getByRole('button',{name:'Išsaugoma…',exact:true}).waitFor();eq(await page.getByRole('button',{name:'Išsaugoma…',exact:true}).isDisabled(),true);await page.locator('.profile-notice.success').waitFor();await returnAndReopen(page,2);await page.unroute('**/profilis');
    await page.getByLabel('Darbo patirtis',{exact:true}).evaluate(select=>select.add(new Option('Nebegaliojanti testų reikšmė','forged')));await page.getByLabel('Darbo patirtis',{exact:true}).selectOption('forged');await page.getByRole('button',{name:'Išsaugoti',exact:true}).first().click();await page.locator('form .profile-notice.error').waitFor();ok((await page.locator('form .profile-notice.error').innerText()).includes('Nepavyko išsaugoti profilio.'));eq(await page.getByLabel('Darbo patirtis',{exact:true}).inputValue(),'forged');await page.getByLabel('Darbo patirtis',{exact:true}).selectOption('3_5_years');await page.locator('form').getByRole('button',{name:'Bandyti dar kartą',exact:true}).click();await page.locator('.profile-notice.success').waitFor();await returnAndReopen(page,2);
    await page.getByLabel('Apie mane',{exact:true}).fill('Išliks po sesijos klaidos');await vet.client.auth.signOut({scope:'global'});
    try { await page.getByRole('button',{name:'Išsaugoti',exact:true}).first().click({timeout:2000}); }
    catch(e) { if(new URL(page.url()).pathname!=='/prisijungti')throw e; } // Existing middleware can redirect before the click settles.
    await Promise.race([page.locator('form .profile-notice.error').waitFor(),page.waitForURL(url=>url.pathname==='/prisijungti')]);
    eq((await admin.from('specialist_profiles').select('about_me').eq('user_id',vet.id).single()).data.about_me,'Išsaugoma patikra');
    const renewed=await login(vet);
    if(new URL(page.url()).pathname==='/prisijungti'){
      // Existing production middleware redirects a revoked cookie session.
      // Do not weaken it or demand an inline error instead of this denial.
      eq(await page.getByRole('heading',{name:'Prisijungti',exact:true}).count(),1);
      await context.close();context=renewed.context;page=renewed.page;
      await vet.client.auth.signInWithPassword({email:vet.email,password:vet.password});
      await edit(page,'Profesinis profilis');eq(await page.getByLabel('Apie mane',{exact:true}).inputValue(),'Išsaugoma patikra');
    }else{
      ok((await page.locator('form .profile-notice.error').innerText()).includes('Nepavyko susisiekti su serveriu.'));eq(await page.getByLabel('Apie mane',{exact:true}).inputValue(),'Išliks po sesijos klaidos');
      await context.addCookies(await renewed.context.cookies());await renewed.context.close();await vet.client.auth.signInWithPassword({email:vet.email,password:vet.password});await page.locator('form').getByRole('button',{name:'Bandyti dar kartą',exact:true}).click();await page.locator('.profile-notice.success').waitFor();await returnAndReopen(page,2);eq((await vet.client.from('specialist_profiles').select('about_me').single()).data.about_me,'Išliks po sesijos klaidos');
    }
    await overview(page);await page.getByRole('button',{name:'Atsijungti',exact:true}).click();await page.waitForURL(origin+'/');await page.goto(origin+'/profilis');await page.waitForURL('**/prisijungti?next=*');await context.close();
  });
  await group('All other professions real matrices, student scale, custom 1/2/3+ server completeness',async()=>{
    for(const role of ['veterinary_assistant','veterinary_student','veterinary_pharmacy','animal_health_commerce','other_veterinary_specialty']) {
      const a=role==='other_veterinary_specialty'?other:await actor(role);const session=await login(a,390);const pg=session.page;await edit(pg,'Kompetencijos ir tobulėjimas');
      if(role==='other_veterinary_specialty') {
        for(let n=1;n<=3;n++){await pg.getByRole('button',{name:'Pridėti kompetenciją'}).click();await pg.getByLabel('Kompetencijos pavadinimas',{exact:true}).nth(n-1).fill('Testo kompetencija '+n);await pg.getByLabel('Kompetencijos lygis',{exact:true}).nth(n-1).selectOption('independent');await save(pg);eq((await state(a)).step3,n*10);}
        await pg.getByRole('button',{name:'Pašalinti',exact:true}).first().click();await save(pg);eq((await state(a)).step3,20);await overflow(pg);
      } else {
        const first=pg.locator('.profile-competency-items select').first();await first.selectOption(role==='veterinary_student'?'supervised_confident':'independent');
        const autonomy=pg.locator('.profile-radio input');if(await autonomy.count())await autonomy.first().check();
        const development=pg.locator('fieldset.profile-multi');if(await development.count()){await development.locator('summary').click();await development.locator('input[type=checkbox]').first().check();}
        await save(pg);ok((await state(a)).step3>0);if(role==='veterinary_student')ok((await first.locator('option').allTextContents()).includes('Turiu teorinių žinių'));await overflow(pg);
        await step(pg,2);
        if(role==='veterinary_student'){
          await pg.getByLabel('Mokymo įstaiga',{exact:true}).selectOption('lsmu');await pg.getByLabel('Studijų kursas',{exact:true}).selectOption('2');await save(pg);await pg.getByLabel('Mokymo įstaiga',{exact:true}).selectOption('other');await pg.getByLabel('Studijų kursas / metai',{exact:true}).fill('Antras kursas');
        }
        await pg.getByLabel('Mokymo įstaigos pavadinimas',{exact:true}).fill('Testų mokymo įstaiga');await pg.getByLabel('Šalis',{exact:true}).fill('Lietuva');await pg.getByLabel('Studijų programa / kvalifikacija',{exact:true}).fill('Testų kvalifikacija');await save(pg);await overflow(pg);
        await fullStep2(a);eq((await state(a)).readyToApply,true);
      }
      eq(session.errors,[]);await session.context.close();
    }
  });
  await group('STEP1 incomplete + STEP3 and STEP2 incomplete readiness server gates',async()=>{
    await rpc(other,'save_specialist_step1',{payload:{first_name:null}});eq((await state(other)).total,20);eq((await state(other)).readyToApply,false);
    await rpc(other,'save_specialist_step1',{payload:{first_name:'Testo'}});eq((await state(other)).total,40);await fullStep2(other);eq((await state(other)).total,90);eq((await state(other)).readyToApply,true);
  });
  console.log(`PASS ${checks} browser/integration assertions`);fs.writeFileSync(path.join(out,'profile-ui.json'),JSON.stringify({status:'PASS',checks,groups,completedAt:new Date().toISOString()},null,2));
}
main().catch(async e=>{console.error(e);for(const context of browser?.contexts()??[])for(const page of context.pages()){console.log('Failure route:',new URL(page.url()).pathname);console.log('Failure headings:',await page.locator('h1').allTextContents());console.log('Failure alerts:',await page.locator('[role=alert]').allTextContents());await page.screenshot({path:path.join(out,'profile-failure.png'),fullPage:true});}process.exitCode=1;}).finally(()=>browser?.close());
