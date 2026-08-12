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
| 1 / 2 / 3 | Seleziona stage I / II / III (menu) |
| Esc | Pausa |

### Mondi e stage

Ci sono **10 mondi**, ognuno con **3 stage** (I · II · III) a difficoltà crescente (più velocità, più ostacoli, ritmi più stretti).

**6 mondi single-power**

1. Cubo Base  
2. Astronave  
3. Sottosopra  
4. Zigzag  
5. Muri  
6. Pallini  

**4 mondi multi-power**

7. Doppio Varco  
8. Rift Mix  
9. Rimbalzi  
10. Neon Apex  

Completare uno stage sblocca il successivo dello stesso mondo; completare lo stage III sblocca il mondo seguente.

Dev: `?unlock=9` sblocca tutti i mondi e tutti gli stage.

## Struttura

```
.
  index.html
  favicon.svg
  css/style.css
  js/
    main.js      # UI, selezione mondi/stage, input
    game.js      # loop, fisiche, collisioni, render
    worlds.js    # 10 mondi × 3 stage + layout
    level.js     # re-export
    config.js
    audio.js
```
