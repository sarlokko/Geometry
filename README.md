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
| Frecce | Seleziona mondo (menu) |
| Esc | Pausa |

### Mondi

Dieci mondi selezionabili, ognuno più difficile del precedente (velocità, densità ostacoli, BPM della musica). Completare un mondo sblocca il successivo.

1. **Aurora Run** — primi salti  
2. **Pulse Valley** — ritmo più stretto  
3. **Sky Bridge** — piattaforme  
4. **Bounce Circuit** — pad  
5. **Orb Garden** — orb in aria  
6. **Ship Harbor** — modalità nave  
7. **Dual Drift** — cubo + nave  
8. **Spike Storm** — alta densità  
9. **Void Warp** — nave caotica  
10. **Neon Apex** — il più duro  

### Meccaniche

- **Cubo** — salto da terra, rotazione in aria
- **Spike** — contatto = morte e restart dall’inizio del mondo
- **Pad giallo** — rimbalzo automatico
- **Orb gialla** — salta mentre la tocchi (anche in aria)
- **Portale** — passa a modalità nave (hold per salire) e torna al cubo
- **Musica a ritmo** — bed procedurale Web Audio sincronizzato al BPM del mondo

Il progresso per mondo e lo sblocco sono salvati in `localStorage`.

## Struttura

```
.
  index.html
  favicon.svg
  css/style.css
  js/
    main.js      # UI, selezione mondi, input
    game.js      # loop, fisica, collisioni, render
    worlds.js    # 10 mondi + layout
    level.js     # re-export mondi
    config.js    # costanti
    audio.js     # SFX + musica ritmica (Web Audio)
```
