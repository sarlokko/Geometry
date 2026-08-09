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
| Spazio / Click / Tocco | Salta / thrust / flap (dipende dal mondo) |
| Frecce | Seleziona mondo (menu) |
| Esc | Pausa |

### Mondi (ognuno con una peculiarità)

1. **Aurora Run** — solo cubo, salti classici  
2. **Micro Mile** — cubo mini, piattaforme strette  
3. **Pad Pulse** — rimbalzi sui pad  
4. **Orb Garden** — orb in aria  
5. **Ship Harbor** — astronave (hold per salire)  
6. **Neverland** — pallina: non toccare terra  
7. **Flap Fields** — UFO a flap  
8. **Wave Rift** — onda (hold = su, rilascia = giù)  
9. **Mirror Vault** — gravità invertita  
10. **Neon Apex** — roulette di tutte le modalità  

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
