# Neon Dash (`geometry`)

Clone web di **Geometry Dash**: platformer ritmico in cui il cubo corre da solo e tu controlli i salti.

## Gioca online (cellulare e remoto)

Il gioco è **online e giocabile subito**, senza account esterni:

- **Gioco (consigliato):** https://raw.githack.com/sarlokko/Geometry/gh-pages/index.html
- **Alternativa jsDelivr:** https://cdn.jsdelivr.net/gh/sarlokko/Geometry@gh-pages/index.html
- **GitHub Pages (se attivo):** https://sarlokko.github.io/Geometry/

> Su alcuni CDN l’HTML può apparire come testo; in quel caso usa **githack**.

Apri il link dal browser del cellulare. Controlli touch: **tocca lo schermo per saltare**.

Ogni push su `main` pubblica automaticamente la versione aggiornata (branch `gh-pages`).

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
```
