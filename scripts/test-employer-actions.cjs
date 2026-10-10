const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
const root = path.resolve(__dirname,'..'), load = Module._load;
let active = true, employer = true, error = null, calls = [], memberships = [], transferData = [], readError = null;
const id = '11111111-1111-4111-8111-111111111111';
const context = { organization:{id,slug:'local-test',name:'Local test'},rowVersion:3,typeRevision:1,legalRevision:1,ownershipRevision:1,profileState:'draft',completeness:{step1:0,step2:0,requiredComplete:false,quality:0,total:0,typeBlockComplete:false,typeQualityPoints:0,descriptionPoints:0,logoPoints:0,coverPoints:0,benefitPoints:0},capabilities:{canReadPrivate:true,canEditProfile:true,canManageMedia:true,canSubmitVerification:true,canRequestTransfer:false,canArchive:false},legal:{legalName:null,legalForm:null,legalCode:null},representative:{firstName:null,lastName:null,capacity:null,privatePhone:null,revision:1},verification:{state:'unverified',identityApproved:false,representationApproved:false} };
let result = context;
const query = { select(){return this;},eq(){return this;},is(){return this;},async limit(){return {data:memberships,error:readError};} };
const client = {from:()=>query,rpc:async(name,args)=>{calls.push([name,args]);if(name==='list_my_pending_transfers')return{data:transferData,error:readError};return{data:result,error};}};
require.extensions['.ts'] = (module,file) => module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,file);
Module._load = function(name,parent,main) {
  if(name==='server-only')return{};
  if(name==='next/cache')return{revalidatePath:()=>{}};
  if(name==='@/lib/auth/session')return{getActiveUser:async()=>active?{id,hasEmployerProfile:employer}:null};
  if(name==='@/lib/supabase/server')return{createClient:async()=>client};
  if(name.startsWith('@/'))return load.call(this,path.join(root,name.slice(2)),parent,main);
  return load.call(this,name,parent,main);
};
const actions = require('../app/profilis/darbdavys/actions.ts'), reads = require('../lib/organizations/owner-read.ts'), frontend = require('../lib/organizations/frontend.ts');
let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
(async()=>{
  for(const [operation,oid,version,payload] of [['admin_resolve_case',id,3,{}],['patch_org_public','bad-id',3,{}],['patch_org_public',id,-1,{}],['patch_org_public',id,3,{text:'x'.repeat(131073)}]]) {
    calls=[];eq((await actions.mutateEmployer(operation,oid,version,payload)).ok,false);eq(calls.length,0);
  }
  active=false;calls=[];eq((await actions.mutateEmployer('patch_org_public',id,3,{name:'X'})).code,'permission');eq(calls.length,0);active=true;
  employer=false;calls=[];eq((await actions.createEmployerOrganization()).ok,false);eq(calls.length,0);employer=true;
  eq((await actions.createEmployerOrganization()).data,context);
  for(const code of ['40001','42501','22023','23514','23505','XX000']) {
    error={code,message:'PRIVATE ADMIN REASON / SECRET'};
    const response=await actions.mutateEmployer('patch_org_public',id,3,{name:'X'});
    eq(response.ok,false);eq(JSON.stringify(response).includes('SECRET'),false);
    if(code==='40001')eq(response.code,'conflict');
  }
  error=null;calls=[];const saved=await actions.mutateEmployer('save_org_benefits',id,3,{standard:['mentorship'],custom:[]});eq(saved.data.context,context);eq(calls[0][1].expected_row_version,3);eq(calls[0][1].payload.standard,['mentorship']);
  result={status:'expired'};eq((await actions.mutateEmployer('accept_org_transfer',id,3,{transfer_id:id})).data.status,'expired');
  result={status:'declined'};eq((await actions.mutateEmployer('decline_org_transfer',id,3,{transfer_id:id})).data.status,'declined');
  result={total:70};eq((await actions.mutateEmployer('patch_org_public',id,3,{name:'X'})).ok,false);result=context;
  eq((await reads.readEmployerOwner()).context,null);
  memberships=[{organization_id:id}];eq((await reads.readEmployerOwner()).context,context);
  memberships=[{organization_id:id},{organization_id:id}];await assert.rejects(()=>reads.readEmployerOwner());checks++;
  memberships=[];readError={message:'PRIVATE'};eq((await actions.reloadEmployerOwner()).ok,false);readError=null;
  transferData=[{transferId:id,organizationId:id,rowVersion:3,direction:'incoming',expiresAt:new Date().toISOString()}];eq((await reads.readEmployerOwner()).transfers.length,1);
  transferData=[{transferId:id,organizationId:id,rowVersion:3,direction:'admin',expiresAt:'invalid'}];await assert.rejects(()=>reads.readEmployerOwner());checks++;
  eq(frontend.employerDraft({...context,organization:{...context.organization,benefits:['Mentorystė']}}).benefits,['mentorship']);
  eq(frontend.employeeSizes[0],{code:'size_1',label_lt:'1–5'});
  eq(frontend.verificationLabels.needs_info,'Patikrinimui reikia papildomos informacijos.');
  eq(frontend.safePublicUrl('javascript:alert(1)'),null);eq(frontend.safePublicUrl('https://example.invalid'),'https://example.invalid/');
  eq(frontend.hasDuplicates([' Kaunas ','kaunas']),true);
  eq(frontend.changedFields({capacity:'Same',private_phone:'New'},{capacity:'Same',private_phone:'Old'}),{private_phone:'New'});
  console.log('Employer frontend action/admission/security PASS: '+checks+' assertions');
})().catch(e=>{console.error(e);process.exitCode=1;});
