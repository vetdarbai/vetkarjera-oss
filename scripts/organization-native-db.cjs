// Dedicated native PostgreSQL 17 QA. No env files, cloud URLs or credentials.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),net=require('node:net');
const {spawnSync}=require('node:child_process'),{Client}=require('pg');
const {bootstrap,storageBootstrap}=require('./profile-test-db.cjs');
const bin='C:/Program Files/PostgreSQL/17/bin';
const parent='D:/VetKarjera-Staging/qa-private';
async function nativeDatabase(){
 const root=path.join(parent,'stage5-native-'+Date.now()),data=path.join(root,'data'),pwfile=path.join(root,'init-password.private');
 fs.mkdirSync(root,{recursive:true});
 const sid=spawnSync('whoami',['/user','/fo','csv','/nh'],{encoding:'utf8',windowsHide:true}).stdout.match(/S-1-5-[0-9-]+/)?.[0];
 if(!sid)throw Error('Current SID unavailable');
 const acl=spawnSync('icacls',[root,'/inheritance:r','/grant:r','*'+sid+':(OI)(CI)F'],{encoding:'utf8',windowsHide:true});
 if(acl.status!==0)throw Error('Local QA ACL failed');
 const password=crypto.randomBytes(32).toString('base64url');
 fs.writeFileSync(pwfile,password+'\n',{mode:0o600});
 function command(name,args){const log=path.join(root,name+'.log'),fd=fs.openSync(log,'w',0o600);
  let r;try{r=spawnSync(path.join(bin,name+'.exe'),args,{encoding:'utf8',windowsHide:true,stdio:['ignore',fd,fd],timeout:120000});}finally{fs.closeSync(fd);}
  if(r.status!==0)throw Error('Native '+name+' failed; local log retained');return fs.readFileSync(log,'utf8');}
 const version=command('postgres',['--version']).trim();if(!/PostgreSQL\) 17\./.test(version))throw Error('PG17 required');
 command('initdb',['-D',data,'-U','postgres','-A','scram-sha-256','--pwfile='+pwfile,'--encoding=UTF8','--locale=C']);fs.unlinkSync(pwfile);
 const port=await new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 command('pg_ctl',['-D',data,'-l',path.join(root,'postgres.log'),'-w','-t','30','-o','-h 127.0.0.1 -p '+port,'start']);
 const settings={host:'127.0.0.1',port,user:'postgres',password,database:'postgres'};
 const db=new Client(settings);await db.connect();
 await db.query(bootstrap+storageBootstrap);
 await db.query('create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text not null,statements text[])');
 async function migrate({stage4Only=false}={}){
  for(const file of fs.readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort()){
   if(stage4Only&&file.includes('_stage5_'))continue;
   const version=file.split('_')[0];
   if((await db.query('select 1 from supabase_migrations.schema_migrations where version=$1',[version])).rowCount)continue;
   const sql=fs.readFileSync(path.join('supabase/migrations',file),'utf8').trim().replace(/^begin;\s*/i,'').replace(/commit;\s*$/i,'');
   await db.query('begin');try{await db.query(sql);await db.query('insert into supabase_migrations.schema_migrations(version,name) values($1,$2)',[version,file.slice(15,-4)]);await db.query('commit');}catch(e){await db.query('rollback');throw e;}
  }
 }
 return {db,migrate,root,version,async advisors(){
  const url='postgresql://postgres@127.0.0.1:'+port+'/postgres?sslmode=disable';
  const r=spawnSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','advisors','--db-url',url,'--type','all','--level','info','--fail-on','none','--output','json'],
   {encoding:'utf8',windowsHide:true,timeout:60000,env:{...process.env,PGPASSWORD:password,SUPABASE_DB_PASSWORD:password,SUPABASE_TELEMETRY_DISABLED:'1'}});
  fs.writeFileSync(path.join(root,'advisors.json'),(r.stdout||'').split(password).join('[REDACTED]'),{mode:0o600});
  fs.writeFileSync(path.join(root,'advisors.log'),(r.stderr||'').split(password).join('[REDACTED]'),{mode:0o600});
  return {exitCode:r.status,output:(r.stdout||'').split(password).join('[REDACTED]'),error:(r.stderr||'').split(password).join('[REDACTED]')};
 },async connect(){const c=new Client(settings);await c.connect();return c;},
 async close(){await db.end();command('pg_ctl',['-D',data,'-w','stop','-m','fast']);}};
}
module.exports={nativeDatabase};
