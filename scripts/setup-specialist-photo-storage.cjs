// Explicit local-only setup. Never loads .env or defaults to a hosted project.
const {spawnSync}=require('node:child_process');const {createClient}=require('@supabase/supabase-js');
async function main(){
 const fs=require('node:fs');if(fs.existsSync('supabase/.temp/project-ref')||!fs.readFileSync('supabase/config.toml','utf8').includes('project_id = '+String.fromCharCode(34)+'vetkarjera-stage4-3-isolated'+String.fromCharCode(34)))throw Error('Wrong or linked target refused');
 const r=spawnSync(process.execPath,['node_modules/supabase/dist/supabase.js','status','--output','json'],{encoding:'utf8'});
 if(r.status!==0)throw Error('Local stack is not ready');
 const s=JSON.parse(r.stdout.slice(r.stdout.indexOf('{'))),u=new URL(s.API_URL);
 if(!['127.0.0.1','localhost'].includes(u.hostname)||u.port!=='54321')throw Error('Non-local target refused');
 const c=createClient(s.API_URL,s.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const name='specialist-profile-photos',settings={public:false,fileSizeLimit:250*1024,allowedMimeTypes:['image/webp']};
 const existing=await c.storage.getBucket(name);
 if(existing.error && Number(existing.error.statusCode)!==404)throw Error('Bucket lookup failed');
 const result=existing.data?await c.storage.updateBucket(name,settings):await c.storage.createBucket(name,settings);
 if(result.error)throw Error('Bucket setup failed');
 console.log('PASS local private specialist photo bucket configured');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
