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

## Content

`tracks.json` is the single source of truth for the portfolio, beat catalog, project pages, artwork, audio, metadata, and licensing URLs. Add a track there and the static project page is generated automatically.

## Build

```bash
npm run build
```

Next.js exports the production site to `out/` for static hosting.
