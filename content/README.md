# Content

Everything on the site is Markdown in this directory. Sample entries ship as
scaffolding — replace them with real work.

## Adding a note

Create `content/posts/YYYY-MM-DD-some-slug.md`:

```markdown
---
title: The post title
slug: some-slug          # optional; defaults to the filename minus the date
date: 2026-09-26         # required for correct ordering
summary: One or two sentences used on the index, in the feed and as the meta description.
tags: [LED, GLSL]        # optional
draft: true              # optional; drafts are skipped entirely
---

Body in Markdown.
```

It appears at `/notes/some-slug/`, on the notes index, in `feed.xml` and in the
sitemap. Nothing else needs editing.

## Adding a project

Create `content/projects/some-slug.md`:

```markdown
---
title: Project name
summary: What it is, in one sentence.
status: shipping         # shipping | ongoing | prototype | archived — drives the status dot color
year: 2026
order: 1                 # lower sorts first on the work index
featured: true           # show on the homepage
stack: [C++, GLSL, sACN]
repo: https://github.com/you/thing   # optional; renders in the spec table
---
```

## Adding a standalone page

Create `content/pages/some-slug.md` with `title` and optional `eyebrow` in the
frontmatter. It builds to `/some-slug/`. `content/pages/home.md` is special — it
is the homepage intro paragraph, not a page of its own.

## Markdown support

Headings, **bold**, *italic*, `inline code`, fenced code blocks with build-time
syntax highlighting (glsl, c/c++, js, python, sh, json, yaml, ini), links,
images, nested lists, blockquotes, tables, horizontal rules, and raw HTML blocks
for video embeds:

```markdown
<figure>
  <video src="/assets/img/clip.mp4" autoplay muted loop playsinline></video>
  <figcaption>Caption text.</figcaption>
</figure>
```

Images go in `src/assets/img/` and are referenced as `/assets/img/name.jpg`.
