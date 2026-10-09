const assert=require('node:assert/strict');
module.exports=async function nativeConcurrency(instance,h,actors){
 const db=instance.db,a=await instance.connect(),b=await instance.connect();
 const actor=actors.employer;
 let ctx=await h.rpc(actor,'create_org_draft',[]),oid=ctx.organization.id;
 async function begin(c){await c.query('begin');await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(actor.claims)]);await c.query('set local role authenticated');}
 try{
  await begin(a);await begin(b);
  await a.query("select public.patch_org_public($1,$2,$3)",[oid,ctx.rowVersion,JSON.stringify({name:'Concurrent winner'})]);
  const pid=(await b.query('select pg_backend_pid() pid')).rows[0].pid;
  let resolved=false;const blocked=b.query('select public.patch_org_public($1,$2,$3)',[oid,ctx.rowVersion,JSON.stringify({name:'Stale loser'})])
    .then(()=>({code:null}),e=>({code:e.code})).finally(()=>{resolved=true;});
  let waiting=false;await h.root();
  for(let i=0;i<60;i++){if((await db.query('select wait_event_type from pg_stat_activity where pid=$1',[pid])).rows[0]?.wait_event_type==='Lock'){waiting=true;break;}await new Promise(r=>setTimeout(r,20));}
  h.eq(waiting,true);h.eq(resolved,false);await a.query('commit');h.eq((await blocked).code,'40001');await b.query('rollback');
  h.eq((await h.rpc(actor,'own_org_context',[oid])).organization.name,'Concurrent winner');
  const kinds=(await db.query("select rolname,rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls,rolcanlogin,rolinherit from pg_roles where rolname in('vetkarjera_organization_writer','vetkarjera_organization_reader') order by rolname")).rows;
  for(const role of kinds)for(const key of ['rolsuper','rolcreaterole','rolcreatedb','rolreplication','rolbypassrls','rolcanlogin','rolinherit'])h.eq(role[key],false);
  h.eq((await db.query("select count(*)::int n from pg_auth_members m join pg_roles r on r.oid=m.roleid join pg_roles u on u.oid=m.member where r.rolname in('vetkarjera_organization_writer','vetkarjera_organization_reader') and u.rolname in('anon','authenticated','service_role')")).rows[0].n,0);
  h.eq((await db.query("select count(*)::int n from pg_auth_members m join pg_roles r on r.oid=m.roleid join pg_roles u on u.oid=m.member where r.rolname in('vetkarjera_organization_writer','vetkarjera_organization_reader') and u.rolname='postgres' and(set_option or inherit_option)")).rows[0].n,0);
  for(const r of kinds)h.eq((await db.query("select has_schema_privilege($1,'private','CREATE') yes",[r.rolname])).rows[0].yes,false);
 }finally{await a.query('rollback').catch(()=>{});await b.query('rollback').catch(()=>{});await a.end();await b.end();}
};
