// Minimal, dependency-free Markdown renderer.
// Supports what a technical blog actually needs: ATX headings, fenced code
// blocks with language hints, tables, nested lists, blockquotes, hr, images,
// links, inline code, bold/italic/strike, footnote-free autolinks, and raw
// HTML block passthrough (for video embeds).

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ESCAPES[c]);

// Injectable so the build can add build-time syntax highlighting without the
// renderer depending on it.
let highlighter = escapeHtml;
export const setHighlighter = (fn) => {
  highlighter = fn || escapeHtml;
};

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

// ---------------------------------------------------------------- inline pass

function inline(src) {
  let out = '';
  let i = 0;
  const text = src;

  while (i < text.length) {
    const c = text[i];

    // Escaped character
    if (c === '\\' && i + 1 < text.length) {
      out += escapeHtml(text[i + 1]);
      i += 2;
      continue;
    }

    // Inline code: `code` / ``code with ` inside``
    if (c === '`') {
      let ticks = 0;
      while (text[i + ticks] === '`') ticks++;
      const fence = '`'.repeat(ticks);
      const end = text.indexOf(fence, i + ticks);
      if (end !== -1) {
        const code = text.slice(i + ticks, end).replace(/^ | $/g, '');
        out += `<code>${escapeHtml(code)}</code>`;
        i = end + ticks;
        continue;
      }
    }

    // Raw inline HTML tag — pass through untouched
    if (c === '<') {
      const m = /^<\/?[a-zA-Z][\w-]*(\s[^<>]*)?\/?>/.exec(text.slice(i));
      if (m) {
        out += m[0];
        i += m[0].length;
        continue;
      }
      // Autolink <https://...>
      const auto = /^<((?:https?:\/\/|mailto:)[^>\s]+)>/.exec(text.slice(i));
      if (auto) {
        const url = auto[1];
        out += `<a href="${escapeHtml(url)}">${escapeHtml(url.replace(/^mailto:/, ''))}</a>`;
        i += auto[0].length;
        continue;
      }
    }

    // Image: ![alt](src "title")
    if (c === '!' && text[i + 1] === '[') {
      const m = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/.exec(text.slice(i));
      if (m) {
        const [, alt, src, title] = m;
        out += `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${
          title ? ` title="${escapeHtml(title)}"` : ''
        } loading="lazy" decoding="async">`;
        i += m[0].length;
        continue;
      }
    }

    // Link: [text](href "title")
    if (c === '[') {
      const m = /^\[((?:[^\[\]]|\[[^\]]*\])*)\]\(([^)\s]*)(?:\s+"([^"]*)")?\)/.exec(text.slice(i));
      if (m) {
        const [, label, href, title] = m;
        const external = /^https?:\/\//.test(href);
        out +=
          `<a href="${escapeHtml(href)}"` +
          (title ? ` title="${escapeHtml(title)}"` : '') +
          (external ? ' rel="noopener"' : '') +
          `>${inline(label)}</a>`;
        i += m[0].length;
        continue;
      }
    }

    // Strong: ** or __
    if ((c === '*' || c === '_') && text[i + 1] === c) {
      const marker = c + c;
      const end = text.indexOf(marker, i + 2);
      if (end !== -1) {
        out += `<strong>${inline(text.slice(i + 2, end))}</strong>`;
        i = end + 2;
        continue;
      }
    }

    // Strikethrough: ~~
    if (c === '~' && text[i + 1] === '~') {
      const end = text.indexOf('~~', i + 2);
      if (end !== -1) {
        out += `<del>${inline(text.slice(i + 2, end))}</del>`;
        i = end + 2;
        continue;
      }
    }

    // Emphasis: * or _ (single)
    if (c === '*' || c === '_') {
      const end = text.indexOf(c, i + 1);
      if (end !== -1 && end > i + 1 && !/\s/.test(text[i + 1])) {
        out += `<em>${inline(text.slice(i + 1, end))}</em>`;
        i = end + 1;
        continue;
      }
    }

    out += ESCAPES[c] || c;
    i++;
  }

  return out;
}

// ----------------------------------------------------------------- block pass

const BLOCK_HTML = /^<(\/?)(?:div|section|figure|figcaption|iframe|video|audio|source|table|thead|tbody|tr|td|th|ul|ol|li|p|pre|details|summary|aside|canvas|svg|picture|blockquote|h[1-6]|hr|br)\b/i;

