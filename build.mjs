#!/usr/bin/env node
// Static site build for pixeldestrukt.com.
//
//   node build.mjs           build once into dist/
//   node build.mjs --serve   build, serve dist/ on :8080, rebuild on change
//
// No dependencies. Content is Markdown in content/, layout is HTML in
// src/templates/, assets are copied verbatim from src/assets/.

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { render, parseFrontmatter, stripMarkdown, escapeHtml, setHighlighter } from './lib/markdown.mjs';
import { highlight } from './lib/highlight.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const CONTENT = path.join(ROOT, 'content');
const OUT = path.join(ROOT, 'dist');

setHighlighter(highlight);

const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const rev = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');

// ------------------------------------------------------------------- helpers

const read = (p) => fs.readFileSync(p, 'utf8');
const tpl = (name) => read(path.join(SRC, 'templates', name));

function write(relPath, body) {
  const dest = path.join(OUT, relPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, body);
}

// Fill {{token}} placeholders. Missing tokens become empty strings so a
// template can carry optional slots.
function fill(template, vars) {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const value = vars[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

function listMarkdown(dir) {
  const full = path.join(CONTENT, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => {
      const raw = read(path.join(full, f));
      const { data, body } = parseFrontmatter(raw);
      return { file: f, slug: data.slug || f.replace(/\.md$/, ''), data, body };
    });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDate(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

const readingTime = (text) => Math.max(1, Math.round(stripMarkdown(text).split(/\s+/).length / 220));

const asList = (v) => (Array.isArray(v) ? v : v ? String(v).split(/\s*,\s*/).filter(Boolean) : []);

const tagSlug = (t) => t.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');

// ------------------------------------------------------------------ layout

function layout({ content, title, description, slug, bodyClass = '', ogType = 'website', ogTitle }) {
  const nav = site.nav
    .map((item) => {
      const active = slug === item.href || (item.href !== '/' && slug.startsWith(item.href));
      return `<a href="${item.href}"${active ? ' class="is-active" aria-current="page"' : ''}>${item.label}</a>`;
    })
    .join('\n      ');

  const footLinks = site.links
    .map(
      (l) =>
        `<li><a href="${l.href}"${/^https?:/.test(l.href) ? ' rel="noopener me"' : ''}>${l.label}</a>${
          l.note ? ` <span class="muted small">${l.note}</span>` : ''
        }</li>`
    )
    .join('\n        ');

  return fill(tpl('base.html'), {
    lang: site.lang,
    pageTitle: title ? `${title} — ${site.titleFull}` : `${site.titleFull} — ${site.tagline}`,
    siteTitle: site.title,
    description: escapeHtml(description || site.description),
    canonical: site.url + slug,
    ogType,
    ogTitle: escapeHtml(ogTitle || title || site.titleFull),
    bodyClass,
    nav,
    footLinks,
    content,
    tagline: escapeHtml(site.tagline),
    email: site.email,
    author: site.author,
    year: new Date().getFullYear(),
    rev,
  });
}

// ------------------------------------------------------------------ content

function loadPosts() {
  return listMarkdown('posts')
    .filter((p) => p.data.draft !== true)
    .map((p) => {
      const tags = asList(p.data.tags);
      const summary = p.data.summary || stripMarkdown(p.body).slice(0, 180).trim() + '…';
      return {
        ...p,
        url: `/notes/${p.slug}/`,
        title: p.data.title || p.slug,
        date: p.data.date || '1970-01-01',
        summary,
        tags,
        readingTime: readingTime(p.body),
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function loadProjects() {
  return listMarkdown('projects')
    .filter((p) => p.data.draft !== true)
    .map((p) => ({
      ...p,
      url: `/work/${p.slug}/`,
      title: p.data.title || p.slug,
      summary: p.data.summary || stripMarkdown(p.body).slice(0, 160).trim() + '…',
      status: p.data.status || 'ongoing',
      year: p.data.year || '',
      stack: asList(p.data.stack),
      featured: p.data.featured === true,
      order: Number(p.data.order ?? 999),
    }))
    .sort((a, b) => a.order - b.order || String(b.year).localeCompare(String(a.year)));
}

// -------------------------------------------------------------- HTML pieces

function postCard(post, { full = false } = {}) {
  const tags = post.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  return `<li class="post-item" data-tags="${post.tags.map(tagSlug).join(' ')}">
  <a class="post-link" href="${post.url}">
    <time class="post-date mono" datetime="${post.date}">${fmtDate(post.date)}</time>
    <span class="post-title">${escapeHtml(post.title)}</span>
    ${full ? `<span class="post-summary">${escapeHtml(post.summary)}</span>` : ''}
    <span class="post-tags">${tags}</span>
  </a>
</li>`;
}

function projectCard(project) {
  const stack = project.stack
    .slice(0, 5)
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join('');
  return `<li class="card">
  <a class="card-link" href="${project.url}">
    <p class="card-meta mono"><span class="status status-${tagSlug(project.status)}">${escapeHtml(
    project.status
  )}</span>${project.year ? `<span class="card-year">${escapeHtml(String(project.year))}</span>` : ''}</p>
    <h3 class="card-title">${escapeHtml(project.title)}</h3>
    <p class="card-summary">${escapeHtml(project.summary)}</p>
    ${stack ? `<ul class="stack plain">${stack}</ul>` : ''}
    <span class="card-cue mono">read &rarr;</span>
  </a>
</li>`;
}

// ------------------------------------------------------------------- pages

function buildHome(posts, projects) {
  const intro = fs.existsSync(path.join(CONTENT, 'pages', 'home.md'))
    ? render(parseFrontmatter(read(path.join(CONTENT, 'pages', 'home.md'))).body)
    : '';

  const featured = projects.filter((p) => p.featured);
  const content = fill(tpl('home.html'), {
    intro,
    featuredWork: (featured.length ? featured : projects).slice(0, 4).map(projectCard).join('\n'),
    recentPosts: posts.slice(0, 5).map((p) => postCard(p)).join('\n'),
  });

  write('index.html', layout({ content, slug: '/', bodyClass: 'home' }));
}

function buildNotes(posts) {
  const tags = [...new Set(posts.flatMap((p) => p.tags))].sort();
  const content = fill(tpl('notes-index.html'), {
    heading: 'Build logs and technical notes',
    blurb:
      'Working notes from live installations and the workshop: what broke, what fixed it, and the measurements behind the decision.',
    tagChips: tags
      .map((t) => `<button class="chip" type="button" data-tag="${tagSlug(t)}">${escapeHtml(t)}</button>`)
      .join('\n      '),
    posts: posts.map((p) => postCard(p, { full: true })).join('\n'),
  });

  write('notes/index.html', layout({
    content,
    title: 'Notes',
    description: 'Technical notes on realtime video, LED pixel mapping, projection and embedded systems.',
    slug: '/notes/',
  }));

  posts.forEach((post, idx) => {
    const headings = [];
    const body = render(post.body, headings);
    const newer = posts[idx - 1];
    const older = posts[idx + 1];

    const pager = [
      older
        ? `<a class="pager pager-prev" href="${older.url}"><span class="mono">&larr; older</span><span>${escapeHtml(
            older.title
          )}</span></a>`
        : '',
      newer
        ? `<a class="pager pager-next" href="${newer.url}"><span class="mono">newer &rarr;</span><span>${escapeHtml(
            newer.title
          )}</span></a>`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const content = fill(tpl('post.html'), {
      title: escapeHtml(post.title),
      summary: escapeHtml(post.summary),
      date: fmtDate(post.date),
      isoDate: post.date,
      readingTime: post.readingTime,
      tagList: post.tags.length
        ? ' · ' + post.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join(' ')
        : '',
      body,
      pager: pager ? `<nav class="pager-nav" aria-label="More notes">${pager}</nav>` : '',
    });

    write(`notes/${post.slug}/index.html`, layout({
      content,
      title: post.title,
      description: post.summary,
      slug: post.url,
      ogType: 'article',
      bodyClass: 'single',
    }));
  });
}

function buildWork(projects) {
  const content = fill(tpl('work-index.html'), {
    heading: 'Systems, tools and hardware',
    blurb:
      'Things I have designed, written or wired. Some ship as products, some exist to make one show work, some are still on the bench.',
    projects: projects.map(projectCard).join('\n'),
  });

  write('work/index.html', layout({
    content,
    title: 'Work',
    description: 'Custom software, LED and projection systems, and embedded hardware for live visuals.',
    slug: '/work/',
  }));

  for (const project of projects) {
    const specRows = [
      ['Status', project.status],
      ['Year', project.year],
      ['Stack', project.stack.join(', ')],
      ['Repo', project.data.repo ? `<a href="${project.data.repo}" rel="noopener">${escapeHtml(project.data.repo.replace(/^https?:\/\//, ''))}</a>` : ''],
    ].filter(([, v]) => v);

    const specs = `<dl class="specs">${specRows
      .map(
        ([k, v]) =>
          `<div class="spec"><dt class="mono">${k}</dt><dd>${k === 'Repo' ? v : escapeHtml(String(v))}</dd></div>`
      )
      .join('')}</dl>`;

    const content = fill(tpl('project.html'), {
      title: escapeHtml(project.title),
      summary: escapeHtml(project.summary),
      status: escapeHtml(project.status),
      specs,
      body: render(project.body),
    });

    write(`work/${project.slug}/index.html`, layout({
      content,
      title: project.title,
      description: project.summary,
      slug: project.url,
      ogType: 'article',
      bodyClass: 'single',
    }));
  }
}

function buildPages() {
  const pages = listMarkdown('pages').filter((p) => p.slug !== 'home');
  for (const page of pages) {
    const content = fill(tpl('page.html'), {
      eyebrow: escapeHtml(page.data.eyebrow || page.data.title || ''),
      title: escapeHtml(page.data.title || page.slug),
      body: render(page.body),
    });
    write(`${page.slug}/index.html`, layout({
      content,
      title: page.data.title || page.slug,
      description: page.data.summary || '',
      slug: `/${page.slug}/`,
      bodyClass: 'single',
    }));
  }
  return pages;
}

function buildFeed(posts) {
  const items = posts
    .slice(0, 20)
    .map((p) => {
      const link = site.url + p.url;
      return `  <item>
    <title>${escapeHtml(p.title)}</title>
    <link>${link}</link>
    <guid isPermaLink="true">${link}</guid>
    <pubDate>${new Date(`${p.date}T12:00:00Z`).toUTCString()}</pubDate>
    <description>${escapeHtml(p.summary)}</description>
${p.tags.map((t) => `    <category>${escapeHtml(t)}</category>`).join('\n')}
  </item>`;
    })
    .join('\n');

  write(
    'feed.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeHtml(site.titleFull)} — notes</title>
  <link>${site.url}/</link>
  <atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>${escapeHtml(site.description)}</description>
  <language>${site.lang}</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>
`
  );
}

function buildSitemap(urls) {
  write(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${site.url}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`
  );
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);
}

function copyAssets() {
  const from = path.join(SRC, 'assets');
  if (fs.existsSync(from)) fs.cpSync(from, path.join(OUT, 'assets'), { recursive: true });

  const publicDir = path.join(ROOT, 'public');
  if (fs.existsSync(publicDir)) fs.cpSync(publicDir, OUT, { recursive: true });
}

// -------------------------------------------------------------------- build

function build() {
  const started = Date.now();
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const posts = loadPosts();
  const projects = loadProjects();

  buildHome(posts, projects);
  buildNotes(posts);
  buildWork(projects);
  const pages = buildPages();
  buildFeed(posts);
  buildSitemap([
    { loc: '/' },
    { loc: '/notes/' },
    { loc: '/work/' },
    ...pages.map((p) => ({ loc: `/${p.slug}/` })),
    ...posts.map((p) => ({ loc: p.url, lastmod: p.date })),
    ...projects.map((p) => ({ loc: p.url })),
  ]);

  write('404.html', layout({ content: tpl('404.html'), title: 'Not found', slug: '/404.html' }));
  copyAssets();

  const count = posts.length + projects.length + pages.length + 4;
  console.log(
    `built ${count} pages · ${posts.length} notes · ${projects.length} projects · ${Date.now() - started}ms`
  );
}

// -------------------------------------------------------- dev server + watch

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
};

function serve(port = Number(process.env.PORT) || 8080) {
  http
    .createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      let file = path.join(OUT, url);
      if (!file.startsWith(OUT)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      if (!fs.existsSync(file)) {
        const fallback = path.join(OUT, '404.html');
        res.writeHead(404, { 'content-type': MIME['.html'] });
        res.end(fs.existsSync(fallback) ? fs.readFileSync(fallback) : 'not found');
        return;
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(fs.readFileSync(file));
    })
    .listen(port, () => console.log(`serving http://localhost:${port}`));

  let timer = null;
  for (const dir of [CONTENT, SRC, path.join(ROOT, 'site.json'), path.join(ROOT, 'lib')]) {
    if (!fs.existsSync(dir)) continue;
    fs.watch(dir, { recursive: fs.statSync(dir).isDirectory() }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          build();
        } catch (err) {
          console.error('build failed:', err.message);
        }
      }, 80);
    });
  }
}

build();
if (process.argv.includes('--serve')) serve();
