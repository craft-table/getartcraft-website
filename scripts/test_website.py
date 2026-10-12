#!/usr/bin/env python3
"""
Test script for the getartcraft-website mirror.

Checks:
  1. All HTML files in getartcraft.com/ are non-empty and parseable.
  2. Internal links (href/src that are relative or point to getartcraft.com paths)
     resolve to existing local files.
  3. CSS/JS/font/image references that exist in HTML resolve to real files.

Exits 1 if any test fails. Prints a summary.
"""
import os, sys, re, html
from pathlib import Path
from html.parser import HTMLParser

# Path-overridable so the same script works locally AND in CI.
# In CI the repo is at the workspace root, and this script lives at
# <repo>/scripts/test_website.py — so parent.parent == repo root.
# Set SITE_ROOT env var to override.
SCRIPT_PATH = Path(__file__).resolve()
DEFAULT_ROOT = SCRIPT_PATH.parent.parent  # CI: <repo>/. Local fallback below.
ROOT = Path(os.environ.get("SITE_ROOT", str(DEFAULT_ROOT)))
SITE_ROOT = ROOT / "getartcraft.com"
# Local fallback when run from /home/z/my-project/scripts/ — point to the actual mirror
if not SITE_ROOT.exists() and Path("/home/z/my-project/repos/getartcraft-website/getartcraft.com").exists():
    SITE_ROOT = Path("/home/z/my-project/repos/getartcraft-website/getartcraft.com")

errors = []
warnings = []
stats = {"html_files": 0, "links_checked": 0, "broken_links": 0, "missing_assets": 0}

# Collect all file paths in the site dir for fast lookup
all_files = {str(p.relative_to(SITE_ROOT)) for p in SITE_ROOT.rglob("*") if p.is_file()}
all_files_lower = {f.lower(): f for f in all_files}


class LinkExtractor(HTMLParser):
    """Extract every href= and src= attribute."""
    def __init__(self):
        super().__init__()
        self.links = []  # list of (tag, attr, value)

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in ("href", "src"):
                self.links.append((tag, name, value))


def normalize_link(href: str) -> str | None:
    """Return the local path a link points to, or None if external/special."""
    if not href:
        return None
    # Strip fragment
    href = href.split("#")[0]
    if not href:
        return None
    # Skip external URLs
    if href.startswith(("http://", "https://", "//", "mailto:", "tel:", "data:", "javascript:")):
        return None
    # Skip absolute URLs that point to the site itself (e.g. /apps)
    if href.startswith("/"):
        href = href.lstrip("/")
    # Strip query string
    href = href.split("?")[0]
    return href


def check_link_exists(local_path: str, source_html: Path) -> bool:
    """Check whether `local_path` resolves to a real file relative to source_html."""
    if not local_path:
        return True
    # Try direct relative
    candidate = (source_html.parent / local_path).resolve()
    try:
        rel = candidate.relative_to(SITE_ROOT.resolve())
        rel_str = str(rel)
    except ValueError:
        return False
    if rel_str in all_files:
        return True
    # Try case-insensitive (some links may be mismatched)
    if rel_str.lower() in all_files_lower:
        return True
    # wget --adjust-extension may have added .html
    if not local_path.endswith(("/", ".html", ".htm", ".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".webm", ".mp4", ".woff", ".woff2", ".ttf", ".ico")):
        # Try with .html appended (Next.js pretty URLs)
        candidate_html = rel_str + ".html"
        if candidate_html in all_files or candidate_html.lower() in all_files_lower:
            return True
        candidate_html2 = rel_str.rstrip("/") + ".html"
        if candidate_html2 in all_files or candidate_html2.lower() in all_files_lower:
            return True
    return False


def main():
    if not SITE_ROOT.exists():
        print(f"FAIL: site root not found at {SITE_ROOT}")
        sys.exit(1)

    html_files = sorted(SITE_ROOT.rglob("*.html"))
    print(f"Found {len(html_files)} HTML files")

    if len(html_files) == 0:
        print("FAIL: no HTML files found in getartcraft.com/")
        sys.exit(1)

    for html_file in html_files:
        stats["html_files"] += 1
        rel_path = html_file.relative_to(SITE_ROOT)
        size = html_file.stat().st_size
        if size < 100:
            errors.append(f"{rel_path}: HTML file is suspiciously small ({size} bytes)")
            continue
        try:
            content = html_file.read_text(encoding="utf-8", errors="strict")
        except UnicodeDecodeError as e:
            errors.append(f"{rel_path}: not valid UTF-8 ({e})")
            continue
        # Parse and extract links
        parser = LinkExtractor()
        try:
            parser.feed(content)
        except Exception as e:
            errors.append(f"{rel_path}: HTML parse error: {e}")
            continue
        for tag, attr, value in parser.links:
            local = normalize_link(value)
            if local is None:
                continue  # external or special
            stats["links_checked"] += 1
            if not check_link_exists(local, html_file):
                stats["broken_links"] += 1
                errors.append(f"{rel_path}: broken {attr}='{value}' -> '{local}' does not exist")

    # Print summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    print(f"  HTML files tested:    {stats['html_files']}")
    print(f"  Links checked:        {stats['links_checked']}")
    print(f"  Broken links:         {stats['broken_links']}")
    print(f"  Errors:               {len(errors)}")

    if errors:
        print("\n--- First 20 errors ---")
        for e in errors[:20]:
            print(f"  - {e}")
        if len(errors) > 20:
            print(f"  ... and {len(errors)-20} more")
        print(f"\nRESULT: FAIL ({len(errors)} errors)")
        sys.exit(1)
    else:
        print(f"\nRESULT: PASS ✓ (all internal links resolve)")
        sys.exit(0)


if __name__ == "__main__":
    main()
