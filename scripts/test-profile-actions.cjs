const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const load = Module._load;
let stateError=null,stateThrows=false,stateValue={total:70},active=true, rpcError=null, signupSession=false, calls=[], identity={id:'test-user',email:'test@example.invalid',email_confirmed_at:'2026-01-01'};
let capabilities={id:'test-user',hasSpecialistProfile:true,hasEmployerProfile:true,isAdmin:false};
const client={rpc:async(name,args)=>{calls.push([name,args]);if(name==='profile_completeness'){if(stateThrows)throw Error('private details');return {data:stateValue,error:stateError};}return {data:name==='account_capabilities'?capabilities:{total:70},error:rpcError};},auth:{
 getUser:async()=>({data:{user:identity},error:null}),
 signUp:async args=>{calls.push(['signup',args]);return {data:{session:signupSession?{}:null},error:null};},
 signOut:async()=>{calls.push(['signout']);return {error:null};}
}};
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,file);
Module._load=function(name,parent,main) {
 if(name==='server-only') return {};
 if(name==='react') return {cache:fn=>fn};
 if(name==='next/cache') return {revalidatePath:()=>{}};
 if(name==='@/lib/supabase/server') return {createClient:async()=>client};
 if(name==='@/lib/auth/session') return {getActiveUser:async()=>active?{...capabilities,email:'test@example.invalid'}:null};
 if(name.startsWith('@/')) return load.call(this,path.resolve(name.slice(2)),parent,main);
 return load.call(this,name,parent,main);
};
const actions=require('../app/profilis/actions.ts');
const registration=require('../app/auth/profile-registration.ts');
const session=require('../lib/auth/session.ts');
const contracts=require('../lib/profiles/contracts.ts');
let checks=0;
const check=(a,b)=>{assert.deepEqual(a,b);checks++;};
async function run(){
 check(await session.getActiveUser(),{...capabilities,email:'test@example.invalid'});
 check(Object.hasOwn(await session.getActiveUser(),'role'),false);
 rpcError={message:'private diagnostic with license and token'}; check(await session.getActiveUser(),null);rpcError=null;
 const original=capabilities;capabilities={...original,hasEmployerProfile:'true'};check(await session.getActiveUser(),null);capabilities=original;
 identity={...identity,email_confirmed_at:null};check(await session.getActiveUser(),null);identity={...identity,email_confirmed_at:'2026-01-01'};
 check(contracts.registrationProfile('employer',{organization_name_input:'Klinika',organization_type_code:'veterinary_clinic'}).account_role,'employer');
 check(contracts.registrationProfile('specialist',{first_name:'A',last_name:'B',professional_role_code:'other_veterinary_specialty'}),null);
 check(contracts.registrationProfile('specialist',{first_name:'A',last_name:'B',professional_role_code:'veterinarian',isAdmin:true}),null);
 check(contracts.registrationProfile('admin',{}),null);
 check(contracts.validPayload({text:'x'.repeat(32001)}),false);
 active=false;calls=[];check((await actions.saveLicense('TEST')).ok,false);check(calls.length,0);active=true;
 rpcError={message:'DO NOT RETURN SECRET'};check((await actions.saveLicense('TEST')).ok,false);check(JSON.stringify(await actions.saveLicense('TEST')).includes('SECRET'),false);rpcError=null;
 calls=[];check((await actions.createSecondProfile('employer',{organization_name_input:'Klinika',organization_type_code:'veterinary_clinic'})).ok,true);check(calls[0][0],'create_second_profile');
 const signup={kind:'employer',profile:{organization_name_input:'Klinika',organization_type_code:'veterinary_clinic'},email:'test@example.invalid',password:'Synthetic-only-123',confirmPassword:'Synthetic-only-123',agreedToTerms:true};
 calls=[];check((await registration.registerProfileAccount(signup)).ok,true);check(calls[0][1].options.data.account_role,'employer');check(calls[0][1].options.data.profile_contract_version,2);
 check(Object.hasOwn(calls[0][1].options.data,'first_name'),false);check(Object.hasOwn(calls[0][1].options.data,'terms_accepted_at'),true);
 calls=[];check((await registration.registerProfileAccount({...signup,agreedToTerms:false})).ok,false);check(calls.length,0);
 signupSession=true;calls=[];check((await registration.registerProfileAccount(signup)).ok,false);check(calls[1][0],'signout');
 stateValue={step1:20,step2:50,step3:0,total:70,step1Complete:true,step2Complete:true,missingRequired:[],readyToApply:true,readinessState:'ready',contractVersion:2};
 calls=[];check(await actions.saveSpecialistStep1({first_name:'Partial'}),{ok:true,completeness:stateValue,completenessStatus:'available'});check(calls.map(c=>c[0]),['save_specialist_step1','profile_completeness']);check(calls[0][1],{payload:{first_name:'Partial'}});
 stateError={message:'private read failure'};check(await actions.saveSpecialistStep2({about_me:null}),{ok:true,completenessStatus:'unavailable'});stateError=null;
 stateThrows=true;check(await actions.saveEducation({institution_code:null}),{ok:true,completenessStatus:'unavailable'});stateThrows=false;
 rpcError={message:'private write failure'};calls=[];check((await actions.saveSpecialistStep1({first_name:null})).ok,false);check(calls.length,1);rpcError=null;
 check(contracts.registrationProfile('specialist',{first_name:'Partial'}),null);
 console.log(`PASS ${checks} profile action/session/registration assertions`);
}
run().catch(e=>{console.error(e.message);process.exitCode=1;});
