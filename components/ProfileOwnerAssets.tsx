'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { readOwnLicense, saveLicense } from '@/app/profilis/actions';
import { ProfileSection, TextField } from './ProfileFields';

type Photo = { hasPhoto: boolean; imageUrl: string | null; version: string | null };
export function ProfilePhoto({ editable = false }: { editable?: boolean }) {
  const [photo, setPhoto] = useState<Photo | null>(null), [pending, setPending] = useState(false), [error, setError] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const retry = useRef<() => Promise<void>>(async () => {
    setError('');
    try { const r = await fetch('/api/profilis/nuotrauka', { cache: 'no-store' }); if (!r.ok) throw Error(); setPhoto(await r.json()); }
    catch { setError('Nepavyko susisiekti su serveriu.'); }
  });
  useEffect(() => { let active = true; fetch('/api/profilis/nuotrauka', { cache: 'no-store' }).then(async r => { if (!r.ok) throw Error(); const v = await r.json(); if (active) setPhoto(v); }).catch(() => { if (active && editable) setError('Nepavyko susisiekti su serveriu.'); }); return () => { active = false; }; }, [editable]);
  async function mutate(method: 'PUT' | 'DELETE', image?: File) {
    if (pending) return;
    if (image && (!['image/jpeg','image/png','image/webp'].includes(image.type) || image.size > 3 * 1024 * 1024)) { setError('Pasirinkite JPG, PNG arba WebP nuotrauką iki 3 MB.'); return; }
    setPending(true); setError('');
    retry.current = () => mutate(method, image);
    try {
      const r = await fetch('/api/profilis/nuotrauka', { method, headers: image ? { 'Content-Type': image.type } : undefined, body: image });
      if (!r.ok) { setError([400,413,415].includes(r.status) ? 'Nepavyko įkelti nuotraukos. Pasirinkite tinkamą JPG, PNG arba WebP failą iki 3 MB.' : 'Nepavyko susisiekti su serveriu.'); return; }
      setPhoto(await r.json());
    } catch { setError('Nepavyko susisiekti su serveriu.'); }
    finally { setPending(false); if (file.current) file.current.value = ''; }
  }
  const image = photo?.hasPhoto && photo.imageUrl ? <Image key={photo.version} unoptimized src={photo.imageUrl} alt="Profilio nuotrauka" width={112} height={112} className="profile-photo-image" /> : null;
  if (!editable) return image;
  return <ProfileSection title="Profilio nuotrauka" optional><div className="profile-photo-edit">{image}<div className="profile-photo-actions"><input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Pasirinkti profilio nuotrauką" onChange={e => { if (e.target.files?.[0]) void mutate('PUT', e.target.files[0]); }} /><button className="profile-button secondary" type="button" disabled={pending} onClick={() => file.current?.click()}>{pending ? 'Išsaugoma…' : photo?.hasPhoto ? 'Pakeisti nuotrauką' : 'Įkelti nuotrauką'}</button>{photo?.hasPhoto && <button className="profile-button danger" type="button" disabled={pending} onClick={() => void mutate('DELETE')}>Pašalinti nuotrauką</button>}</div></div><p className="profile-helper">Nuotrauka neprivaloma ir profilio užpildymo procento nekeičia.</p>{error && <div role="alert" className="profile-notice error">{error}<button className="profile-button secondary" type="button" disabled={pending} onClick={() => void retry.current()}>Bandyti dar kartą</button></div>}</ProfileSection>;
}

const licenseLabels: Record<string, string> = { missing: 'Licencija nepateikta', pending: 'Laukiama patvirtinimo', verified: 'Patvirtinta', rejected: 'Nepatvirtinta' };
export function ProfileLicense({ onSaved, onDirty }: { onSaved: () => Promise<void>; onDirty: (value: boolean) => void }) {
  const [status, setStatus] = useState('loading'), [number, setNumber] = useState(''), [original, setOriginal] = useState(''), [editing, setEditing] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState('');
  useEffect(() => { let active = true; readOwnLicense().then(r => { if (!active) return; if (!r.ok) { setError('Nepavyko susisiekti su serveriu.'); return; } const d = r.data as { verification_status?: string } | null; setStatus(d?.verification_status ?? 'missing'); }).catch(() => { if (active) setError('Nepavyko susisiekti su serveriu.'); }); return () => { active = false; onDirty(false); }; }, [onDirty]);
  async function edit() {
    setPending(true); setError('');
    try { const r = await readOwnLicense(); if (!r.ok) throw Error(); const d = r.data as { license_number?: string } | null; setNumber(d?.license_number ?? ''); setOriginal(d?.license_number ?? ''); setEditing(true); }
    catch { setError('Nepavyko susisiekti su serveriu.'); } finally { setPending(false); }
  }
  async function save() {
    if (!number.trim()) { setError('Įveskite licencijos numerį.'); return; }
    setPending(true); setError('');
    try { const r = await saveLicense(number); if (!r.ok) { setError('Nepavyko išsaugoti profilio.'); return; } setStatus('pending'); setNumber(''); setOriginal(''); setEditing(false); onDirty(false); await onSaved(); }
    catch { setError('Nepavyko susisiekti su serveriu.'); } finally { setPending(false); }
  }
  return <div className="profile-license"><div><h3>Licencija <span className="profile-hint">Privačiai</span></h3><p className="profile-helper">Licencijos numeris naudojamas profesinei verifikacijai. Darbdaviams ir viešai jis nerodomas.</p>{status !== 'loading' && <span className={'profile-license-status ' + status}>{licenseLabels[status] ?? 'Laukiama patvirtinimo'}</span>}</div><div>{editing ? <><TextField title="Licencijos numeris" value={number} maxLength={200} onChange={v => { setNumber(v); onDirty(v !== original); setError(''); }} /><div className="profile-inline-actions"><button type="button" className="profile-button" disabled={pending || number === original} onClick={() => void save()}>{pending ? 'Išsaugoma…' : 'Išsaugoti'}</button><button type="button" className="profile-button secondary" disabled={pending} onClick={() => { setNumber(''); setOriginal(''); setEditing(false); onDirty(false); }}>Grįžti</button></div></> : <button className="profile-button secondary" type="button" disabled={pending} onClick={() => void edit()}>{status === 'missing' ? 'Pateikti licenciją' : 'Redaguoti'}</button>}{error && <div className="profile-notice error" role="alert">{error}<button type="button" className="profile-button secondary" onClick={() => void (editing ? save() : edit())}>Bandyti dar kartą</button></div>}{status === 'rejected' && <p className="profile-helper">Patikrinkite licencijos numerį.</p>}</div></div>;
}
