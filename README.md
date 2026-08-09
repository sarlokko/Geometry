# Neon Dash (`geometry`)

Clone web di **Geometry Dash**: platformer ritmico in cui corri da solo e controlli i salti (o la spinta, a seconda del mondo).

## Come giocare

```bash
python3 -m http.server 8080
```

Apri `http://localhost:8080` nel browser.

### Controlli

| Input | Azione |
| --- | --- |
| Spazio / Click / Tocco | Salta / thrust / flip / zigzag (dipende dal mondo) |
| Frecce | Seleziona mondo (menu) |
| Esc | Pausa |

### Mondi

**6 livelli single-power**

1. **Cubo Base** — salti classici  
2. **Astronave** — hold per salire  
3. **Sottosopra** — portali che invertano la gravità  
4. **Zigzag** — onda (hold = su, rilascia = giù)  
5. **Muri** — pallina: tap per rimbalzare tra suolo e soffitto  
6. **Pallini** — pallina gialla: devi prendere i pallini gialli per avanzare  

**4 livelli multi-power**

7. **Doppio Varco** — cubo · nave · flip  
8. **Rift Mix** — nave · zigzag · cubo  
9. **Rimbalzi** — muri · pallini · cubo  
10. **Neon Apex** — tutti i poteri  

Completare un mondo sblocca il successivo. Progresso e sblocco restano in `localStorage`.

Musica procedurale Web Audio sincronizzata al BPM del mondo.

## Struttura

```
.
  index.html
  favicon.svg
  css/style.css
  js/
    main.js      # UI, selezione mondi, input
    game.js      # loop, fisiche per modalità, collisioni, render
    worlds.js    # 10 mondi + layout + peculiarità
    level.js     # re-export mondi
    config.js    # costanti
    audio.js     # SFX + musica ritmica (Web Audio)
```
