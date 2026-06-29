# JMT Music

Static multi-page site for JMTMusic.studio.

## Run locally

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Update tracks

Edit `tracks.json`. The homepage, genre pages, catalog, and discovery views all load from this single file.

Each track supports:

- `title`, `slug`, `genre`
- `bpm`, `key`
- `coverImage`, `audioUrl`, `shortDescription`
- `beatstarsUrl`, `releaseDate`, `featured`
- `tags`

Homepage releases are the newest tracks with `featured: true`. Genre pages filter automatically using the track's `genre` value.

Replace the placeholder `beatstarsUrl` values with live track URLs when available.

## Audio previews

This is a static site, so public assets live directly under the site root. Add preview files to `audio/` and then set each track's `audioUrl` to its root-relative path.

Files still needed:

- `audio/heat-check.mp3`
- `audio/hoodie.mp3`
- `audio/why-not.mp3`
- `audio/tlkin.mp3`
- `audio/backpack.mp3`

Until a file is added and its `audioUrl` is set (for example, `"/audio/heat-check.mp3"`), the site displays **Audio Coming Soon** and does not attempt playback.
