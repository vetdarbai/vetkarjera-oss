const assert=require('node:assert/strict'),{createDatabase}=require('./profile-test-db.cjs');
const cases=require('./alignment-cases.cjs');let checks=0,n=0,db;
const id=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function root(){await db.exec('reset role');}
async function as(a){await root();await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(a.claims)]);await db.exec('set role authenticated');}
const h={
 eq(a,b){assert.deepEqual(a,b);checks++;},
 async q(sql,args=[]){await root();return db.query(sql,args);},
 async account(kind){await root();const k=++n,uid=id(k);await db.query("insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values($1,$2,$3,now())",[uid,'alignment'+k+'@example.invalid',JSON.stringify({account_role:kind})]);await db.query('insert into auth.sessions(id,user_id) values($1,$1)',[uid]);return {id:uid,claims:{sub:uid,session_id:uid,role:'authenticated'}};},
 async rpc(a,name,args={}){await as(a);return (await db.query('select public.'+name+'('+Object.keys(args).map((_,i)=>'$'+(i+1)).join(',')+') value',Object.values(args).map(x=>typeof x==='object'?JSON.stringify(x):x))).rows[0].value;},
 async denied(a,name,args){await assert.rejects(()=>h.rpc(a,name,args));checks++;},
 async foreignRead(a,table,uid){await as(a);h.eq((await db.query('select user_id from public.'+table+' where user_id=$1',[uid])).rows,[]);}
};
(async()=>{db=await createDatabase();await cases(h);console.log('PASS '+checks+' alignment DB assertions (PGlite)');await db.close();})().catch(async e=>{console.error(e.message,e.code||'');await db?.close();process.exitCode=1;});
