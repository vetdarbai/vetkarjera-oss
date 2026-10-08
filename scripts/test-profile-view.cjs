// Pure frontend projection/PATCH regression; no network or computed product readiness.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
const v=require('../lib/profiles/view-model.ts');let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const backend={step1:20,step2:0,step3:0,total:20,step1Complete:true,step2Complete:false,missingRequired:[{field:'animal_groups',step:2,reason:'required'}],readyToApply:false,readinessState:'not_ready',contractVersion:2};
eq(v.parseCompleteness(backend),backend);
for(const state of ['not_ready','ready','complete'])eq(v.parseCompleteness({...backend,readinessState:state}).readinessState,state);
for(const input of [null,[],{...backend,contractVersion:1},{...backend,missingRequired:null},{...backend,total:NaN},{...backend,readyToApply:'true'},{...backend,step2Complete:undefined},{...backend,readinessState:'invented'},{...backend,missingRequired:[{field:'animal_groups',step:3,reason:'required'}]}])eq(v.parseCompleteness(input),null);
eq(v.parseCompleteness({...backend,extra_private_field:'must not be projected'}),backend);
eq(v.parseCompleteness({...backend,total:42}).total,42); // Copy server values; never sum steps in the UI.
eq(v.missingLabel('animal_groups'),'gyvūnų grupės');eq(v.missingLabel('education.institution_name'),'mokymo įstaigos pavadinimas');eq(v.missingLabel('unknown_server_field'),'profilio duomenys');
eq(v.readinessLabel('not_ready'),'Profilis dar neparuoštas kandidatavimui');eq(v.readinessLabel('ready'),'Profilis paruoštas kandidatavimui');eq(v.readinessLabel('complete'),'Išsamus profilis');
eq(v.changedPatch({a:'preserved',b:1},{a:'preserved',b:2}),{b:2});eq(v.changedPatch({a:'preserved'},{a:null}),{a:null});eq(v.changedPatch({a:['x']},{a:[]}),{a:[]});eq(v.changedPatch({a:true},{a:false}),{a:false});eq(v.changedPatch({a:'preserved'},{}),{});
const data={profile:{first_name:null,last_name:'Test',professional_role_code:'veterinarian',profile_visibility:'application_only'},education:[{professional_role_code:'veterinarian',institution_code:'lsmu',graduation_year:2020},{professional_role_code:'veterinary_student',institution_code:'other'}],animals:[],areas:[],interests:[{professional_role_code:'veterinarian',interest_code:'internal_medicine'},{professional_role_code:'veterinary_student',interest_code:'foreign'}],locations:[],workloads:[],schedules:[],languages:[{language_code:'other',proficiency_code:null,language_name:null}],competencies:[{professional_role_code:'veterinarian',competency_code:'owner_context',level:'independent'},{professional_role_code:'veterinary_student',competency_code:'preserved_other_context',level:'theory_only'}],autonomy:[],development:[],custom:[{name:'Owner skill',level:'can_teach',slot:1}],customDevelopment:[{name:'Owner development'}]};
eq(v.step1Draft(data).first_name,null);eq(v.educationDraft(data).institution_code,'lsmu');eq(v.educationDraft(data).graduation_year,2020);
eq(v.step2Draft(data).interests,['internal_medicine']);eq(v.step2Draft(data).languages,[{language_code:'other',proficiency_code:null,language_name:null}]);
eq(v.step2Draft({...data,profile:{...data.profile,start_option_code:'notice_period'}}).start_option_code,'notice_period');
eq(v.step3Draft(data).competencies,[{competency_code:'owner_context',level:'independent'}]);eq(v.step3Draft(data).custom_competencies,[]);
const other={...data,profile:{...data.profile,professional_role_code:'other_veterinary_specialty'}};
eq(v.educationDraft(other).institution_code,null);eq(v.step3Draft(other).custom_competencies,[{name:'Owner skill',level:'can_teach'}]);eq(v.step3Draft(other).custom_development,['Owner development']);
for(const role of ['veterinarian','veterinary_student','veterinary_assistant','veterinary_pharmacy','animal_health_commerce','other_veterinary_specialty'])eq(v.step3Draft({...data,profile:{...data.profile,professional_role_code:role}}).competencies.every(c=>data.competencies.some(r=>r.professional_role_code===role&&r.competency_code===c.competency_code)),true);
eq(Object.hasOwn(v.step2Draft(data),'work_model_code'),false);eq(Object.hasOwn(v.step2Draft(data),'schedules'),false);
eq(v.nextIncompleteStep({...backend,missingRequired:[{field:'first_name',step:1,reason:'required'}]}),1);
eq(v.nextIncompleteStep(backend),2);
eq(v.nextIncompleteStep({...backend,total:76.25,step2:50,step3:6.25,step2Complete:true,missingRequired:[],readyToApply:true}),3);
eq(v.nextIncompleteStep({...backend,total:30,step1Complete:false,missingRequired:[]}),1);
eq(v.nextIncompleteStep({...backend,total:50,step2Complete:false,missingRequired:[]}),2);
console.log(`PASS ${checks} frontend projection/PATCH assertions`);
