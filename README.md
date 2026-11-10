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

Il FIT puoi scaricarlo da Garmin Connect senza esportarlo a mano: la prima volta accedi con `npm run garmin -- login` (email, password e codice di verifica, chiesti nel terminale), poi `npm run garmin -- fetch 2026-mezza-monza` mette nella cartella l'attività del giorno della gara, la più lunga se ce n'è più di una. Usa `python-garminconnect`, una libreria non ufficiale: Garmin può cambiare il login e romperla. Il primo uso prepara Python in `.venv`; il token resta in `~/.garminconnect`, fuori dal repo.

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

Il sito è già collegato: è il Worker `whoami` su Cloudflare, online su <https://whoami.santini-nic.workers.dev>. Ogni push su `main` passa dalla CI di GitHub (`check`, lint, build) e Cloudflare pubblica il sito in un paio di minuti. La configurazione sta in `wrangler.json`.

Per un dominio tuo: aggiungilo al Worker in **Settings → Domains & Routes** e cambia `site` in `astro.config.mjs`.

## Comandi

| Comando                          | A cosa serve                                                |
| -------------------------------- | ----------------------------------------------------------- |
| `npm run dev`                    | Sito in locale                                              |
| `npm run check`                  | Valida i contenuti, blocca originali ed EXIF, elenca i TODO |
| `npm run new-race`               | Crea una gara futura                                        |
| `npm run build-race <nome>`      | Elabora una gara                                            |
| `npm run backup`                 | Copia `private/` su Proton Drive                            |
| `npm run garmin -- fetch <nome>` | Scarica da Garmin Connect il FIT del giorno della gara      |
| `npm run lint`, `npm run format` | Controlla e formatta il codice                              |

## Dove stanno le cose

- Contenuti professionali: `src/content/` (`experience`, `education`, `certifications`, `skills`, `projects`, `volunteering`)
- Sport: `src/content/races/`, `src/content/journey/journey.yaml`
- Km di allenamento nella scheda personaggio: `src/content/training/aggregates.yaml`, facoltativo, solo totali annui
- Nome, email e P.IVA: `src/data/site.ts`
- CV scaricabile: `public/cv/nicolas-santini-cv.pdf`
- Formula di XP e livelli: `src/lib/stats.ts`
- Motore di scorrimento (HUD, pista, passaggi orizzontali): `src/scripts/game.ts`
- Stile e colori dei mondi: `src/styles/game.css`
- Numeri in evidenza delle missioni: `highlights` in `src/content/experience/`

## Privacy

`private/` non finisce mai in git: contiene GPX con battiti e orari, screenshot e foto originali. Pubblica solo tracciati di gare, mai di allenamenti.

### Backup di `private/`

Gli originali esistono solo sul tuo computer, quindi vanno copiati altrove. Il backup va su Proton Drive, cifrato end-to-end:

1. Installa l'app Proton Drive per Windows e accedi.
2. Lancia `npm run backup`: copia `private/` in `My files/WhoAmI-private` dentro la cartella di Proton Drive, che l'app carica da sola.

`npm run build-race` fa il backup da solo alla fine. Vengono copiati solo i file nuovi o cambiati, la cache dell'OCR resta fuori e dal backup non si cancella mai nulla. Se la cartella di Proton Drive ha un altro percorso, impostalo nella variabile d'ambiente `WHOAMI_BACKUP_DIR`.
