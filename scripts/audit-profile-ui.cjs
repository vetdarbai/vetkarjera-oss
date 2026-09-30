// Local, read-only source/client-bundle security audit. Never prints credentials.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
let checks=0;const check=value=>{assert.ok(value);checks++;};
const command='cd /opt/vetkarjera-stage43; test ! -f supabase/.temp/project-ref; node node_modules/supabase/dist/supabase.js status --output json';
const r=process.platform==='win32'?spawnSync('wsl.exe',['-d','VetKarjera-Stage43','-u','root','--','bash','-lc',command],{encoding:'utf8'}):spawnSync('bash',['-lc',command],{encoding:'utf8'});
check(r.status===0);const s=JSON.parse(r.stdout.slice(r.stdout.indexOf('{'))),u=new URL(s.API_URL);check(['localhost','127.0.0.1'].includes(u.hostname)&&u.port==='54321');check(typeof s.SERVICE_ROLE_KEY==='string'&&s.SERVICE_ROLE_KEY.length>20);
for(const name of ['ProfileFields','ProfileProfessional','ProfileCompetencies','ProfileOwnerAssets','SpecialistProfile']) {
  const source=fs.readFileSync(path.join('components',name+'.tsx'),'utf8');
  check(!/SUPABASE_STORAGE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|storage-admin|\.storage\.|localStorage|sessionStorage|console\.(log|error)/.test(source));
  check(!source.includes("from '@/lib/supabase/"));
}
const read=fs.readFileSync('lib/profiles/read.ts','utf8');check(read.startsWith("import 'server-only';"));check(!/license_number|specialist_licenses|private\./.test(read));check(read.includes(".eq('user_id', user.id)"));
let files=0;
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else{const bytes=fs.readFileSync(file);check(!bytes.includes(Buffer.from(s.SERVICE_ROLE_KEY)));files++;}}}
check(fs.existsSync('.next/static'));walk('.next/static');
console.log(`PASS ${checks} source/client-bundle security assertions (${files} built client assets; privileged key absent)`);
