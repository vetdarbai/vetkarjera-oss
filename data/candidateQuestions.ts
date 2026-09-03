import { CandidateRoleType } from '@/types/registration';

export interface QuestionnaireTextQuestion {
  id: string;
  label: string;
  placeholder?: string;
  help?: string;
  required?: boolean;
}

export const candidateQuestionnaire = {
  intro: {
    kicker: 'Kandidato profesinė anketa',
    title: 'Papasakokite, kur jūsų žinios gali būti naudingiausios.',
    description: 'Pateikite profesinę kryptį, patirtį ir darbo lūkesčius.',
  },
  role: {
    title: 'Kokia jūsų profesinė rolė?',
    description: 'Pasirinkite artimiausią variantą. Toliau matysite tik jūsų krypčiai aktualų klausimą.',
  },
  profile: {
    title: 'Profesinė kryptis ir lūkesčiai',
    description: 'Nurodykite patirtį, kvalifikaciją ir darbo lūkesčius.',
  },
  questions: {
    roleDetail: { id: 'roleDetail', label: 'Ieškoma profesinė kryptis', help: 'Trumpai ir konkrečiai įvardykite norimą darbo ar praktikos kryptį.', required: true },
    experience: { id: 'experienceYears', label: 'Patirtis arba studijų etapas' },
    education: { id: 'education', label: 'Išsilavinimas / kvalifikacija' },
    city: { id: 'city', label: 'Dabartinis miestas' },
    preferredLocations: { id: 'preferredLocations', label: 'Kur norėtumėte dirbti?', placeholder: 'Pvz. Kaunas, Vilnius, visa Lietuva, nuotoliu' },
    employmentTypes: { id: 'employmentTypes', label: 'Dominantis darbo tipas' },
    salaryExpectation: { id: 'salaryExpectation', label: 'Atlygio lūkestis', placeholder: 'Pvz. nuo 2500 € bruto' },
    availability: { id: 'availability', label: 'Kada galėtumėte pradėti?', placeholder: 'Pvz. iš karto, po 1 mėn., vasarą' },
    skills: { id: 'skills', label: 'Pagrindiniai įgūdžiai, patirtis ar stiprybės' },
    languages: { id: 'languages', label: 'Kalbos', placeholder: 'Pvz. lietuvių, anglų B2' },
    drivingLicense: { id: 'drivingLicense', label: 'Turiu B kategorijos vairuotojo pažymėjimą' },
    openToTravel: { id: 'openToTravel', label: 'Galiu keliauti darbo reikalais' },
  } satisfies Record<string, QuestionnaireTextQuestion>,
  license: {
    id: 'veterinaryLicense',
    label: 'Veterinarijos praktikos licencijos numeris',
    help: 'Privalomas veterinarijos gydytojo profesinei rolei.',
    privacyTitle: 'Privati informacija',
    privacyText: 'Numeris yra privatus ir naudojamas tik paskyrai patikrinti. Jį matys tik „VetKarjera“ administratorius. Darbdaviams, kandidatams ir viešiems lankytojams jis nebus rodomas.',
    requiredMessage: 'Įrašykite veterinarijos praktikos licencijos numerį.',
  },
};

export const licensedCandidateRoles: CandidateRoleType[] = ['veterinarian'];

export const experienceOptions = {
  student: ['1–2 kursas', '3–4 kursas', '5–6 kursas', 'Absolventas'],
  professional: ['Be patirties', 'Iki 1 metų', '1–3 metai', '3–5 metai', '5–10 metų', '10+ metų'],
};
