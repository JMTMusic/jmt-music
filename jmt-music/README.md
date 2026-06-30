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

Set `beatstarsUrl` to a live BeatStars track URL when available. A null value renders a disabled "Coming Soon" state.

## Audio previews

This is a static site, so public assets live directly under the site root. Add preview files to `audio/` and then set each track's `audioUrl` to its root-relative path.

All catalog previews live in `audio/`, and each track references its file with a root-relative path such as `"/audio/heat-check.mp3"`. If a file or `audioUrl` is unavailable, the site displays a disabled fallback without interrupting the rest of the catalog.
