import { EmployerOrgType } from '@/types/registration';

export interface OrgTypeOption {
  id: EmployerOrgType;
  label: string;
  icon: string;
  description: string;
}

export const orgTypeOptions: OrgTypeOption[] = [
  { id: 'clinic', label: 'Veterinarijos klinika', icon: '', description: 'Gyvūnų gydymo ir diagnostikos įstaiga' },
  { id: 'wholesale', label: 'Didmena / distributorius', icon: '', description: 'Veterinarinių produktų ir įrangos platinimas' },
  { id: 'pharma', label: 'Farmacinė įmonė', icon: '', description: 'Veterinarinių vaistų ar produktų įmonė' },
  { id: 'farm', label: 'Ūkis / gyvulininkystės įmonė', icon: '', description: 'Gyvulių auginimas ir gamyba' },
  { id: 'government', label: 'VMVT / valstybinė institucija', icon: '', description: 'Valstybinė priežiūra, kontrolė ar administravimas' },
  { id: 'pharmacy', label: 'Veterinarijos vaistinė', icon: '', description: 'Veterinarinių vaistų ir priemonių prekyba' },
  { id: 'university', label: 'Universitetas / mokymo įstaiga', icon: '', description: 'Studijos, mokslas ir profesinis rengimas' },
  { id: 'laboratory', label: 'Diagnostikos laboratorija', icon: '', description: 'Laboratorinė ir veterinarinė diagnostika' },
  { id: 'shelter', label: 'Gyvūnų prieglauda / NVO', icon: '', description: 'Gyvūnų globa ir nevyriausybinė veikla' },
  { id: 'production', label: 'Gyvūninių produktų / pašarų įmonė', icon: '', description: 'Gamyba, kokybė, pašarai ar maisto grandinė' },
  { id: 'other', label: 'Kita veterinarijos sektoriaus organizacija', icon: '', description: 'Kita su veterinarija susijusi veikla' },
];

export const teamSizeOptions = ['1–5', '6–15', '16–50', '51–200', '200+'];
export const animalTypeOptions = ['Šunys ir katės', 'Stambūs gyvūnai', 'Arkliai', 'Egzotiniai gyvūnai', 'Mišri praktika'];
export const clinicTypeOptions = ['Pirminės praktikos', 'Specializuota / referentinė', '24/7 ligoninė', 'Mobilioji / išvažiuojamoji praktika'];
export const wholesaleActivityOptions = ['Veterinariniai vaistai', 'Pašarai ir papildai', 'Įranga', 'Diagnostika', 'Gyvūnų prekės', 'Kita'];
export const territoryOptions = ['Lietuva', 'Baltijos šalys', 'Europa', 'Kita'];
export const wholesalePositionOptions = ['Veterinarijos gydytojai', 'Pardavimų vadybininkai', 'Key Account vadybininkai', 'Produktų vadybininkai', 'Techniniai konsultantai', 'Pirkimų vadybininkai', 'Logistikos / administracijos darbuotojai', 'Kita'];
export const farmAnimalOptions = ['Galvijai', 'Kiaulės', 'Paukščiai', 'Avys / ožkos', 'Arkliai', 'Kita'];
export const farmSizeOptions = ['Mažas', 'Vidutinis', 'Didelis', 'Labai didelis'];
