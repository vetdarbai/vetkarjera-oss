'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Navigation from './Navigation';
import Footer from './Footer';
import { ProfileDialog, SelectField, TextField } from './ProfileFields';
import EmployerProfileFields, { EmployerChoice, EmployerLegalFields } from './EmployerProfileFields';
import EmployerMedia from './EmployerMedia';
import EmployerOwnership, { type EmployerExecute } from './EmployerOwnership';
import { createEmployerOrganization, mutateEmployer, reloadEmployerOwner } from '@/app/profilis/darbdavys/actions';
import { createSecondProfile } from '@/app/profilis/actions';
import profileCatalogs from '@/lib/profiles/catalogs.json';
import { changedFields, draftStep, employerDraft, employerSteps, hasDuplicates, options, organizationCatalogs, stateLabels, verificationLabels, type Draft, type OwnerBundle, type OwnerOperation } from '@/lib/organizations/frontend';
import type { OrganizationContext } from '@/lib/organizations/contracts';

function EmployerError({ message, refreshRequired, busy, onRefresh }: { message: string; refreshRequired: boolean; busy: boolean; onRefresh: () => void }) {
  return message ? <div className="profile-notice error" role="alert"><p>{message}</p>{refreshRequired && <button type="button" className="profile-button secondary" disabled={busy} onClick={onRefresh}>Įkelti naujausius duomenis</button>}</div> : null;
}
export default function EmployerProfile({ initial }: { initial: OwnerBundle }) {
  const [bundle, setBundle] = useState(initial), [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(() => initial.context ? employerDraft(initial.context) : null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [refreshRequired, setRefreshRequired] = useState(false);
  const [nextType, setNextType] = useState<string | null>(null), [exit, setExit] = useState<(() => void) | null>(null), [ownershipDirty, setOwnershipDirty] = useState(false);
  const [legalRequest, setLegalRequest] = useState<Pick<Draft, 'legalName' | 'legalForm' | 'legalCode'> | null>(null), [verification, setVerification] = useState(false), [method, setMethod] = useState(''), [reference, setReference] = useState('');
  const [shell, setShell] = useState({ name: '', type: '', other: '' });
  const mutex = useRef(false), heading = useRef<HTMLHeadingElement>(null), allowExit = useRef(false);
  const context = bundle.context;
  const canSave = !!context && (context.capabilities.canEditProfile || (step === 2 && context.capabilities.canSubmitVerification && !['suspended','archived'].includes(context.profileState)));
  const dirty = !!context && !!draft && JSON.stringify(draftStep(draft, step)) !== JSON.stringify(draftStep(employerDraft(context), step));
  const anyDirty = dirty || ownershipDirty || !!shell.name || !!shell.type || !!shell.other || !!legalRequest || verification;
  const lock = useCallback((value: boolean) => { mutex.current = value; setBusy(value); }, []);
  const adopt = useCallback((fresh: OrganizationContext) => { setBundle(old => ({ ...old, context: fresh })); }, []);
  const report = useCallback((message: string, required = false) => { setError(message); setNotice(''); if (required) setRefreshRequired(true); }, []);
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => {
    function unload(e: BeforeUnloadEvent) { if ((anyDirty || mutex.current) && !allowExit.current) e.preventDefault(); }
    function links(e: MouseEvent) {
      const link = (e.target as Element).closest<HTMLAnchorElement>('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download') || link.href === window.location.href || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      if ((anyDirty || mutex.current) && !allowExit.current) { e.preventDefault(); if (!mutex.current) setExit(() => () => { allowExit.current = true; window.location.assign(link.href); }); }
    }
    window.addEventListener('beforeunload', unload); document.addEventListener('click', links, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', links, true); };
  }, [anyDirty]);
  function go(value: number) {
    if (mutex.current) return;
    const change = () => { if (context) setDraft(employerDraft(context)); setStep(value); setError(''); setNotice(''); setOwnershipDirty(false); setExit(null); };
    if (anyDirty) setExit(() => change); else change();
  }
  async function reload(discard = false) {
    if (mutex.current) return;
    lock(true);
    try {
      const result = await reloadEmployerOwner();
      if (!result.ok) { report('Nepavyko įkelti naujausių duomenų. Įvesti duomenys liko formoje.'); return; }
      setBundle(result.data);
      if (discard || !draft) setDraft(result.data.context ? employerDraft(result.data.context) : null);
      setRefreshRequired(false);
      if (discard) { setError(''); setNotice(''); }
    } catch { report('Nepavyko įkelti naujausių duomenų. Įvesti duomenys liko formoje.'); }
    finally { lock(false); }
  }
  function askRefresh() {
    if (mutex.current) return;
    const refresh = () => { setExit(null); setLegalRequest(null); setVerification(false); setMethod(''); setReference(''); void reload(true); };
    if (anyDirty) setExit(() => refresh); else refresh();
  }
  const execute: EmployerExecute = async (operation, payload, target) => {
    if (mutex.current || refreshRequired || (!context && !target)) return null;
    lock(true); setError(''); setNotice('');
    try {
      const response = await mutateEmployer(operation, target?.id ?? context!.organization.id, target?.version ?? context!.rowVersion, payload);
      if (!response.ok) { report(response.message, ['conflict','permission','unavailable'].includes(response.code)); return null; }
      if (response.data.context) { adopt(response.data.context); if (!context) setDraft(employerDraft(response.data.context)); }
      return response.data;
    } catch { report('Nepavyko išsaugoti. Įvesti duomenys liko formoje.', true); return null; }
    finally { lock(false); }
  };
  function change(patch: Partial<Draft>) { setDraft(old => old ? { ...old, ...patch } : null); setNotice(''); }
  async function create() {
    if (mutex.current) return;
    lock(true); setError('');
    try {
      if (!bundle.hasEmployerProfile) {
        const shellResult = await createSecondProfile('employer', { organization_name_input: shell.name.trim(), organization_type_code: shell.type, organization_type_other: shell.type === 'other' ? shell.other.trim() : null });
        if (!shellResult.ok) { report(shellResult.message); return; }
        setBundle(old => ({ ...old, hasEmployerProfile: true }));
      }
      const response = await createEmployerOrganization();
      if (!response.ok) { report(response.message); return; }
      adopt(response.data); setDraft(employerDraft(response.data)); setShell({ name: '', type: '', other: '' }); setStep(1);
    } catch { report('Nepavyko sukurti profilio. Įvesti duomenys liko formoje.'); }
    finally { lock(false); }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!context || !draft || mutex.current || refreshRequired || !canSave) return;
    const cleaned = { ...draft, cities: draft.cities.map(v => v.trim()).filter(Boolean), customBenefits: draft.customBenefits.map(v => v.trim()).filter(Boolean), groups: draft.groups.map(g => ({ ...g, custom: g.custom.map(v => v.trim()).filter(Boolean) })) };
    if (hasDuplicates(cleaned.cities) || hasDuplicates(cleaned.customBenefits) || cleaned.groups.some(g => hasDuplicates(g.custom))) { report('Pasikartojančių reikšmių negalima išsaugoti. Pašalinkite vienodus įrašus.'); return; }
    const original = employerDraft(context);
    const jobs: { operation: OwnerOperation; payload: Record<string, unknown> }[] = [];
    const patch = (operation: OwnerOperation, current: Record<string, unknown>, saved: Record<string, unknown>) => { const payload = changedFields(current, saved); if (Object.keys(payload).length) jobs.push({ operation, payload }); };
    if (step === 1 && context.capabilities.canEditProfile) {
      patch('patch_org_public', { name: cleaned.name, organization_type_code: cleaned.type || null, organization_type_other: cleaned.type === 'other' ? cleaned.typeOther : null }, { name: original.name, organization_type_code: original.type || null, organization_type_other: original.type === 'other' ? original.typeOther : null });
      if (JSON.stringify(cleaned.cities) !== JSON.stringify(original.cities)) jobs.push({ operation: 'save_org_locations', payload: { cities: cleaned.cities.map(city_name => ({ city_name, ...(context.organization.cities?.find(c => c.name === city_name)?.municipalityCode ? { municipality_code: context.organization.cities.find(c => c.name === city_name)!.municipalityCode } : {}) })) } });
    }
    if (step === 2) {
      if (context.capabilities.canEditProfile && !context.verification.identityApproved) patch('save_org_legal_draft', { legal_name: cleaned.legalName, legal_form_code: cleaned.legalForm || null, legal_code: cleaned.legalCode }, { legal_name: original.legalName, legal_form_code: original.legalForm || null, legal_code: original.legalCode });
      if (context.capabilities.canEditProfile || (context.capabilities.canSubmitVerification && !['suspended','archived'].includes(context.profileState))) patch('save_own_representative_details', { first_name: cleaned.firstName, last_name: cleaned.lastName, capacity: cleaned.capacity, private_phone: cleaned.privatePhone }, { first_name: original.firstName, last_name: original.lastName, capacity: original.capacity, private_phone: original.privatePhone });
    }
    if (step === 3 && context.capabilities.canEditProfile) {
      const toPublic = (d: Draft) => ({ description: d.description, website: d.website, public_phone: d.publicPhone, public_email: d.publicEmail, facebook_url: d.facebookUrl, instagram_url: d.instagramUrl, linkedin_url: d.linkedinUrl, employee_size_code: d.employeeSize || null });
      patch('patch_org_public', toPublic(cleaned), toPublic(original));
      if (JSON.stringify(cleaned.groups) !== JSON.stringify(original.groups)) jobs.push({ operation: 'save_org_type_block', payload: { type_revision: context.typeRevision, groups: cleaned.groups } });
      if (JSON.stringify([cleaned.benefits, cleaned.customBenefits]) !== JSON.stringify([original.benefits, original.customBenefits])) jobs.push({ operation: 'save_org_benefits', payload: { standard: cleaned.benefits, custom: cleaned.customBenefits } });
    }
    lock(true); setError(''); setNotice('');
    let fresh = context;
    try {
      for (const job of jobs) {
        const response = await mutateEmployer(job.operation, fresh.organization.id, fresh.rowVersion, job.payload);
        if (!response.ok) { report(response.message, ['conflict','permission','unavailable'].includes(response.code)); return; }
        if (!response.data.context) { report('Nepavyko įkelti išsaugotų duomenų. Atnaujinkite profilį.', true); return; }
        fresh = response.data.context; adopt(fresh);
      }
      setDraft(employerDraft(fresh));
      setNotice(context.profileState === 'active' && fresh.profileState === 'draft' ? 'Pakeitimai išsaugoti. Profilis nebėra viešas, nes trūksta privalomų duomenų.' : 'Pakeitimai išsaugoti.');
    } catch { report('Nepavyko išsaugoti. Įvesti duomenys liko formoje.', true); }
    finally { lock(false); }
  }
  async function submitLegal(e: FormEvent) {
    e.preventDefault(); if (!legalRequest) return;
    const response = await execute('request_org_legal_change', { legal_name: legalRequest.legalName.trim(), legal_form_code: legalRequest.legalForm, legal_code: legalRequest.legalCode.trim() || null });
    if (response) { setLegalRequest(null); setNotice('Pakeitimo prašymas pateiktas peržiūrai. Iki patvirtinimo galioja dabartiniai juridiniai duomenys.'); }
  }
  async function submitVerification(e: FormEvent) {
    e.preventDefault(); if (!context || !method || !reference.trim()) return;
    let current = context;
    // Requests carry owner-submitted references, never independent/admin evidence.
    for (const scope of (context.verification.identityApproved ? ['representation'] : ['identity','representation'])) {
      const response = await execute(scope === 'representation' ? 'request_representation_verification' : 'request_employer_verification', { scope, method, reference: reference.trim() }, { id: current.organization.id, version: current.rowVersion });
      if (!response?.context) return;
      current = response.context;
    }
    setVerification(false); setMethod(''); setReference(''); setNotice('Duomenys pateikti patikrinimui.');
  }
  return <div className="specialist-profile-page employer-profile-page"><Navigation /><main className={`profile-shell ${step ? 'editing' : 'overview'}`}>
    {context && step > 0 && <><nav className="profile-steps" aria-label="Darbdavio profilio dalys">{employerSteps.map((name, i) => <button type="button" key={name} aria-current={step === i + 1 ? 'step' : undefined} disabled={busy} onClick={() => go(i + 1)}><span className="employer-step-number">{i + 1}</span>{name}</button>)}</nav>{step > 0 && <button type="button" className="profile-button secondary profile-back" onClick={() => go(0)} disabled={busy}><span aria-hidden="true">←</span>Grįžti į profilį</button>}</>}
    <div className="profile-content">
      {step > 0 && <div className="profile-mobile-steps"><EmployerChoice title="Profilio dalis" value={String(step)} options={employerSteps.map((name, i) => ({ code: String(i + 1), label_lt: `${i + 1} iš 3 · ${name}` }))} onChange={v => v && go(Number(v))} disabled={busy} allowEmpty={false} /></div>}
      {step > 0 || !context ? <h1 ref={heading} tabIndex={-1}>{step ? employerSteps[step - 1] : 'Darbdavio profilis'}</h1> : <p className="employer-eyebrow">Darbdavio profilis</p>}
      <EmployerError message={error} refreshRequired={refreshRequired} busy={busy} onRefresh={askRefresh} />
      {notice && <p className="profile-notice success" role="status">{notice}</p>}
      {!context ? <><p className="profile-intro">Sukurkite savo organizacijos profilį.</p>{!bundle.hasEmployerProfile && <form onSubmit={e => { e.preventDefault(); void create(); }}><fieldset disabled={busy} className="profile-form-fields"><TextField title="Organizacijos pavadinimas" value={shell.name} onChange={v => setShell(old => ({ ...old, name: v }))} maxLength={200} /><SelectField title="Organizacijos tipas" value={shell.type} options={options(profileCatalogs.catalogs.organization_types)} onChange={v => setShell(old => ({ ...old, type: v }))} />{shell.type === 'other' && <TextField title="Kitas organizacijos tipas" value={shell.other} maxLength={200} onChange={v => setShell(old => ({ ...old, other: v }))} />}<button className="profile-button" disabled={busy || !shell.name.trim() || !shell.type || (shell.type === 'other' && !shell.other.trim())}>Sukurti darbdavio profilį</button></fieldset></form>}{bundle.hasEmployerProfile && <button className="profile-button" disabled={busy} onClick={() => void create()}>Pradėti pildyti profilį</button>}<EmployerOwnership context={null} transfers={bundle.transfers} busy={busy || refreshRequired} execute={execute} reload={() => reload()} onDirty={setOwnershipDirty} /></> : <>
        {!context.capabilities.canEditProfile && !['suspended','archived'].includes(context.profileState) && <p className="profile-notice">Profilį galite peržiūrėti. Redagavimas bus įjungtas, kai patvirtinsime jūsų teisę atstovauti organizacijai.</p>}

        {step === 0 ? <>
          <div className="employer-overview-identity"><div><h1 ref={heading} tabIndex={-1}>{context.organization.name || 'Organizacijos profilis'}</h1><p className="profile-intro">{context.profileState === 'active' ? 'Aktyvus · Viešas profilis' : stateLabels[context.profileState]}</p></div>{context.profileState === 'active' && <a className="profile-button employer-public-desktop" href={`/darbdaviai/${context.organization.slug}`}>Atidaryti viešą profilį</a>}</div>
          <div className="employer-overview-layout"><div>
            <section className="profile-readiness"><div className="profile-readiness-heading"><h2>{context.completeness.total === 100 ? 'Išsamus profilis' : 'Profilio užpildymas'}</h2><strong>{context.completeness.total} %</strong></div><progress max={100} value={context.completeness.total} aria-label="Profilio užpildymas" /><p>70 % pakanka aktyviam viešam profiliui.{context.completeness.total === 100 && ' Organizacijos pristatymą galite papildyti vėliau.'}</p>
              {context.profileState === 'active' ? <a className="profile-button employer-public-mobile" href={`/darbdaviai/${context.organization.slug}`}>Atidaryti viešą profilį</a> : context.profileState === 'draft' && <button className="profile-button" disabled={busy} onClick={() => go(!context.capabilities.canEditProfile ? 2 : context.completeness.step1 === 0 ? 1 : context.completeness.step2 === 0 ? 2 : 3)}>{context.capabilities.canEditProfile ? 'Tęsti pildymą' : 'Peržiūrėti duomenis'}</button>}
            </section>
            {employerSteps.map((name, i) => {
              const complete = i === 0 ? context.completeness.step1 === 20 : i === 1 ? context.completeness.step2 === 50 : context.completeness.quality === 30;
              return <section className="profile-section employer-overview-step" key={name}><span className="employer-step-number">{i + 1}</span><div><h2>{name}</h2><p className="profile-helper">{complete ? 'Užpildyta' : i === 2 ? 'Neprivaloma' : 'Pildoma'}</p><p className="profile-helper">{i === 0 ? context.organization.cities?.map(city => city.name).join(', ') || 'Duomenys nepateikti.' : i === 1 ? complete ? 'Privatūs duomenys pateikti' : 'Papildykite juridinius ir atstovo duomenis.' : complete ? '' : 'Galite papildyti vėliau'}</p></div><button type="button" className="profile-text-button employer-edit-action" disabled={busy} onClick={() => go(i + 1)}>{!context.capabilities.canEditProfile ? 'Peržiūrėti' : complete ? 'Redaguoti' : 'Papildyti'}<span aria-hidden="true">›</span></button></section>;
            })}
          </div><aside className="employer-overview-aside"><section className="profile-section"><h2>Duomenų patikrinimas</h2><p>{verificationLabels[context.verification.state]}</p><div className="profile-inline-actions"><button type="button" className="profile-button secondary" disabled={busy} onClick={() => go(2)}>Peržiūrėti duomenis</button>{context.capabilities.canSubmitVerification && context.verification.state !== 'verified' && context.verification.state !== 'pending' && <button type="button" className="profile-button secondary" disabled={busy || refreshRequired} onClick={() => setVerification(true)}>Pateikti patikrinimui</button>}</div></section><EmployerOwnership context={context} transfers={bundle.transfers} busy={busy || refreshRequired} execute={execute} reload={() => reload()} onDirty={setOwnershipDirty} /></aside></div>
        </> : draft && <form onSubmit={save}><EmployerProfileFields step={step} draft={draft} context={context} disabled={busy || refreshRequired} onChange={change} onTypeChange={v => { if (v !== draft.type) setNextType(v); }} onLegalChange={() => setLegalRequest({ legalName: draft.legalName, legalForm: draft.legalForm, legalCode: draft.legalCode })} media={<>{(['logo','cover'] as const).map(kind => <EmployerMedia key={kind} kind={kind} context={context} busy={busy || refreshRequired} lock={lock} adopt={adopt} report={report} />)}</>} /><div className="profile-save employer-save"><p role="status">{busy ? 'Išsaugoma…' : dirty ? 'Neišsaugoti pakeitimai' : error ? 'Patikrinkite klaidą' : 'Išsaugota'}</p><button className="profile-button" disabled={busy || refreshRequired || !dirty || !canSave}>Išsaugoti</button></div></form>}
      </>}
    </div>
  </main><Footer />
    {nextType !== null && <ProfileDialog title="Keisti organizacijos tipą?" onClose={() => setNextType(null)}><p>Pakeitus organizacijos tipą, pasirinkto tipo veiklos duomenis reikės užpildyti iš naujo. Ankstesni pasirinkimai automatiškai nebus atkurti net grįžus prie ankstesnio tipo.</p><div className="profile-dialog-actions"><button className="profile-button secondary" onClick={() => setNextType(null)}>Atšaukti</button><button className="profile-button" onClick={() => { change({ type: nextType, typeOther: '', groups: [] }); setNextType(null); }}>Keisti tipą</button></div></ProfileDialog>}
    {exit && <ProfileDialog title="Turite neišsaugotų pakeitimų." onClose={() => setExit(null)}><p>Išeiti neišsaugojus pakeitimų?</p><div className="profile-dialog-actions"><button className="profile-button secondary" onClick={() => setExit(null)}>Likti</button><button className="profile-button danger" onClick={() => { const action = exit; setExit(null); action(); }}>Išeiti neišsaugojus</button></div></ProfileDialog>}
    {legalRequest && <ProfileDialog title="Prašyti pakeisti juridinius duomenis" onClose={() => { if (!busy && window.confirm('Atšaukti juridinių duomenų pakeitimo prašymą?')) setLegalRequest(null); }}><EmployerError message={error} refreshRequired={refreshRequired} busy={busy} onRefresh={askRefresh} /><form onSubmit={submitLegal}><fieldset disabled={busy || refreshRequired} className="profile-form-fields"><EmployerLegalFields value={legalRequest} onChange={patch => setLegalRequest(old => old ? { ...old, ...patch } : null)} /><button className="profile-button" disabled={!legalRequest.legalName.trim() || !legalRequest.legalForm || (organizationCatalogs.legalForms.find(([code]) => code === legalRequest.legalForm)?.[2] === true && !legalRequest.legalCode.trim())}>Pateikti prašymą</button></fieldset></form></ProfileDialog>}
    {verification && <ProfileDialog title="Pateikti duomenis patikrinimui" onClose={() => { if (!busy) setVerification(false); }}><EmployerError message={error} refreshRequired={refreshRequired} busy={busy} onRefresh={askRefresh} /><form onSubmit={submitVerification}><fieldset disabled={busy || refreshRequired} className="profile-form-fields"><SelectField title="Patikrinimo būdas" value={method} options={options([['domain_email','Organizacijos domeno el. paštas'],['official_contact','Oficialus kontaktas'],['official_phone','Oficialus telefonas'],['documents_manual','Dokumentų patikrinimas']])} onChange={setMethod} /><TextField title="Patikrinimo nuoroda / kontaktas" value={reference} maxLength={2000} onChange={setReference} /><button className="profile-button" disabled={!method || !reference.trim()}>Pateikti patikrinimui</button></fieldset></form></ProfileDialog>}
  </div>;
}
