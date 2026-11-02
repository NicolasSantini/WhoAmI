# WhoAmI

Il mio sito personale: statico, con Astro, TypeScript e contenuti in Markdown/YAML.

Serve Node 24 (versione in `.node-version`). Prima volta:

```bash
npm install
```

Sito in locale su <http://localhost:4321>, con i TODO visibili:

```bash
npm run dev
```

## Come aggiungere una gara

**1. Crea la cartella** `src/content/races/AAAA-nome/`, tutto minuscolo (esempio `2026-mezza-monza`) e mettici dentro:

| File                   | Note                                   |
| ---------------------- | -------------------------------------- |
| `traccia.gpx` o `.fit` | Il tracciato, nome libero, uno solo    |
| Screenshot o `.txt`    | I risultati ufficiali, nome libero     |
| `photos/`              | Le foto: JPG, PNG o WebP (niente HEIC) |
| `medal.png`            | La medaglia, con sfondo trasparente    |
| `medal-back.png`       | Il retro, opzionale                    |

Se la gara esisteva già come gara futura, usa la sua cartella. Tutti i file sono facoltativi, e git ignora tutto tranne `index.md`, `track.svg` e `profile.svg`.

**2. Lancia lo script** e rispondi alle domande:

```bash
npm run build-race 2026-mezza-monza
```

Sposta gli originali in `private/`, calcola distanza, tempo, passo e dislivello, genera tracciato e profilo SVG, converte le foto eliminando i metadati.

Dei risultati ti mostra cosa ha letto e salva solo dopo la tua conferma: controlla sempre i numeri. Invio salva, `n` non salva, `3 56` mette 56 nel campo 3. La prima volta scarica i dati della lingua per l'OCR.

Puoi rilanciarlo quando vuoi: i campi scritti a mano e il testo restano. Solo il blocco `auto:` viene riscritto. Per rileggere i risultati aggiungi `--results`.

**3. Completa a mano** `index.md`: scrivi il racconto sotto il secondo `---` e migliora le descrizioni in `photoAlts`. I valori scritti a mano, come `distanceKm`, vincono su quelli del tracciato.

**4. Controlla e pubblica:**

```bash
npm run check
```

```bash
npm run dev
```

```bash
git add -A
```

```bash
git commit -m "Aggiungo la gara"
```

```bash
git push
```

Per una gara futura basta `npm run new-race`, che fa qualche domanda e crea lo scheletro.

## Come pubblicare

Ogni push su `main` passa dalla CI di GitHub (`check`, lint, build) e Cloudflare Pages pubblica il sito in un paio di minuti.

Prima configurazione, una volta sola:

1. Su Cloudflare apri **Workers & Pages → Create → Pages → Connect to Git** e scegli questo repo.
2. Imposta **Framework preset** Astro, **Build command** `npm run build`, **Build output directory** `dist`, **Production branch** `main`.
3. Per un dominio tuo usa **Custom domains** e cambia `site` in `astro.config.mjs`.

## Comandi

| Comando                          | A cosa serve                                                |
| -------------------------------- | ----------------------------------------------------------- |
| `npm run dev`                    | Sito in locale                                              |
| `npm run check`                  | Valida i contenuti, blocca originali ed EXIF, elenca i TODO |
| `npm run new-race`               | Crea una gara futura                                        |
| `npm run build-race <nome>`      | Elabora una gara                                            |
| `npm run lint`, `npm run format` | Controlla e formatta il codice                              |

## Dove stanno le cose

- Contenuti professionali: `src/content/` (`experience`, `education`, `certifications`, `skills`, `projects`, `volunteering`)
- Sport: `src/content/races/`, `src/content/journey/journey.yaml`
- Km di allenamento nella scheda personaggio: `src/content/training/aggregates.yaml`, facoltativo, solo totali annui
- Nome, email e P.IVA: `src/data/site.ts`
- CV scaricabile: `public/cv/nicolas-santini-cv.pdf`
- Formula di XP e livelli: `src/lib/stats.ts`

## Privacy

`private/` non finisce mai in git: contiene GPX con battiti e orari, screenshot e foto originali. Conservane una copia a parte, perché esiste solo sul tuo computer. Pubblica solo tracciati di gare, mai di allenamenti.
