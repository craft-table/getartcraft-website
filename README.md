# getartcraft-website (Static Mirror)

Static mirror of **https://getartcraft.com/apps** and related pages, captured for archival purposes.

## What this is

This repository contains a static-site snapshot of the public-facing ArtCraft website (getartcraft.com), scraped with `wget --mirror --convert-links --page-requisites`.

It includes:
- The `/apps` page listing the seven public Craft apps (PhotoCraft, VectorCraft, FilmCraft, LightCraft, PdfCraft, EffectCraft, DesignCraft)
- Individual app pages for those seven apps
- App pages for the "in development" apps (SoundCraft, DeckCraft, CADCraft, GridCraft)
- The homepage, pricing, FAQ, support, tutorials, news, and download pages
- All CSS, JS, fonts, images, and videos referenced by those pages

## Structure

```
getartcraft.com/        # main site
  apps.html             # /apps landing page
  apps/                 # per-app pages (photocraft.html, vectorcraft.html, ...)
  images/apps/          # app icons and screenshots
  images/blog/          # blog hero images
  images/video-thumbnails/
  videos/features/      # .webm demo clips
  _next/static/         # Next.js build assets (CSS/JS chunks, fonts, media)
  faq/                  # FAQ articles
  tutorials/            # Tutorial articles
  news/                 # News articles
  index.html            # homepage
  download.html
  pricing.html
  support.html
app.getartcraft.com/    # the actual web-app frontend (CSS/JS bundle)
  assets/
  index-*.js
  index-*.css
```

## How to view locally

Because `wget --convert-links` rewrote all internal links to be relative, you can simply open `getartcraft.com/apps.html` in a browser. For local hosting with proper paths:

```bash
cd getartcraft.com
python3 -m http.server 8080
# Then open http://localhost:8080/apps.html
```

## Capture details

- Captured on: 2026-10-12 16:05 UTC
- Source domain: getartcraft.com (primary), app.getartcraft.com (web app bundle)
- Tool: `wget --mirror --convert-links --adjust-extension --page-requisites --span-hosts`
- File count: 182
- Total size: ~151 MB

## Notes

- This is a snapshot — links to `app.getartcraft.com/create-image` and `app.getartcraft.com/create-video` (the live AI generation tools) will not function offline because they require server-side API access.
- Some Next.js client-side routing may not work fully when served from a subpath; use direct file URLs for navigation.
- All trademarks and content belong to ArtCraft Studios. This mirror is for backup purposes only.
