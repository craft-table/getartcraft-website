# getartcraft-website (Static Mirror)

Static mirror of **https://getartcraft.com/apps** and related pages, deployed to GitHub Pages.

**Live site**: https://craft-table.github.io/getartcraft-website/

## What this is

Static snapshot of the public-facing ArtCraft website (getartcraft.com), captured for archival purposes with `wget --mirror --convert-links --page-requisites`.

## Pages included

- `/apps` — landing page listing all Craft apps
- `/apps/{photocraft,vectorcraft,filmcraft,lightcraft,pdfcraft,effectcraft,designcraft}` — 7 live apps
- `/apps/{soundcraft,deckcraft,cadcraft,gridcraft,wordcraft}` — 5 "in development" apps
- `/`, `/pricing`, `/faq`, `/support`, `/tutorials`, `/news`, `/download`, `/press-kit`
- All referenced CSS, JS, fonts, images, and videos

## CI/CD

This repo includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml` that:

1. **Tests** every HTML file for parse errors and checks all internal links resolve to real local files (`scripts/test_website.py`).
2. **Deploys** the `getartcraft.com/` directory to GitHub Pages on every push to `main`.

Both jobs also run on `workflow_dispatch` (manual trigger).

## How to view locally

```bash
cd getartcraft.com
python3 -m http.server 8080
# open http://localhost:8080/apps.html
```

## How to re-mirror the source site

```bash
wget \
    --mirror \
    --convert-links \
    --adjust-extension \
    --page-requisites \
    --no-parent \
    --span-hosts \
    --domains=getartcraft.com,app.getartcraft.com \
    --user-agent="Mozilla/5.0" \
    -e robots=off \
    https://getartcraft.com/apps
```

Then run `python3 scripts/fix_links.py` (if present) to rewrite cross-domain relative paths back to absolute URLs.

## Notes

- This is a snapshot — links to `app.getartcraft.com/*` (the live AI generation tools) will redirect to the live site because those routes require server-side rendering.
- All trademarks and content belong to ArtCraft Studios. This mirror is for backup purposes only.
