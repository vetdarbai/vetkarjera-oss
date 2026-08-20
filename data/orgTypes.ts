import { OrgType } from '@/types/registration';

export interface OrgTypeOption {
  id: OrgType;
  label: string;
  icon: string;
  description: string;
}

export const orgTypeOptions: OrgTypeOption[] = [
  {
    id: 'clinic',
    label: 'Veterinarijos klinika',
    icon: '🏥',
    description: 'Gydymo įstaiga gyvūnams'
  },
  {
    id: 'wholesale',
    label: 'Didmena / distributorius',
    icon: '📦',
    description: 'Veterinarinių produktų platinimas'
  },
  {
    id: 'pharma',
    label: 'Farmacinė įmonė',
    icon: '💊',
    description: 'Vaistų gamyba ir prekyba'
  },
  {
    id: 'farm',
    label: 'Ūkis / gyvulininkystės įmonė',
    icon: '🐄',
    description: 'Gyvulių auginimas'
  },
  {
    id: 'government',
    label: 'VMVT / kita valstybinė institucija',
    icon: '🏛️',
    description: 'Valstybinė priežiūros įstaiga'
  },
  {
    id: 'pharmacy',
    label: 'Veterinarijos vaistinė',
    icon: '💉',
    description: 'Veterinarinių vaistų pardavimas'
  },
  {
    id: 'university',
    label: 'Universitetas / mokymo įstaiga',
    icon: '🎓',
    description: 'Švietimo ir mokslo institucija'
  },
  {
    id: 'laboratory',
    label: 'Diagnostikos laboratorija',
    icon: '🔬',
    description: 'Veterinarinė diagnostika'
  },
  {
    id: 'shelter',
    label: 'Gyvūnų prieglauda / NVO',
    icon: '🐾',
    description: 'Gyvūnų globos organizacija'
  },
  {
    id: 'other',
    label: 'Kita veterinarijos organizacija',
    icon: '🏢',
    description: 'Kita veiklos sritis'
  }
];

// Pasirinkimų sąrašai dinaminiams laukams
export const animalTypeOptions = [
  'Smulkūs gyvūnai',
  'Stambūs gyvūnai',
  'Arkliai',
  'Egzotiniai gyvūnai',
  'Mišri praktika'
];

export const clinicTypeOptions = [
  'Pirminės praktikos',
  'Referentinė / specializuota',
  '24/7'
];

export const teamSizeOptions = [
  '1–5',
  '6–15',
  '16–50',
  '50+'
];

export const wholesaleActivityOptions = [
  'Veterinariniai vaistai',
  'Pašarai',
  'Įranga',
  'Diagnostika',
  'Gyvūnų prekės',
  'Kita'
];

export const territoryOptions = [
  'Lietuva',
  'Baltijos šalys',
  'Kita'
];

export const wholesalePositionOptions = [
  'Veterinarijos gydytojus',
  'Pardavimų vadybininkus',
  'Produktų vadybininkus',
  'Techninius konsultantus',
  'Logistikos / administracijos darbuotojus',
  'Kita'
];

export const farmAnimalOptions = [
  'Galvijai',
  'Kiaulės',
  'Paukščiai',
  'Avys / ožkos',
  'Kita'
];

export const farmSizeOptions = [
  'Mažas (iki 50 gyvūnų)',
  'Vidutinis (50-200 gyvūnų)',
  'Didelis (200-1000 gyvūnų)',
  'Labai didelis (1000+ gyvūnų)'
];