# pixeldestrukt.com

Static site for the technical side of the practice — video, light and embedded
systems. Performance work lives separately at [bl1t.com](https://bl1t.com).

Hand-rolled HTML/CSS/JS with a small Markdown build step. **No dependencies** —
`node build.mjs` runs on a stock Node 18+ install, no `npm install` required.

## Commands

```bash
node build.mjs           # build once into dist/
node build.mjs --serve   # build, serve on :8080, rebuild on save
```

Or via npm scripts: `npm run build`, `npm run dev`.

## Layout

```
build.mjs            the whole build: content -> dist/
site.json            title, tagline, nav, footer links, contact
lib/markdown.mjs     Markdown -> HTML (no deps)
lib/highlight.mjs    build-time syntax highlighting (no deps)
content/
  posts/             blog posts -> /notes/<slug>/
  projects/          project pages -> /work/<slug>/
  pages/             standalone pages -> /<slug>/
  README.md          frontmatter reference for all three
src/
  templates/*.html   layout, {{token}} substitution
  assets/css|js|img  copied verbatim to /assets/
public/              copied to the site root (favicon.svg)
dist/                build output, gitignored
```

## Writing a post

Drop a Markdown file in `content/posts/` — see
[content/README.md](content/README.md) for the frontmatter fields. The notes
index, RSS feed, sitemap and tag filters all pick it up automatically.

Set `draft: true` to keep something out of the build entirely.

## What the build generates

- `/` homepage, `/notes/`, `/work/`, and a page per post, project and page
- `feed.xml` (RSS, latest 20 posts)
- `sitemap.xml` and `robots.txt`
- `404.html`

Syntax highlighting happens at build time, so code blocks render colored with
JavaScript disabled. The only client-side JS is tag filtering on the notes index
and copy buttons on code blocks — both progressive enhancements.

## Deploying

The output is a plain `dist/` directory; anything that serves static files works.

**GitHub Pages** is wired up: `.github/workflows/deploy.yml` builds on every
push to `main` and publishes `dist/`. One-time setup on the repo:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Settings → Pages → Custom domain:** `pixeldestrukt.com`, then tick
   *Enforce HTTPS* once the certificate is issued (takes a few minutes).
3. DNS at the registrar — apex `A` records to GitHub's four IPs, plus `www`:

   ```
   @    A      185.199.108.153
   @    A      185.199.109.153
   @    A      185.199.110.153
   @    A      185.199.111.153
   www  CNAME  pixeldestrukt.github.io.
   ```

`public/CNAME` is copied into `dist/` on every build, so the custom domain
survives redeploys.

Anywhere else works too — the output is a plain static directory:

- **Cloudflare Pages / Vercel / Netlify** — build command `node build.mjs`,
  output directory `dist`.
- **A server** — `rsync -a --delete dist/ user@host:/var/www/pixeldestrukt/`

Pretty URLs are directories with `index.html`, so no rewrite rules are needed.

## Before going live

- `site.json` — `hello@pixeldestrukt.com` is a placeholder; point it at a real
  mailbox.
- Add an Open Graph image and reference it in `src/templates/base.html` (the
  `twitter:card` meta is already `summary_large_image`).
