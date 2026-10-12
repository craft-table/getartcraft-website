# getartcraft-website (Static Mirror)

Static mirror of **https://getartcraft.com/apps** and related pages, deployed to GitHub Pages.

**Live site**: https://craft-table.github.io/getartcraft-website/

## What this is

Static snapshot of the public-facing ArtCraft website (getartcraft.com), captured for archival purposes with `wget --mirror --convert-links --page-requisites`.

## Structure

```
/                          # repo root = served site root
  index.html               # mirror of getartcraft.com homepage
  apps.html                # mirror of getartcraft.com/apps (the apps landing page)
  apps/                    # per-app pages (photocraft.html, vectorcraft.html, ...)
  images/                  # app icons, screenshots, blog images
  videos/features/         # .webm demo clips
  _next/static/            # Next.js build assets (CSS/JS chunks, fonts, media)
  faq/                     # FAQ articles
  tutorials/               # Tutorial articles
  news/                    # News articles
  download.html
  pricing.html
  support.html
  press-kit.html
  app.getartcraft.com/     # the web-app React bundle (kept for reference, not used)
  .nojekyll                # disables Jekyll processing on GitHub Pages
  .github/workflows/       # CI workflow (test + deploy)
  scripts/test_website.py # HTML/link validation test runner
```

## Pages included

- `/apps` — landing page listing all Craft apps
- `/apps/{photocraft,vectorcraft,filmcraft,lightcraft,pdfcraft,effectcraft,designcraft}` — 7 live apps
- `/apps/{soundcraft,deckcraft,cadcraft,gridcraft,wordcraft}` — 5 "in development" apps
- `/`, `/pricing`, `/faq`, `/support`, `/tutorials`, `/news`, `/download`, `/press-kit`
- All referenced CSS, JS, fonts, images, and videos

## CI/CD

This repo includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml` that:

1. **Tests** every HTML file for parse errors and checks all internal links resolve to real local files (`scripts/test_website.py`).
2. **Deploys** the site to GitHub Pages on every push to `main`.

## How to view locally

```bash
# From the repo root:
python3 -m http.server 8080
# open http://localhost:8080/apps.html
```

## Notes

- This is a snapshot — links to `app.getartcraft.com/*` (the live AI generation tools) redirect to the live site because those routes require server-side rendering.
- All trademarks and content belong to ArtCraft Studios. This mirror is for backup purposes only.
