# Kitas etapas: backend

Šioje vietoje frontend yra paruoštas integracijai, tačiau be backend negalima saugiai užbaigti realių paskyrų ir duomenų saugojimo.

## Rekomenduojama Supabase struktūra

### 1. `profiles`
Bendri vartotojų duomenys:
- `id` – UUID, susietas su Supabase Auth
- `account_type` – `candidate` / `employer`
- `first_name`
- `last_name`
- `email`
- `phone`
- `created_at`

### 2. `candidate_profiles`
- `user_id`
- `role_type`
- `role_detail`
- `experience_years`
- `education`
- `city`
- `preferred_locations`
- `employment_types`
- `salary_expectation`
- `availability`
- `skills`
- `languages`
- `driving_license`
- `open_to_travel`
- `privacy_mode`

### 3. `organizations`
- `id`
- `owner_user_id`
- `org_type`
- `org_name`
- `city`
- `website`
- `description`
- `team_size`
- `additional_data` (JSONB pirmam etapui)
- `created_at`

### 4. `jobs`
- `id`
- `organization_id`
- `title`
- `role_type`
- `location`
- `employment_type`
- `salary_text`
- `description`
- `responsibilities`
- `requirements`
- `offer`
- `application_deadline`
- `status`
- `created_at`
- `expires_at`

### 5. `applications`
- `id`
- `job_id`
- `candidate_user_id`
- `message`
- `status`
- `created_at`

## Saugumas

Būtina:
- Supabase Row Level Security visoms vartotojų lentelėms;
- darbdavys gali keisti tik savo organizaciją ir savo skelbimus;
- kandidatas gali keisti tik savo profilį;
- privataus profilio duomenys negali būti viešai užklausiami;
- `service_role` raktas niekada negali patekti į frontend;
- slaptažodžius tvarko tik Supabase Auth, ne mūsų lentelės;
- server-side validacija, ne vien HTML/React validacija.

## Integravimo tvarka

1. Supabase projektas ir aplinkos kintamieji Vercel.
2. Auth: registracija / prisijungimas / atsijungimas.
3. `profiles`, `candidate_profiles`, `organizations` + RLS.
4. Dabartinių registracijos formų prijungimas prie DB.
5. `jobs` lentelė ir darbdavio skelbimo forma.
6. Skelbimų puslapio duomenys iš DB vietoje `data/jobs.ts`.
7. Kandidatūros.
8. Kandidatų ir darbdavių dashboardai.
9. Tik tada AI matching.
