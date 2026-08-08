# Neon Dash (`geometry`)

Clone web di **Geometry Dash**: platformer ritmico in cui il cubo corre da solo e tu controlli i salti.

## Gioca online (cellulare e remoto)

Link principale (sempre questo):

**https://sarlokko.github.io/Geometry/**

Backup se Pages è in ritardo:

- https://rawcdn.githack.com/sarlokko/Geometry/gh-pages/index.html
- https://cdn.jsdelivr.net/gh/sarlokko/Geometry@gh-pages/index.html

Apri dal browser del cellulare. Controlli touch: **tocca lo schermo per saltare**.

Nel menu deve comparire il tag build (`v10c…`). Se vedi una versione vecchia, chiudi il tab e riapri il link.

Ogni push su `main` pubblica automaticamente su `gh-pages`.

## Avvio locale

```bash
npm install
npm start
```

Oppure:

```bash
python3 -m http.server 8080 --directory public
```

Apri `http://localhost:8080` nel browser.

### Controlli

| Input | Azione |
| --- | --- |
| Spazio / Click / Tocco | Salta (o spinta in modalità nave) |
| Esc | Pausa |

### Meccaniche

- **Corsa continua** — 10 sezioni in un unico percorso
- **Checkpoint** — alla morte riparti dall’ultimo checkpoint raggiunto
- **Difficoltà progressiva** — spacing più stretto e velocità che aumenta sezione dopo sezione
- **Cubo** — salto da terra, rotazione in aria
- **Spike** — contatto = morte
- **Pad giallo** — rimbalzo automatico
- **Orb gialla** — salta mentre la tocchi (anche in aria)
- **Portale nave** — full-height; hold per salire
- **Uscita nave** — a fine sezione il ritorno a **cubo è obbligatorio** (non si può saltare il gate)
- **Practice** — stessa corsa con respawn più rapido

Il progresso migliore, la sezione migliore e il contatore attempt sono salvati in `localStorage`.

## Struttura

```
.
  public/
    index.html
    favicon.svg
    css/style.css
    js/
      main.js      # UI e input
      game.js      # loop, fisica, collisioni, render
      level.js     # layout del livello
      config.js    # costanti
      audio.js     # SFX + pulse bed (Web Audio)
  package.json
  .github/workflows/gh-pages-branch.yml
```
