export type OrganizationType = 'veterinary_clinic' | 'farm_livestock_poultry' | 'veterinary_retail_pharmacy' | 'veterinary_wholesale_distributor' | 'animal_health_pharma_products' | 'public_institution' | 'university_research_education' | 'laboratory_diagnostics' | 'shelter_ngo' | 'animal_care_physiotherapy' | 'veterinary_equipment_technology' | 'professional_association' | 'other' | 'individual_activity';
export type MediaKind = 'logo' | 'cover';
export type OrganizationCapabilities = Readonly<{
 canReadPrivate: boolean; canEditProfile: boolean; canManageMedia: boolean;
 canSubmitVerification: boolean; canRequestTransfer: boolean; canArchive: boolean;
}>;
export type OrganizationCompleteness = Readonly<{
 step1: 0 | 20; step2: 0 | 50; requiredComplete: boolean; quality: number; total: number;
 typeBlockComplete: boolean; typeQualityPoints: 0 | 5; descriptionPoints: 0 | 10;
 logoPoints: 0 | 5; coverPoints: 0 | 5; benefitPoints: 0 | 5;
}>;
export type PublicOrganization = Readonly<{
 id: string; name?: string; primaryType?: OrganizationType; typeOther?: string; slug: string;
 cities?: ReadonlyArray<{ name: string; municipalityCode?: string }>;
 description?: string; website?: string; publicPhone?: string; publicEmail?: string;
 facebookUrl?: string; instagramUrl?: string; linkedinUrl?: string;
 employeeSize?: string; streetAddress?: string;
 typeBlock?: ReadonlyArray<{ group: string; options: string[]; custom: string[] }>;
 benefits?: string[]; customBenefits?: string[];
 media?: Partial<Record<MediaKind, { version: string; src: string }>>;
}>;
export type OrganizationContext = Readonly<{
 organization: PublicOrganization; rowVersion: number; typeRevision: number;
 legalRevision: number; ownershipRevision: number;
 profileState: 'draft' | 'active' | 'suspended' | 'archived';
 completeness: OrganizationCompleteness; capabilities: OrganizationCapabilities;
 legal: { legalName: string | null; legalForm: string | null; legalCode: string | null };
 representative: { firstName: string | null; lastName: string | null; capacity: string | null; privatePhone: string | null; revision: number };
 verification: { state: 'unverified' | 'pending' | 'verified' | 'needs_info'; identityApproved: boolean; representationApproved: boolean };
}>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validOrganizationId(value: string): boolean { return uuid.test(value); }
/** RPC response admission; never accept client metadata as capabilities. */
export function parseOrganizationContext(value: unknown): OrganizationContext | null {
 if (!value || typeof value !== 'object') return null;
 const v = value as OrganizationContext;
 if (!v.organization || !validOrganizationId(v.organization.id) || !v.capabilities || !v.completeness ||
 ![v.rowVersion, v.typeRevision, v.legalRevision, v.ownershipRevision].every(n => Number.isSafeInteger(n) && n > 0) ||
 !['draft','active','suspended','archived'].includes(v.profileState)) return null;
 if (Object.values(v.capabilities).some(b => typeof b !== 'boolean') ||
 !['canReadPrivate','canEditProfile','canManageMedia','canSubmitVerification','canRequestTransfer','canArchive'].every(k => typeof v.capabilities[k as keyof OrganizationCapabilities] === 'boolean')) return null;
 const c = v.completeness;
 if (![0,20].includes(c.step1) || ![0,50].includes(c.step2) || ![0,5].includes(c.typeQualityPoints) ||
 typeof c.requiredComplete !== 'boolean' || typeof c.typeBlockComplete !== 'boolean' ||
 c.typeQualityPoints !== (c.typeBlockComplete ? 5 : 0) ||
 !Number.isInteger(c.quality) || c.quality < 0 || c.quality > 30 ||
 c.total !== c.step1 + c.step2 + c.quality || c.total > 100 ||
 c.requiredComplete !== (c.step1 === 20 && c.step2 === 50)) return null;
 return v;
}
