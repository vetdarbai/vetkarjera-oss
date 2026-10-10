'use client';
import { useEffect, useState } from 'react';
import { TextField } from './ProfileFields';
import { EmployerRepresentativeFields } from './EmployerProfileFields';
import type { OrganizationContext } from '@/lib/organizations/contracts';
import type { OwnerOperation, PendingTransfer } from '@/lib/organizations/frontend';

export type EmployerExecute = (operation: OwnerOperation, payload: Record<string, unknown>, target?: { id: string; version: number }) => Promise<{ context: OrganizationContext | null; status?: string } | null>;
export default function EmployerOwnership({ context, transfers, busy, execute, reload, onDirty }: { context: OrganizationContext | null; transfers: PendingTransfer[]; busy: boolean; execute: EmployerExecute; reload: () => Promise<void>; onDirty: (dirty: boolean) => void }) {
  const [email, setEmail] = useState(''), [result, setResult] = useState('');
  const [rep, setRep] = useState({ firstName: '', lastName: '', capacity: '', privatePhone: '' });
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  useEffect(() => { onDirty(!!email || Object.values(rep).some(Boolean)); }, [email, rep, onDirty]);
  async function request() {
    if (!context || !email.trim()) return;
    const response = await execute('request_org_transfer', { target_email: email.trim() });
    if (!response) return;
    setEmail(''); setResult('Laukiama gavėjo patvirtinimo.'); await reload();
  }
  async function respond(transfer: PendingTransfer, action: 'accept_org_transfer' | 'decline_org_transfer' | 'cancel_org_transfer') {
    const response = await execute(action, { transfer_id: transfer.transferId, ...(action === 'accept_org_transfer' ? { first_name: rep.firstName.trim(), last_name: rep.lastName.trim(), capacity: rep.capacity.trim(), private_phone: rep.privatePhone.trim() } : {}) }, { id: transfer.organizationId, version: context?.organization.id === transfer.organizationId ? context.rowVersion : transfer.rowVersion });
    if (!response) return;
    setRep({ firstName: '', lastName: '', capacity: '', privatePhone: '' });
    setResult(response.status === 'expired' ? 'Perdavimo pasiūlymas nebegalioja.' : action === 'accept_org_transfer' ? 'Savininkystė priimta.' : action === 'decline_org_transfer' ? 'Perdavimo pasiūlymas atmestas.' : 'Perdavimo pasiūlymas atšauktas.');
    await reload();
  }
  return <section className="profile-section employer-ownership"><h2>Savininkystė</h2>{result && !(result === 'Laukiama gavėjo patvirtinimo.' && transfers.some(t => t.direction === 'outgoing' && Date.parse(t.expiresAt) > (now ?? 0))) && <p className="profile-notice" role="status">{result}</p>}{transfers.map(t => {
    const expired = now !== null && Date.parse(t.expiresAt) <= now;
    return <section className="employer-transfer" key={t.transferId}><h3>{t.name || 'Organizacijos perdavimas'}</h3><p>{expired ? 'Perdavimo pasiūlymas nebegalioja.' : t.direction === 'incoming' ? 'Gautas savininkystės perdavimo pasiūlymas.' : 'Laukiama gavėjo patvirtinimo.'}</p><p className="profile-helper">Galioja iki {new Date(t.expiresAt).toLocaleString('lt-LT', { timeZone: 'Europe/Vilnius' })}</p>{!expired && (t.direction === 'incoming' ? <form onSubmit={e => { e.preventDefault(); void respond(t, 'accept_org_transfer'); }}><fieldset className="profile-form-fields" disabled={busy}><p className="profile-helper">Atstovo duomenys privatūs ir kandidatams nerodomi.</p><EmployerRepresentativeFields value={rep} onChange={patch => setRep(old => ({ ...old, ...patch }))} /><div className="profile-inline-actions"><button className="profile-button" disabled={busy || Object.values(rep).some(v => !v.trim())}>Priimti profilio valdymą</button><button className="profile-button secondary" type="button" disabled={busy} onClick={() => void respond(t, 'decline_org_transfer')}>Atsisakyti perimti</button></div></fieldset></form> : <button className="profile-button secondary" type="button" disabled={busy} onClick={() => void respond(t, 'cancel_org_transfer')}>Atšaukti perdavimą</button>)}</section>;
  })}{context?.capabilities.canRequestTransfer && !transfers.some(t => t.direction === 'outgoing' && Date.parse(t.expiresAt) > (now ?? 0)) && <form onSubmit={e => { e.preventDefault(); void request(); }}><TextField title="Gavėjo el. paštas" type="email" maxLength={254} value={email} onChange={setEmail} /><p className="profile-helper">Gavėjas turi turėti registruotą paskyrą ir patvirtintą el. pašto adresą.</p><button className="profile-button secondary" disabled={busy || !email.trim()}>Perduoti savininkystę</button></form>}</section>;
}