function listItemBody(lines, headings) {
  // A list item's content is Markdown, but a tight item (one line of text,
  // optionally followed by a nested block) should not gain a <p> wrapper.
  const trimmed = [...lines];
  while (trimmed.length && !trimmed[trimmed.length - 1].trim()) trimmed.pop();
  const joined = trimmed.join('\n');

  if (/\n\s*\n/.test(joined)) return render(joined, headings);

  // Find where the first nested block starts (list, fence, quote, heading).
  let split = trimmed.length;
  for (let n = 1; n < trimmed.length; n++) {
    if (/^\s*(?:[-*+]|\d+[.)])\s|^\s*(?:```|~~~|>|#{1,6}\s)/.test(trimmed[n])) {
      split = n;
      break;
    }
  }

  const lead = trimmed.slice(0, split).join('\n').trim();
  const rest = trimmed.slice(split);
  return inline(lead) + (rest.length ? '\n' + render(rest.join('\n'), headings) : '');
}

export function render(src, headings = []) {
  const lines = String(src).replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  let out = '';
  let i = 0;

  const peek = (n = 0) => lines[i + n];

  while (i < lines.length) {
    const line = lines[i];

    // Blank
    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code block
    const fence = /^(\s*)(`{3,}|~{3,})\s*([\w+#-]*)\s*$/.exec(line);
    if (fence) {
      const [, indent, ticks, lang] = fence;
      const closer = new RegExp(`^\\s*${ticks[0]}{${ticks.length},}\\s*$`);
      const body = [];
      i++;
      while (i < lines.length && !closer.test(lines[i])) {
        body.push(lines[i].startsWith(indent) ? lines[i].slice(indent.length) : lines[i]);
        i++;
      }
      i++; // consume closing fence
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      out += `<pre data-lang="${escapeHtml(lang || 'text')}"><code${cls}>${highlighter(
        body.join('\n'),
        lang
      )}\n</code></pre>\n`;
      continue;
    }

    // Horizontal rule
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      out += '<hr>\n';
      i++;
      continue;
    }

    // ATX heading
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) {
      const level = h[1].length;
      const html = inline(h[2]);
      const id = slugify(h[2]);
      if (level >= 2 && level <= 3) headings.push({ level, id, text: h[2] });
      out += `<h${level} id="${id}"><a class="anchor" href="#${id}">${html}</a></h${level}>\n`;
      i++;
      continue;
    }

    // Blockquote
    if (/^\s*>/.test(line)) {
      const body = [];
      while (i < lines.length && (/^\s*>/.test(lines[i]) || (body.length && lines[i].trim()))) {
        body.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out += `<blockquote>\n${render(body.join('\n'), headings)}</blockquote>\n`;
      continue;
    }

    // Table
    if (line.includes('|') && /^\s*\|?[\s:-]*-[\s:|-]*\|?\s*$/.test(peek(1) || '') && (peek(1) || '').includes('-')) {
      const splitRow = (r) =>
        r
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());
      const header = splitRow(line);
      const align = splitRow(lines[i + 1]).map((c) =>
        /^:-+:$/.test(c) ? 'center' : /-+:$/.test(c) ? 'right' : /^:-+/.test(c) ? 'left' : ''
      );
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      const cell = (tag, text, n) =>
        `<${tag}${align[n] ? ` style="text-align:${align[n]}"` : ''}>${inline(text || '')}</${tag}>`;
      out +=
        '<div class="table-wrap"><table>\n<thead><tr>' +
        header.map((c, n) => cell('th', c, n)).join('') +
        '</tr></thead>\n<tbody>\n' +
        rows.map((r) => '<tr>' + header.map((_, n) => cell('td', r[n], n)).join('') + '</tr>').join('\n') +
        '\n</tbody>\n</table></div>\n';
      continue;
    }

    // Lists (ordered + unordered, nested by indentation)
    const bullet = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (bullet) {
      const baseIndent = bullet[1].length;
      const ordered = /\d/.test(bullet[2]);
      const start = ordered ? parseInt(bullet[2], 10) : null;
      const items = [];
      let current = null;

      while (i < lines.length) {
        const l = lines[i];
        if (!l.trim()) {
          // Blank line: keep going only if the next line continues this list
          const next = lines[i + 1] || '';
          const marker = ordered ? '\\d+[.)]' : '[-*+]';
          const nextIsItem = new RegExp(`^\\s{${baseIndent},}(?:${marker})\\s`).test(next);
          const nextIsCont = new RegExp(`^\\s{${baseIndent + 1},}\\S`).test(next);
          if (!nextIsItem && !nextIsCont) break;
          if (current) current.push('');
          i++;
          continue;
        }
        const m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(l);
        if (m && m[1].length <= baseIndent) {
          if (m[1].length < baseIndent) break;
          if (/\d/.test(m[2]) !== ordered) break; // marker type change ends the list
          current = [m[3]];
          items.push(current);
          i++;
          continue;
        }
        if (current && /^\s/.test(l)) {
          current.push(l.slice(Math.min(baseIndent + 2, l.match(/^\s*/)[0].length)));
          i++;
          continue;
        }
        break;
      }

      const tag = ordered ? 'ol' : 'ul';
      const attr = ordered && start !== 1 ? ` start="${start}"` : '';
      out +=
        `<${tag}${attr}>\n` +
        items.map((it) => `<li>${listItemBody(it, headings)}</li>`).join('\n') +
        `\n</${tag}>\n`;
      continue;
    }

    // Raw HTML block — emit verbatim until a blank line
    if (BLOCK_HTML.test(line.trim())) {
      const body = [];
      while (i < lines.length && lines[i].trim()) {
        body.push(lines[i]);
        i++;
      }
      out += body.join('\n') + '\n';
      continue;
    }

    // Paragraph
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^\s*(?:#{1,6}\s|>|```|~~~|(?:[-*+]|\d+[.)])\s)/.test(lines[i]) && !BLOCK_HTML.test(lines[i].trim())) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length) {
      // Two trailing spaces = hard break
      out += `<p>${inline(para.join('\n')).replace(/ {2,}\n/g, '<br>\n')}</p>\n`;
    } else {
      i++;
    }
  }

  return out;
}

// -------------------------------------------------------------- frontmatter

export function parseFrontmatter(raw) {
  const text = String(raw).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  if (!text.startsWith('---\n')) return { data: {}, body: text };

  const end = text.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: text };

  const head = text.slice(4, end);
  const body = text.slice(text.indexOf('\n', end + 1) + 1);
  const data = {};

  for (const line of head.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    let [, key, value] = m;
    value = value.trim();

    if (/^\[.*\]$/.test(value)) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else if (/^(true|false)$/i.test(value)) {
      data[key] = value.toLowerCase() === 'true';
    } else {
      data[key] = value.replace(/^["']|["']$/g, '');
    }
  }

  return { data, body };
}

// Plain text, for excerpts and feed summaries.
export function stripMarkdown(src) {
  return String(src)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
