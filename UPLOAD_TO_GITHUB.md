# Kaip įkelti šią versiją į GitHub

Šis aplankas paruoštas pakeisti dabartinio `vetkarjera-oss` repository turinį.

## Paprasčiausias variantas

1. Atsisiųsk `vetkarjera-final.zip` iš ChatGPT.
2. Išskleisk ZIP kompiuteryje.
3. GitHub atsidaryk `vetdarbai/vetkarjera-oss`.
4. Prieš keičiant visą projektą rekomenduojama GitHub sukurti atsarginę šaką arba atsisiųsti dabartinį ZIP.
5. Į `main` kelk **ZIP viduje esančius failus ir aplankus**, o ne patį ZIP failą.
6. Commit žinutė, pvz.: `Complete frontend registrations and MVP flows`.
7. Vercel, kuris prijungtas prie `main`, turėtų automatiškai pradėti naują deployment.

## Svarbu

- `node_modules` į GitHub nekeliamas.
- `.next` į GitHub nekeliamas.
- `.env`, API raktų ir slaptažodžių šiame ZIP nėra ir jų į GitHub dėti negalima.
- Jei Vercel build nepraeina, grįžk prie paskutinio veikiančio commit ir parodyk build klaidą.
