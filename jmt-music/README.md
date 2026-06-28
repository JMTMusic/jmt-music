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
- `coverImage`, `shortDescription`
- `beatstarsUrl`, `releaseDate`, `featured`
- `tags`

Homepage releases are the newest tracks with `featured: true`. Genre pages filter automatically using the track's `genre` value.

Replace the placeholder `beatstarsUrl` values with live track URLs when available.
