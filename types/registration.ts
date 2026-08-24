export type EmployerOrgType =
  | 'clinic'
  | 'wholesale'
  | 'pharma'
  | 'farm'
  | 'government'
  | 'pharmacy'
  | 'university'
  | 'laboratory'
  | 'shelter'
  | 'production'
  | 'other';

export type CandidateRoleType =
  | 'veterinarian'
  | 'student'
  | 'assistant'
  | 'manager'
  | 'laboratory'
  | 'farm-specialist'
  | 'regulatory'
  | 'administration'
  | 'other';

export interface EmployerAdditionalData {
  animalTypes?: string[];
  clinicType?: string;
  vetCount?: string;
  acceptsInterns?: boolean;
  hasMultipleLocations?: boolean;
  mainActivity?: string[];
  operatingTerritory?: string;
  typicalPositions?: string[];
  activityArea?: string;
  salesRelated?: boolean;
  hiresVetSpecialists?: boolean;
  workTerritory?: string;
  animalSpecies?: string[];
  farmSize?: string;
  hasPermanentVet?: boolean;
  acceptsStudents?: boolean;
  institutionName?: string;
  region?: string;
  specialistTypes?: string;
  offersInternships?: boolean;
  activityDescription?: string;
}

export interface EmployerRegistration {
  orgType: EmployerOrgType | '';
  orgName: string;
  city: string;
  website: string;
  description: string;
  teamSize: string;
  firstName: string;
  lastName: string;
  position: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
  additionalData: EmployerAdditionalData;
}

export interface CandidateRegistration {
  roleType: CandidateRoleType | '';
  roleDetail: string;
  experienceYears: string;
  education: string;
  city: string;
  preferredLocations: string;
  employmentTypes: string[];
  salaryExpectation: string;
  availability: string;
  skills: string;
  languages: string;
  drivingLicense: boolean;
  openToTravel: boolean;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  privacyMode: 'active' | 'open' | 'private';
  agreedToTerms: boolean;
}

export const initialEmployerRegistration: EmployerRegistration = {
  orgType: '',
  orgName: '',
  city: '',
  website: '',
  description: '',
  teamSize: '',
  firstName: '',
  lastName: '',
  position: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  agreedToTerms: false,
  additionalData: {},
};

export const initialCandidateRegistration: CandidateRegistration = {
  roleType: '',
  roleDetail: '',
  experienceYears: '',
  education: '',
  city: '',
  preferredLocations: '',
  employmentTypes: [],
  salaryExpectation: '',
  availability: '',
  skills: '',
  languages: '',
  drivingLicense: false,
  openToTravel: false,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  privacyMode: 'active',
  agreedToTerms: false,
};
