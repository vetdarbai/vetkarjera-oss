// Shared behavioural cases run against PGlite and real PostgREST.
module.exports=async function runCases(h){
 const {account,rpc,denied,q,eq}=h;
 const owner=await account('specialist'),foreign=await account('employer'),admin=await account('specialist');
 await q("insert into private.account_admins(user_id,source) values($1,'local QA')",[admin.id]);
 const s1={first_name:'Test',last_name:'Person',professional_role_code:'other_veterinary_specialty',specialty_free_text:'Custom'};
 const s2={home_location_code:'lt_vilniaus_m',experience_band_code:'no_experience',job_search_status_code:'actively_looking',start_option_code:'immediately',profile_visibility:'application_only',animal_groups:['small_animals'],activity_areas:['clinical'],work_locations:['lt_vilniaus_m'],workloads:['full_time'],languages:[{language_code:'lt',proficiency_code:'native'}]};
 const save1=p=>rpc(owner,'save_specialist_step1',{payload:p}), save2=p=>rpc(owner,'save_specialist_step2',{payload:p});
 const state=()=>rpc(owner,'profile_completeness');
 const total=async expected=>{const v=await state();eq(v.total,expected);eq(v.readyToApply,expected>=70);eq(v.readinessState,expected===100?'complete':expected>=70?'ready':'not_ready');eq(v.contractVersion,2);return v;};
 await total(0);
 await save1({first_name:'Only'});eq((await q('select first_name,last_name from public.specialist_profiles where user_id=$1',[owner.id])).rows[0],{first_name:'Only',last_name:null});
 await save2({about_me:'Draft',can_work_nights:false});await total(0);
 await save2({can_work_weekends:true});eq((await q('select about_me,can_work_nights from public.specialist_profiles where user_id=$1',[owner.id])).rows[0],{about_me:'Draft',can_work_nights:false});
 await save1(s1);await total(20);
 await rpc(owner,'save_specialist_step3',{payload:{custom_competencies:[{name:'One',level:'independent'},{name:'Two',level:'independent'},{name:'Three',level:'independent'}]}});
 await total(50);
 await save1({last_name:null});await total(30);
 await save2(s2);let v=await total(30);eq(v.step2Complete,true);eq(v.step2,0);eq(v.missingRequired.some(x=>x.field==='last_name'),true);
 await save1({last_name:'Restored'});await total(100);
 await rpc(owner,'save_specialist_step3',{payload:{custom_competencies:[]}});await total(70);
 for(let n=1;n<=4;n++){await rpc(owner,'save_specialist_step3',{payload:{custom_competencies:Array.from({length:n},(_,i)=>({name:'Skill'+i,level:'independent'}))}});await total(70+Math.min(n,3)*10);}
 await save1({specialty_free_text:null});v=await total(30);eq(v.missingRequired.some(x=>x.field==='specialty_free_text'),true);await save1({specialty_free_text:'Restored'});await total(100);
 for(const field of ['first_name','last_name']){await save1({[field]:null});v=await total(30);eq(v.missingRequired.some(x=>x.field===field&&x.step===1&&x.reason==='required'),true);await save1({[field]:s1[field]});}
 await save1({professional_role_code:null});v=await total(0);eq(v.missingRequired.some(x=>x.field==='professional_role_code'),true);await save1({professional_role_code:s1.professional_role_code});
 for(const field of ['home_location_code','experience_band_code','job_search_status_code','start_option_code']){await save2({[field]:null});v=await total(50);eq(v.missingRequired.some(x=>x.field===field),true);await save2({[field]:s2[field]});}
 for(const field of ['animal_groups','activity_areas','work_locations','workloads','languages']){await save2({[field]:[]});v=await total(50);eq(v.missingRequired.some(x=>x.field===field),true);await save2({[field]:s2[field]});}
 await save2({languages:[{language_code:'lt'}]});v=await total(50);eq(v.missingRequired.some(x=>x.field==='languages.proficiency_code'),true);
 await save2({languages:[{language_code:'other',proficiency_code:'native'}]});v=await total(50);eq(v.missingRequired.some(x=>x.field==='languages.language_name'),true);
 await save2({languages:s2.languages});
 await save2({home_location_code:'abroad'});v=await total(50);eq(v.missingRequired.some(x=>x.field==='home_country'),true);eq(v.missingRequired.some(x=>x.field==='home_city'),true);
 await save2({home_country:'Testland'});await total(50);await save2({home_city:'Testcity'});await total(100);
 await save2({start_option_code:'specific_date'});v=await total(50);eq(v.missingRequired.some(x=>x.field==='start_date'),true);await save2({start_date:'2027-01-01'});await total(100);
 await save2({languages:[{language_code:'lt'}]});v=await total(50);eq(v.missingRequired.some(x=>x.field==='languages.proficiency_code'),true);
 await save2({languages:[{language_code:'other',proficiency_code:'native'}]});v=await total(50);eq(v.missingRequired.some(x=>x.field==='languages.language_name'),true);
 await save2({languages:s2.languages});await total(100);
 await save2({about_me:null,schedules:[],interests:[]});await total(100);
 for(const payload of [{about_me:'x'.repeat(501)},{home_location_code:'nationwide'},{animal_groups:['forged']},{activity_areas:null},{languages:[{language_code:'lt',proficiency_code:'forged'}]},{languages:[{proficiency_code:'native'}]},{can_work_nights:'yes'},{user_id:foreign.id},{profile_visibility:null},{start_date:'not-a-date'}]){
  const before=(await q('select to_jsonb(p) row from public.specialist_profiles p where user_id=$1',[owner.id])).rows[0].row;
  await denied(owner,'save_specialist_step2',{payload});
  eq((await q('select to_jsonb(p) row from public.specialist_profiles p where user_id=$1',[owner.id])).rows[0].row,before);
 }
 await denied(owner,'save_specialist_step1',{payload:{first_name:12}});
 await denied(owner,'save_specialist_step1',{payload:{professional_role_code:'forged'}});
 await denied(foreign,'save_specialist_step1',{payload:{first_name:'Cannot create partial capability'}});
 await denied(foreign,'create_second_profile',{kind:'specialist',payload:{first_name:'Partial'}});
 await rpc(foreign,'create_second_profile',{kind:'specialist',payload:{first_name:'Strict',last_name:'Account',professional_role_code:'veterinarian'}});
 eq((await rpc(foreign,'account_capabilities')).hasSpecialistProfile,true);
 await rpc(owner,'create_second_profile',{kind:'employer',payload:{organization_name_input:'Clinic',organization_type_code:'veterinary_clinic'}});
 eq((await rpc(owner,'account_capabilities')).hasEmployerProfile,true);
 await save1({professional_role_code:'veterinarian'});await save2(s2);await total(20);
 await rpc(owner,'save_education',{payload:{institution_code:'other'}});v=await total(20);for(const f of ['education.institution_name','education.country','education.program_or_qualification','license_number'])eq(v.missingRequired.some(x=>x.field===f),true);
 await rpc(owner,'save_education',{payload:{institution_name:'School'}});await rpc(owner,'save_education',{payload:{country:'LT'}});await rpc(owner,'save_education',{payload:{program_or_qualification:'Vet'}});
 eq((await q('select institution_name,country from public.specialist_education where user_id=$1 and professional_role_code=$2',[owner.id,'veterinarian'])).rows[0],{institution_name:'School',country:'LT'});
 await save2({about_me:'No license draft works'});await total(20);
 await rpc(owner,'save_license',{number_input:'LOCAL-SYNTHETIC-ONLY'});await total(70);
 for(const decision of ['verified','rejected']){
  await rpc(admin,'review_license',{target_user_id:owner.id,expected_revision:1,decision});await total(70);
 }
 await rpc(owner,'save_license',{number_input:'LOCAL-SYNTHETIC-ONLY'});eq((await rpc(owner,'read_license',{target_user_id:owner.id})).revision,1);
 await rpc(owner,'save_license',{number_input:'LOCAL-SYNTHETIC-REV2'});eq((await rpc(owner,'read_license',{target_user_id:owner.id})).verification_status,'pending');await total(70);
 await denied(foreign,'read_license',{target_user_id:owner.id});await denied(owner,'review_license',{target_user_id:owner.id,expected_revision:2,decision:'verified'});
 eq(JSON.stringify(await state()).includes('LOCAL-SYNTHETIC'),false);
 await rpc(owner,'save_education',{payload:{institution_name:null}});await total(20);await rpc(owner,'save_education',{payload:{institution_code:'lsmu'}});await total(70);
 await save1({professional_role_code:'veterinary_student'});await rpc(owner,'save_education',{payload:{institution_code:'lsmu'}});v=await total(20);eq(v.missingRequired.some(x=>x.field==='education.current_course'),true);
 await rpc(owner,'save_education',{payload:{current_course:3}});await total(70);
 await rpc(owner,'save_education',{payload:{institution_code:'other',institution_name:'College',country:'LT',program_or_qualification:'Vet'}});v=await total(20);eq(v.missingRequired.some(x=>x.field==='education.current_course_or_study_year'),true);
 await rpc(owner,'save_education',{payload:{current_course_or_study_year:'Third'}});await total(70);
 await save1({professional_role_code:'veterinary_pharmacy'});await rpc(owner,'save_education',{payload:{institution_name:'Pharmacy school'}});v=await total(20);eq(v.missingRequired.some(x=>x.field==='education.program_or_qualification'),true);
 await rpc(owner,'save_education',{payload:{program_or_qualification:'Pharmacy'}});await total(70);
 await save1({professional_role_code:'veterinary_assistant'});await total(70);
 for(const table of ['specialist_profiles','specialist_education','specialist_languages'])await h.foreignRead(foreign,table,owner.id);
 const writer=(await q("select rolcanlogin,rolsuper,rolbypassrls,rolinherit,has_schema_privilege('vetkarjera_profile_writer','private','CREATE') cancreate,pg_has_role('authenticated','vetkarjera_profile_writer','MEMBER') api_member from pg_roles where rolname='vetkarjera_profile_writer'")).rows[0];
 eq(writer,{rolcanlogin:false,rolsuper:false,rolbypassrls:false,rolinherit:false,cancreate:false,api_member:false});
 return {owner,foreign,admin};
};
