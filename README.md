# Omar Ahmed Sanad — Portfolio

A multi-page portfolio site built with plain HTML, CSS, and JavaScript — no build step, no framework.

## Structure

```
index.html                                 Home
about/index.html                           About (experience, education, skills, research interests)
projects/index.html                        Projects listing (filterable by category)
projects/<slug>/index.html                 Individual project case studies
youtube/index.html                         YouTube playlists (rendered from assets/data/playlists.json)
certificates/index.html                    Certificates (categorized, searchable, sortable, with preview modal)
publications/index.html                    Publications (empty state until real entries are added)
contact/index.html                         Contact page (mailto-based form)

partials/header.html, partials/footer.html Shared nav/footer, injected via assets/js/include.js
assets/css/tokens.css                      Design tokens (colors, spacing, type, radius, shadow)
assets/css/base.css                        Reset, typography, layout utilities, buttons
assets/css/components.css                  Header, footer, cards, timeline, tabs, modal, forms, etc.
assets/js/include.js                       Loads header/footer partials, mobile nav, active-link state
assets/js/reveal.js                        Scroll-reveal animation (IntersectionObserver)
assets/js/modal.js                         Accessible modal (used by Certificates page)
assets/js/main.js                          Page-specific logic (playlists, publications, filters, contact form)
assets/js/certificates.js                  Certificates page logic (render, search, filter, sort, modal)
assets/js/gallery.js                       Shop-drawing lightbox (used by project case studies with a drawing gallery)
assets/data/playlists.json                 YouTube playlist data — edit to add/update playlists
assets/data/publications.json              Publications data — currently empty ([])
assets/data/certificates.json              Certificate data — title, org, date, category, skills, pdfUrl
assets/certificates/                       Certificate PDF files
assets/resume/                             Resume PDF
assets/img/                                Profile photo
assets/img/projects/<slug>/                Gallery images for each project case study
```

## Important: every page uses `<base href="/omarsanad/">`

This lets every page reference shared assets and other pages with simple relative paths
(`assets/css/...`, `about/`, `projects/`) regardless of how deeply nested the current page is,
without a build step to compute relative paths per page.

**If you ever move this site to a different path** (e.g. a custom domain, or `username.github.io`
root instead of a project page), update the `<base href="...">` value in every page's `<head>` —
it's the one thing that must change for the whole path system to keep working.

## Running locally

Because pages load shared header/footer via `fetch()`, and use an absolute `<base href="/omarsanad/">`,
you must serve the site so it's reachable at a path ending in `/omarsanad/` — the same shape as GitHub
Pages. Opening `index.html` directly (`file://`) will not work.

```bash
mkdir -p /tmp/servedir
ln -s "$(pwd)" /tmp/servedir/omarsanad
cd /tmp/servedir
python3 -m http.server 8080
```

Then visit `http://localhost:8080/omarsanad/`.

## Adding content later

- **YouTube playlists**: edit `assets/data/playlists.json` — each entry's `url` is its real playlist link.
- **Publications**: edit `assets/data/publications.json` (currently `[]`). Add objects with
  `title`, `venue`, `year`, `abstract`, `pdfUrl`, `doi` — the page automatically switches from the
  empty state to rendering cards once the array is non-empty.
- **Certificates**: drop the PDF into `assets/certificates/`, add an entry to
  `assets/data/certificates.json` (title, org, orgShort, orgColor, date, category, description,
  skills, pdfUrl) — the page picks it up automatically. Leave `pdfUrl: null` for a placeholder card
  with disabled View/Download buttons until the file is ready.
- **Project galleries**: drop images into `assets/img/projects/<project-slug>/` (create the folder),
  then replace that case study's `.gallery-placeholder` div with an image grid referencing the files.
- **Shop drawing galleries**: see `projects/therba-medical-center/index.html` for the pattern —
  drawings are grouped into `.drawing-group` sections, each with a `.drawing-grid` of
  `.drawing-thumb` buttons (`data-src` + `data-label`). Include `assets/js/gallery.js` and the
  `#drawing-modal` lightbox markup on any page that uses this pattern.
- **New project case study**: copy an existing `projects/<slug>/index.html` as a template, add a
  matching card to `projects/index.html`, and add the URL to `sitemap.xml`.
- **Profile photo**: replace `assets/img/profile.jpg` (same filename, no other changes needed).

## Deploying

This is a static site — deploy as-is to GitHub Pages, Netlify, Vercel, or any static host. If deploying
somewhere other than `github.io/omarsanad/`, update `<base href>` in every page and the URLs in
`sitemap.xml` / `robots.txt`.
