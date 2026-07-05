# Control Center storage setup

Storage buckets are documented but intentionally not created by the database migrations. Create them in **Supabase Dashboard → Storage → New bucket** after reviewing the access model.

## Buckets

| Bucket | Public | Purpose | Recommended limits |
| --- | --- | --- | --- |
| `beat-artwork` | Yes | Published beat cover artwork | Images only; 10 MB |
| `beat-audio` | Yes | Published beat previews | Audio only; 100 MB |
| `brand-assets` | Yes | Logos, marks, fonts, and approved public brand files | Images/fonts; 25 MB |
| `website-media` | Yes | Public page photography, video thumbnails, and downloadable media | Images/video/PDF; 100 MB |

Use property-scoped object paths:

```text
{property-id}/{entity-id}/{filename}
```

Example:

```text
10000000-0000-4000-8000-000000000001/swagger/cover.jpg
```

## Policy plan

Do not use the service-role key in a browser or upload directly without authorization checks.

1. Public/anonymous users may `SELECT` objects only from approved public buckets.
2. Authenticated `owner` and `editor` users may upload and update objects inside a known property prefix.
3. Only `owner` users may delete objects.
4. `viewer` users remain read-only.
5. Validate MIME type, extension, and file size in the server upload action in addition to bucket restrictions.
6. Store only the object path—not signed URLs—in database records.

Storage RLS policies should be added when Supabase Auth replaces the Phase 1 HTTP Basic gate and property membership is modeled. Adding permissive upload policies before then would create an unnecessary public write surface.

## Suggested MIME types

- `beat-artwork`: `image/jpeg`, `image/png`, `image/webp`, `image/avif`
- `beat-audio`: `audio/mpeg`, `audio/wav`, `audio/x-wav`, `audio/mp4`
- `brand-assets`: approved image types plus `font/woff2`
- `website-media`: approved image types, `video/mp4`, and `application/pdf`
