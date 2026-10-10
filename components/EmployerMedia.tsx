'use client';
import { useId, useRef, useState } from 'react';
import Image from 'next/image';
import { ProfileDialog } from './ProfileFields';
import type { MediaKind, OrganizationContext } from '@/lib/organizations/contracts';
import { parseOrganizationContext } from '@/lib/organizations/contracts';
import { reloadEmployerOwner } from '@/app/profilis/darbdavys/actions';

export default function EmployerMedia({ kind, context, busy, lock, adopt, report }: { kind: MediaKind; context: OrganizationContext; busy: boolean; lock: (busy: boolean) => void; adopt: (context: OrganizationContext) => void; report: (message: string, requireRefresh?: boolean) => void }) {
  const [remove, setRemove] = useState(false), [message, setMessage] = useState('');
  const input = useRef<HTMLInputElement>(null), id = useId();
  const media = context.organization.media?.[kind], title = kind === 'logo' ? 'Logotipas' : 'Viršelio nuotrauka';
  const disabled = busy || !context.capabilities.canManageMedia;
  async function update(file?: File) {
    if (disabled) return;
    if (file && (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024)) { setMessage('Pasirinkite JPEG, PNG arba WebP failą iki 3 MB.'); return; }
    lock(true); setMessage(''); setRemove(false);
    try {
      // The existing media endpoint reads its own server version. Do not let
      // that refresh silently rebase an older, unsaved text form.
      const before = await reloadEmployerOwner();
      if (!before.ok || !before.data.context || before.data.context.organization.id !== context.organization.id) {
        report('Nepavyko patikrinti vaizdo keitimo teisių. Atnaujinkite duomenis.', true); return;
      }
      if (before.data.context.rowVersion !== context.rowVersion) {
        report('Duomenys pasikeitė nuo tada, kai atidarėte formą. Atnaujinkite duomenis ir peržiūrėkite pakeitimus.', true); return;
      }
      const response = await fetch(`/api/organizacijos/${context.organization.id}/media/${kind}`, { method: file ? 'PUT' : 'DELETE', body: file, cache: 'no-store' });
      const data = await response.json();
      const fresh = parseOrganizationContext(data.context);
      if (!response.ok || !fresh) {
        if (data.code === 'media_cleanup_required') {
          const read = await reloadEmployerOwner();
          if (read.ok && read.data.context) adopt(read.data.context);
          report('Vaizdo operacija nebuvo visiškai užbaigta. Patikrinkite rodomą vaizdą ir bandykite dar kartą.', !read.ok || (read.ok && !!read.data.context && read.data.context.rowVersion !== context.rowVersion + 1));
        } else if (response.status === 409) report('Duomenys pasikeitė nuo tada, kai atidarėte formą. Atnaujinkite duomenis ir peržiūrėkite pakeitimus.', true);
        else if ([401,403].includes(response.status)) report('Vaizdo redaguoti negalite. Atnaujinkite duomenis ir peržiūrėkite suteiktas teises.', true);
        else if ([400,413,415].includes(response.status)) setMessage('Nepavyko įkelti vaizdo. Pasirinkite vieno kadro JPEG, PNG arba WebP failą iki 3 MB ir 16 megapikselių.');
        else report('Nepavyko užbaigti vaizdo operacijos. Atnaujinkite duomenis ir patikrinkite rodomą vaizdą.', true);
        return;
      }
      adopt(fresh);
      if (fresh.rowVersion !== context.rowVersion + 1) {
        report('Duomenys pasikeitė nuo tada, kai atidarėte formą. Atnaujinkite duomenis ir peržiūrėkite pakeitimus.', true); return;
      }
      setMessage(file ? 'Vaizdas išsaugotas.' : 'Vaizdas pašalintas.');
    } catch { report('Nepavyko susisiekti su serveriu. Atnaujinkite duomenis ir patikrinkite rodomą vaizdą.', true); }
    finally { lock(false); if (input.current) input.current.value = ''; }
  }
  return <section className="employer-media"><h3>{title}</h3><p className="profile-helper">Neprivaloma. Vienas JPEG, PNG arba WebP vaizdas iki 3 MB ir 16 megapikselių. Pakeitimas išsaugomas iš karto.</p>{media?.src && <Image unoptimized width={kind === 'logo' ? 112 : 1600} height={kind === 'logo' ? 112 : 600} className={`employer-${kind}`} src={media.src} alt={title} />}{context.capabilities.canManageMedia && <><input id={id} ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={disabled} onChange={e => { const file = e.target.files?.[0]; if (file) void update(file); }} /><div className="profile-inline-actions"><button type="button" className="profile-button secondary" disabled={disabled} onClick={() => input.current?.click()}>{media ? 'Pakeisti' : 'Įkelti'} {kind === 'logo' ? 'logotipą' : 'nuotrauką'}</button>{media && <button type="button" className="profile-button danger" disabled={disabled} onClick={() => setRemove(true)}>Pašalinti</button>}</div></>}{message && <p role="status" className="profile-helper">{message}</p>}{remove && <ProfileDialog title={kind === 'logo' ? 'Pašalinti logotipą?' : 'Pašalinti nuotrauką?'} onClose={() => setRemove(false)}><p>Pakeitimas bus išsaugotas iš karto.</p><div className="profile-dialog-actions"><button type="button" className="profile-button secondary" onClick={() => setRemove(false)}>Atšaukti</button><button type="button" className="profile-button danger" onClick={() => void update()}>Pašalinti</button></div></ProfileDialog>}</section>;
}
