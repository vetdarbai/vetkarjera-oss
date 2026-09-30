'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import type { Option } from '@/lib/profiles/view-model';

export function ProfileSection({ title, optional, children }: { title: string; optional?: boolean; children: ReactNode }) {
  return <section className="profile-section"><h2>{title}{optional && <span className="profile-hint">Neprivaloma</span>}</h2>{children}</section>;
}
export function TextField({ title, value, onChange, error, type = 'text', maxLength, optional }: { title: string; value: string | number | null | undefined; onChange: (v: string) => void; error?: string; type?: string; maxLength?: number; optional?: boolean }) {
  const id = useId();
  return <div className="profile-field"><label htmlFor={id}>{title}{optional && <span className="profile-hint">Neprivaloma</span>}</label><input id={id} type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} maxLength={maxLength} aria-invalid={!!error} aria-describedby={error ? id + '-error' : undefined} />{error && <p id={id + '-error'} className="profile-field-error" role="alert">{error}</p>}</div>;
}
export function SelectField({ title, value, options, onChange, empty = 'Nepasirinkta', disabled = false }: { title: string; value: string | null | undefined; options: Option[]; onChange: (v: string) => void; empty?: string; disabled?: boolean }) {
  const id = useId();
  return <div className="profile-field"><label htmlFor={id}>{title}</label><select id={id} value={value ?? ''} onChange={e => onChange(e.target.value)} disabled={disabled}><option value="">{empty}</option>{options.map(o => <option key={o.code} value={o.code}>{o.label_lt}</option>)}</select></div>;
}
export function MultiField({ title, value, options, onChange, compact = !['Gyvūnų grupės', 'Veiklos sritys'].includes(title) }: { title: string; value: string[]; options: Option[]; onChange: (v: string[]) => void; compact?: boolean }) {
  const controls = <div className="profile-checks">{options.map(o => <label key={o.code}><input type="checkbox" checked={value.includes(o.code)} onChange={e => onChange(e.target.checked ? [...value, o.code] : value.filter(v => v !== o.code))} /><span>{o.label_lt}</span></label>)}</div>;
  return <fieldset className="profile-multi"><legend>{title}</legend>{compact ? <details><summary>{value.length ? value.map(v => options.find(o => o.code === v)?.label_lt).filter(Boolean).join(', ') : 'Pasirinkite'}</summary>{controls}</details> : controls}</fieldset>;
}
export function ChoiceField({ title, value, options, onChange }: { title: string; value: string | null | undefined; options: Option[]; onChange: (v: string) => void }) {
  const name = useId();
  return <fieldset className="profile-radio"><legend>{title}</legend>{options.map(o => <label key={o.code}><input type="radio" name={name} checked={value === o.code} onChange={() => onChange(o.code)} /><span>{o.label_lt}</span></label>)}</fieldset>;
}
export function ProfileDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null), id = useId();
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog className="profile-dialog" ref={ref} aria-labelledby={id} onCancel={e => { e.preventDefault(); onClose(); }}><button type="button" className="profile-dialog-close" aria-label="Uždaryti" onClick={onClose}>×</button><h2 id={id}>{title}</h2>{children}</dialog>;
}
