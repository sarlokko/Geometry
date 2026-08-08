# Neon Dash (`geometry`)

Clone web di **Geometry Dash**: platformer ritmico in cui il cubo corre da solo e tu controlli i salti.

## Come giocare

```bash
python3 -m http.server 8080
```

Apri `http://localhost:8080` nel browser.

### Controlli

| Input | Azione |
| --- | --- |
| Spazio / Click / Tocco | Salta (o spinta in modalità nave) |
| Esc | Pausa |

### Meccaniche

- **Cubo** — salto da terra, rotazione in aria
- **Spike** — contatto = morte e restart
- **Pad giallo** — rimbalzo automatico
- **Orb gialla** — salta mentre la tocchi (anche in aria)
- **Portale** — passa a modalità nave (hold per salire) e torna al cubo
- **Practice** — stesso livello con restart più rapido

Il progresso migliore e il contatore attempt sono salvati in `localStorage`.

## Struttura

```
.
  index.html
  favicon.svg
  css/style.css
  js/
    main.js      # UI e input
    game.js      # loop, fisica, collisioni, render
    level.js     # layout del livello
    config.js    # costanti
    audio.js     # SFX + pulse bed (Web Audio)
```
