import Navigation from './Navigation';
import Image from 'next/image';
import Footer from './Footer';
import { employeeSizes, organizationCatalogs as c, publicBenefitLabel, publicTypeLabel, safePublicUrl } from '@/lib/organizations/frontend';
import type { PublicOrganization } from '@/lib/organizations/contracts';

/** Only the public RPC DTO crosses this component boundary. No owner-context fallback. */
export default function PublicEmployerProfile({ organization: o }: { organization: PublicOrganization }) {
  const links = [['Interneto svetainė', o.website], ['Facebook', o.facebookUrl], ['Instagram', o.instagramUrl], ['LinkedIn', o.linkedinUrl]];
  const activities = (o.typeBlock ?? []).flatMap(g => {
    const group = c.groups.find(item => item.type === o.primaryType && item.code === g.group);
    if (!group) return [];
    const selected = g.options.flatMap(code => { const option = c.options.find(item => item.type === o.primaryType && item.group === g.group && item.code === code); return option && code !== 'other' ? [option.label] : []; });
    const values = [...selected, ...g.custom].filter(Boolean);
    return values.length ? [{ label: group.label, values }] : [];
  });
  const benefits = [...(o.benefits ?? []).map(publicBenefitLabel), ...(o.customBenefits ?? [])].filter(Boolean);
  return <><Navigation /><main className="public-employer registry-container">
    {o.media?.cover?.src && <Image unoptimized width={1600} height={600} className="public-employer-cover" src={o.media.cover.src} alt="Organizacijos viršelio nuotrauka" />}
    <header className="public-employer-heading">{o.media?.logo?.src && <Image unoptimized width={112} height={112} className="public-employer-logo" src={o.media.logo.src} alt={`${o.name || 'Organizacijos'} logotipas`} />}<div><h1>{o.name || 'Organizacija'}</h1>{publicTypeLabel(o) && <p>{publicTypeLabel(o)}{o.primaryType === 'other' && o.typeOther ? ` · ${o.typeOther}` : ''}</p>}{!!o.cities?.length && <p>{o.cities.map(city => city.name).join(' · ')}</p>}{o.employeeSize && <p>Komandos dydis: {employeeSizes.find(size => size.code === o.employeeSize)?.label_lt || o.employeeSize}</p>}</div></header>
    {o.description && <section><h2>Apie organizaciją</h2><p className="public-employer-description">{o.description}</p></section>}
    {!!activities.length && <section><h2>Organizacijos veikla</h2><dl>{activities.map(g => <div key={g.label}><dt>{g.label}</dt><dd>{g.values.join(' · ')}</dd></div>)}</dl></section>}
    {!!benefits.length && <section><h2>Ką siūlome darbuotojams</h2><ul>{benefits.map((benefit, i) => <li key={`${i}:${benefit}`}>{benefit}</li>)}</ul></section>}
    {(o.publicPhone || o.publicEmail || links.some(([,url]) => safePublicUrl(url))) && <section><h2>Kontaktai</h2><div className="public-employer-contacts">{o.publicPhone && <a href={`tel:${encodeURIComponent(o.publicPhone)}`}>{o.publicPhone}</a>}{o.publicEmail && <a href={`mailto:${encodeURIComponent(o.publicEmail)}`}>{o.publicEmail}</a>}{links.flatMap(([label, url]) => { const href = safePublicUrl(url); return href ? [<a key={label} href={href} target="_blank" rel="noopener noreferrer">{label}</a>] : []; })}</div></section>}
    <section><h2>Darbo skelbimai</h2><p>Šiuo metu aktyvių darbo skelbimų nėra.</p></section>
  </main><Footer /></>;
}
