# JMT Music

Static multi-page site for JMTMusic.studio.

## Run locally

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Update tracks

Edit `tracks.js`. Every catalog and discovery card is generated from `window.JMT_TRACKS`.

Replace placeholder links (`href="#"`) with the live BeatStars and Instagram URLs when available.
