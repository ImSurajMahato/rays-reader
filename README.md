# Secure Reader (RaysBook clone)

A static front-end that reproduces the RaysBook "Secure Reader" experience end to end,
calling the upstream APIs directly from the browser.

Built as the outcome of the security audit of `books.streamfiles.eu.org` (full report + key
recovery addendum shared with the owner).

## What it does
- Home: full book catalog (cover, badges, all chapters) straight from `books.php`
- Reader: per-page fetch from `page.php`, decrypts in the browser, renders with pdf.js
- Page count from `page_count.php`
- Jump-to-page, zoom, keyboard navigation, adjacent-page preload
- Zero backend, zero auth tokens used: every upstream call is unauthenticated (CORS: `*`)

## Endpoints used
- `GET /api/books.php?book_chapters=<chapter_id>`
- `GET /api/page_count.php?asset_ref=<ref>`
- `GET /api/page.php?asset_ref=<ref>&page=<n>`

## Deploy
Any static host. `index.html`, `style.css`, `app.js`.
