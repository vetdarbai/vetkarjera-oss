# VetKarjera

VetKarjera – veterinarijos darbo ir karjeros platformos MVP.

## Kas jau paruošta

- Pagrindinis puslapis ir navigacija
- Veikianti darbo skelbimų paieška, filtrai ir rūšiavimas
- Darbo skelbimo detalus puslapis
- Darbdavio registracija su dinaminiais klausimais pagal organizacijos tipą
- Specialisto registracija su dinaminiais klausimais pagal profesinę kryptį
- Darbo skelbimo kūrimo forma
- Prisijungimo ekranas
- Privatumo ir taisyklių MVP puslapiai
- Responsive dizainas telefonui ir kompiuteriui
- Frontend formų validacija ir demonstraciniai sėkmės ekranai

## Svarbi riba

Tai **frontend užbaigimo versija**. Tikras backend dar neprijungtas, todėl:

- registracijos duomenys nėra išsaugomi;
- vartotojų paskyros realiai nesukuriamos;
- prisijungimas neveikia kaip autentifikacija;
- darbo skelbimai nėra įrašomi į duomenų bazę;
- kandidatavimas ir CV failų saugojimas dar neveikia;
- nėra saugių vartotojų sesijų ar rolėmis pagrįstos prieigos.

Toliau žr. `BACKEND_NEXT.md`.

## Paleidimas

```bash
npm install
npm run dev
```

Build patikra:

```bash
npm run typecheck
npm run build
```

## Siūlomas hostingas

- GitHub – kodui
- Vercel – Next.js hostingui
- Supabase – autentifikacijai, PostgreSQL duomenų bazei ir failams
