// Organizacijos tipai
export type OrgType = 
  | 'clinic'
  | 'wholesale'
  | 'pharma'
  | 'farm'
  | 'government'
  | 'pharmacy'
  | 'university'
  | 'laboratory'
  | 'shelter'
  | 'other';

// Pagrindinė registracijos forma
export interface EmployerRegistration {
  // Žingsnis 1
  orgType: OrgType | '';
  
  // Žingsnis 2 - Organizacijos informacija
  orgName: string;
  city: string;
  website: string;
  description: string;
  teamSize: string;
  
  // Kontaktinis asmuo
  firstName: string;
  lastName: string;
  position: string;
  email: string;
  phone: string;
  
  // Paskyra
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
  
  // Dinaminiai laukai (pagal orgType)
  additionalData: AdditionalData;
}

// Dinaminiai laukai pagal organizacijos tipą
export interface AdditionalData {
  // Klinikoms
  animalTypes?: string[];
  clinicType?: string;
  vetCount?: string;
  acceptsInterns?: boolean;
  hasMultipleLocations?: boolean;
  
  // Didmenai/distributoriui
  mainActivity?: string[];
  operatingTerritory?: string;
  typicalPositions?: string[];
  
  // Farmacinei įmonei
  activityArea?: string;
  salesRelated?: boolean;
  hiresVetSpecialists?: boolean;
  workTerritory?: string;
  
  // Ūkiui
  animalSpecies?: string[];
  farmSize?: string;
  hasPermanentVet?: boolean;
  acceptsStudents?: boolean;
  
  // Valstybinei institucijai
  institutionName?: string;
  region?: string;
  specialistTypes?: string;
  offersInternships?: boolean;
  
  // Kitiems
  activityDescription?: string;
}

// Pradinė būsena
export const initialFormData: EmployerRegistration = {
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
  additionalData: {}
};