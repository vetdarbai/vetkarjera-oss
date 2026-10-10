import catalogs from './catalogs.json';
import type { OrganizationContext, PublicOrganization } from './contracts';

export const organizationCatalogs = catalogs;
export const employerSteps = ['Pagrindiniai duomenys', 'Juridiniai ir atstovo duomenys', 'Organizacijos pristatymas'];
export const options = (rows: string[][]) => rows.map(([code, label_lt]) => ({ code, label_lt }));
export const organizationTypes = options(catalogs.types);
export const employeeSizes = catalogs.sizes.map((label_lt, index) => ({ code: `size_${index + 1}`, label_lt }));
// Approved UI copy; the existing backend catalog codes remain the write contract.
const benefitCopy: Record<string, string> = { flexible_schedule: 'Lankstus grafikas', career_growth: 'Karjeros galimybės', bonuses: 'Bonusai', relocation_support: 'Relokacijos pagalba', employee_discounts: 'Darbuotojų nuolaidos', international_team: 'Darbas tarptautinėje komandoje' };
export const benefitOptions = catalogs.benefits.map(([code, label]) => ({ code, label_lt: benefitCopy[code] ?? label }));
export function publicBenefitLabel(value: string) { const entry = catalogs.benefits.find(([code, label]) => code === value || label === value); return entry ? benefitOptions.find(option => option.code === entry[0])!.label_lt : value; }
export const stateLabels = { draft: 'Juodraštis', active: 'Aktyvus', suspended: 'Sustabdytas', archived: 'Archyvuotas' };
export const verificationLabels = {
  unverified: 'Darbdavio duomenis patikrinsime prieš pirmą darbo skelbimo publikaciją.',
  pending: 'Duomenys pateikti patikrinimui.', verified: 'Darbdavio duomenys patikrinti.',
  needs_info: 'Patikrinimui reikia papildomos informacijos.',
};
export type PendingTransfer = { transferId: string; organizationId: string; name: string | null; rowVersion: number; expiresAt: string; direction: 'incoming' | 'outgoing' };
export type OwnerBundle = { context: OrganizationContext | null; transfers: PendingTransfer[]; hasEmployerProfile: boolean };
export type OwnerResult<T> = { ok: true; data: T } | { ok: false; code: 'conflict' | 'permission' | 'invalid' | 'unavailable'; message: string };
export type OwnerOperation = 'patch_org_public' | 'save_org_locations' | 'save_org_legal_draft' | 'save_own_representative_details' | 'save_org_type_block' | 'save_org_benefits' | 'request_org_legal_change' | 'request_employer_verification' | 'request_representation_verification' | 'request_org_transfer' | 'accept_org_transfer' | 'decline_org_transfer' | 'cancel_org_transfer';
export type Draft = ReturnType<typeof employerDraft>;
export function employerDraft(c: OrganizationContext) {
  const o = c.organization;
  return {
    name: o.name ?? '', type: o.primaryType ?? '', typeOther: o.typeOther ?? '', cities: (o.cities ?? []).map(city => city.name),
    legalName: c.legal.legalName ?? '', legalForm: c.legal.legalForm ?? '', legalCode: c.legal.legalCode ?? '',
    firstName: c.representative.firstName ?? '', lastName: c.representative.lastName ?? '', capacity: c.representative.capacity ?? '', privatePhone: c.representative.privatePhone ?? '',
    description: o.description ?? '', website: o.website ?? '', publicPhone: o.publicPhone ?? '', publicEmail: o.publicEmail ?? '', facebookUrl: o.facebookUrl ?? '', instagramUrl: o.instagramUrl ?? '', linkedinUrl: o.linkedinUrl ?? '', employeeSize: o.employeeSize ?? '',
    groups: (o.typeBlock ?? []).map(g => ({ group_code: g.group, options: [...g.options], custom: [...g.custom] })),
    benefits: (o.benefits ?? []).flatMap(label => { const match = catalogs.benefits.find(([code, text]) => code === label || text === label); return match ? [match[0]] : []; }),
    customBenefits: [...(o.customBenefits ?? [])],
  };
}
export function draftStep(d: Draft, step: number) {
  if (step === 1) return { name: d.name, type: d.type, typeOther: d.typeOther, cities: d.cities };
  if (step === 2) return { legalName: d.legalName, legalForm: d.legalForm, legalCode: d.legalCode, firstName: d.firstName, lastName: d.lastName, capacity: d.capacity, privatePhone: d.privatePhone };
  return { description: d.description, website: d.website, publicPhone: d.publicPhone, publicEmail: d.publicEmail, facebookUrl: d.facebookUrl, instagramUrl: d.instagramUrl, linkedinUrl: d.linkedinUrl, employeeSize: d.employeeSize, groups: d.groups, benefits: d.benefits, customBenefits: d.customBenefits };
}
export function changedFields(current: Record<string, unknown>, saved: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(current).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(saved[key])));
}
export function hasDuplicates(values: string[]) { const normalized = values.map(v => v.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('lt')); return new Set(normalized).size !== normalized.length; }
export function publicTypeLabel(o: PublicOrganization) { return organizationTypes.find(t => t.code === o.primaryType)?.label_lt ?? ''; }
export function safePublicUrl(value: string | undefined) { if (!value) return null; try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; } }
