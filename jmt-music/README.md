# JMT Music V2

Production-first website for JMTMusic.studio, built with Next.js, React, Tailwind CSS, Framer Motion, and Lucide.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Analytics

Analytics are optional and load globally only when their corresponding environment variable is set.

1. In [Google Analytics](https://analytics.google.com/), create a GA4 property and a Web data stream. Copy its **Measurement ID** from **Admin → Data streams → your web stream**. It begins with `G-`.
2. In [Microsoft Clarity](https://clarity.microsoft.com/), create or open a project. Copy the **Project ID** from **Settings → Overview**.
3. For local development, create `.env.local`:

```bash
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_CLARITY_ID=xxxxxxxxxx
```

4. In Vercel, open the project and go to **Settings → Environment Variables**. Add `NEXT_PUBLIC_GA_ID` and `NEXT_PUBLIC_CLARITY_ID`, select the environments where analytics should run (normally Production), save them, and redeploy the site.

The site sends `beat_audio_play`, `beatstars_link_click`, `contact_form_submit`, and `service_cta_click` events. No analytics ID is committed to the repository.

## Control Center

The private business dashboard is available at `/control-center`. Every route below that path is protected by server-side HTTP Basic authentication in `middleware.ts`; it is not a client-side visibility toggle. The route also sends `noindex`, `nofollow`, `nocache`, and `no-referrer` metadata.

Add these server-only variables in **Vercel → Project → Settings → Environment Variables** for Production (and Preview if needed):

```bash
CONTROL_CENTER_USERNAME=your-private-username
CONTROL_CENTER_PASSWORD=use-a-long-unique-password
CONTROL_CENTER_SUPABASE_USER_ID=the-auth-user-uuid-for-this-login
```

Do not prefix these values with `NEXT_PUBLIC_`. If either Basic Auth value is missing, the Control Center fails closed with HTTP 503. The Supabase user ID maps the current Basic Auth login to one exact `profiles` row so server actions can enforce `owner`, `editor`, and `viewer` permissions. After adding or rotating credentials, redeploy the project.

The application now uses the standard Next.js server deployment rather than `output: "export"`. Public pages remain statically generated where possible, while `/control-center` is dynamically served behind middleware. Phase 1 dashboard values are representative server-only data; Google Analytics Data API access, CMS editing, uploads, messaging, and other write operations are intentionally not implemented.

### Managed properties

The Control Center is a multi-property administration hub. Its top-bar selector currently supports:

- **JMT Music** — `jmtmusic.studio`, connected production property
- **Jonathan Tripp** — `jonathan-tripp.com`, prepared for a future website and analytics connection

The selected property is represented by the validated `site` query parameter and is preserved across sidebar navigation. Private mock and operational data are resolved on the server from `lib/control-center/data.ts`; the client-side switcher imports only the non-sensitive property registry from `lib/control-center/site-registry.ts`.

To add another property, extend `SiteId` in `lib/control-center/types.ts`, add its public switcher entry to the registry, and provide one complete typed `SiteConfig`. Dashboard metrics, website sections, analytics health, channels, lead categories, brand settings, clients, activity, and catalog behavior will then flow through the existing pages without duplicating UI.

### Supabase foundation

Supabase client utilities are available for browser, server/RLS, and privileged server-only operations. Add these variables in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service-role key must remain server-only and must never use the `NEXT_PUBLIC_` prefix. The Control Center dashboard performs a public Auth health check using the anonymous key and shows the result under Website Status. No dashboard mock data is read from or written to Supabase in this phase.

## Content

`tracks.json` is the single source of truth for the portfolio, beat catalog, project pages, artwork, audio, metadata, and licensing URLs. Add a track there and the static project page is generated automatically.

## Build

```bash
npm run build
```

Next.js statically optimizes public routes and deploys the protected Control Center through the Next.js runtime.
