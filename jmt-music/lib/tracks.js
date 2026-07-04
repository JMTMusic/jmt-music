import catalog from "@/tracks.json";

export const tracks = [...catalog.tracks].sort(
  (a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)
);

export const genres = catalog.genres;

export function getTrack(slug) {
  return tracks.find((track) => track.slug === slug);
}

export function getGenreName(id) {
  return genres.find((genre) => genre.id === id)?.name ?? id;
}

export function getSimilarTracks(track, limit = 3) {
  return tracks
    .filter((item) => item.slug !== track.slug)
    .sort((a, b) => Number(b.genre === track.genre) - Number(a.genre === track.genre))
    .slice(0, limit);
}
