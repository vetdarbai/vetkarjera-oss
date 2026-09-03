import { CandidateRoleType } from '@/types/registration';

export interface CandidateRoleOption {
  id: CandidateRoleType;
  label: string;
  icon: string;
  description: string;
  detailLabel: string;
  detailPlaceholder: string;
}

export const candidateRoleOptions: CandidateRoleOption[] = [
  {
    id: 'veterinarian',
    label: 'Veterinarijos gydytojas',
    icon: '',
    description: 'Klinikinė praktika, diagnostika, chirurgija ar kita veterinarijos kryptis',
    detailLabel: 'Kokia jūsų specializacija arba klinikinė kryptis?',
    detailPlaceholder: 'Pvz. bendroji praktika, chirurgija, dermatologija, galvijų medicina...'
  },
  {
    id: 'student',
    label: 'Veterinarijos studentas / praktikantas',
    icon: '',
    description: 'Praktika, vasaros darbas, stažuotė ar pirmoji darbo vieta',
    detailLabel: 'Kokios praktikos ar darbo ieškote?',
    detailPlaceholder: 'Pvz. smulkių gyvūnų klinika Kaune, 2 mėn. vasaros praktika...'
  },
  {
    id: 'assistant',
    label: 'Veterinarijos asistentas / felčeris',
    icon: '',
    description: 'Klinikos, slaugos, operacinės ar klientų aptarnavimo darbas',
    detailLabel: 'Kokios darbo krypties ieškote?',
    detailPlaceholder: 'Pvz. operacinės asistentas, stacionaro priežiūra, registratūra...'
  },
  {
    id: 'manager',
    label: 'Vadybininkas / komercijos specialistas',
    icon: '',
    description: 'Pardavimai, produktai, Key Account, pirkimai ar verslo plėtra',
    detailLabel: 'Kokio vadybinio darbo ieškote?',
    detailPlaceholder: 'Pvz. pardavimų vadybininkas, Key Account Manager, produktų vadybininkas, pirkimų vadybininkas...'
  },
  {
    id: 'laboratory',
    label: 'Laboratorijos / diagnostikos specialistas',
    icon: '',
    description: 'Laboratorinė diagnostika, mikrobiologija, patologija ar kokybės kontrolė',
    detailLabel: 'Kokios laboratorinės ar diagnostikos krypties ieškote?',
    detailPlaceholder: 'Pvz. mikrobiologija, klinikinė patologija, laboratorijos vadyba...'
  },
  {
    id: 'farm-specialist',
    label: 'Ūkio / gyvulininkystės specialistas',
    icon: '',
    description: 'Bandos sveikata, gamyba, reprodukcija, zootechnika ar konsultavimas',
    detailLabel: 'Kokio darbo ūkyje ar gyvulininkystėje ieškote?',
    detailPlaceholder: 'Pvz. bandos sveikatos specialistas, reprodukcijos konsultantas...'
  },
  {
    id: 'regulatory',
    label: 'Reguliavimo / kokybės specialistas',
    icon: '',
    description: 'Regulatory affairs, kokybė, farmakovigilancija, maisto sauga ar institucinis darbas',
    detailLabel: 'Kokios reguliavimo ar kokybės krypties ieškote?',
    detailPlaceholder: 'Pvz. Regulatory Affairs, QA, farmakovigilancija, VMVT inspektorius...'
  },
  {
    id: 'administration',
    label: 'Administracijos / klientų aptarnavimo specialistas',
    icon: '',
    description: 'Registratūra, administravimas, klientų aptarnavimas ar koordinavimas',
    detailLabel: 'Kokio administracinio darbo ieškote?',
    detailPlaceholder: 'Pvz. klinikos administratorius, registratūros darbuotojas...'
  },
  {
    id: 'other',
    label: 'Kitas veterinarijos sektoriaus specialistas',
    icon: '',
    description: 'Kita profesinė kryptis, susijusi su veterinarijos sektoriumi',
    detailLabel: 'Trumpai parašykite, kokio darbo ieškote',
    detailPlaceholder: 'Įrašykite norimos pozicijos ar krypties pavadinimą...'
  }
];

export const employmentTypeOptions = ['Pilnas etatas', 'Dalinis etatas', 'Projektinis darbas', 'Praktika / stažuotė', 'Papildomas darbas', 'Nuotolinis / hibridinis'];
