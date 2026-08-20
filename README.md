# VetKarjera – Veterinarijos darbo skelbimai

Moderni platforma, sujungianti veterinarijos gydytojus ir klinikas.

## Projekto struktūra

```
vetkarjera/
├── app/                    # Puslapiai (Next.js App Router)
│   ├── page.tsx           # Pagrindinis puslapis
│   ├── skelbimai/         # Darbo skelbimų sąrašas
│   ├── skelbimas/[id]/    # Vieno skelbimo detalus puslapis
│   └── darbdavys/         # Darbdavio puslapis
├── components/            # React komponentai
│   ├── Navigation.tsx     # Navigacijos baras
│   └── Footer.tsx         # Footer
├── data/                  # Pavyzdiniai duomenys
│   └── jobs.ts           # Darbo skelbimai (ateityje → duomenų bazė)
└── public/               # Statiniai failai
```

## Kaip paleisti projektą

### StackBlitz'e (rekomenduojama)

1. Atidaryk projektą StackBlitz platformoje
2. Palaukti, kol įsidiegs priklausomybės
3. Projektas automatiškai paleidžiamas

### Lokaliame kompiuteryje

```bash
npm install
npm run dev
```

Atidaryti naršyklėje: http://localhost:3000

## Technologijos

- **Next.js 14** – React framework su App Router
- **TypeScript** – Type-safe JavaScript
- **CSS** – Švarūs stiliai be framework'ų

## Būsimi žingsniai

- [ ] Supabase autentifikacija
- [ ] Duomenų bazės integracija
- [ ] Registracijos formos
- [ ] Kandidatavimo sistema
- [ ] AI matching
- [ ] Mokėjimai (Stripe)
