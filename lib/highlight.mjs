// Tiny build-time syntax highlighter. Tokenizes raw source and emits escaped
// HTML, so no client-side JS is needed to render a colored code block.
// Covers the languages this site actually publishes: GLSL/C/C++, JS, Python,
// shell, JSON, YAML, INI. Anything else falls back to plain escaped text.

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const KEYWORDS = {
  c: 'auto break case const continue default do else enum extern for goto if inline register restrict return sizeof static struct switch typedef union volatile while class namespace template public private protected virtual override new delete using this nullptr constexpr explicit friend operator',
  glsl: 'attribute break const continue discard do else false flat for if in inout layout noperspective out precision return smooth struct switch case true uniform varying void while buffer shared',
  js: 'async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield true false null undefined',
  py: 'and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield True False None self',
  sh: 'if then else elif fi for while do done case esac in function return local export source alias set unset trap exit read echo shift',
  yaml: 'true false null yes no on off',
};

const TYPES = {
  glsl: 'void bool int uint float double vec2 vec3 vec4 bvec2 bvec3 bvec4 ivec2 ivec3 ivec4 uvec2 uvec3 uvec4 mat2 mat3 mat4 mat2x2 mat2x3 mat2x4 mat3x2 mat3x3 mat3x4 mat4x2 mat4x3 mat4x4 sampler1D sampler2D sampler3D samplerCube sampler2DRect image2D',
  c: 'void bool char short int long float double signed unsigned size_t ssize_t uint8_t uint16_t uint32_t uint64_t int8_t int16_t int32_t int64_t FILE',
};

const ALIASES = {
  glsl: 'glsl', frag: 'glsl', vert: 'glsl', shader: 'glsl', isf: 'glsl',
  c: 'c', h: 'c', cpp: 'c', 'c++': 'c', cc: 'c', hpp: 'c', ino: 'c', arduino: 'c', rust: 'c',
  js: 'js', javascript: 'js', mjs: 'js', ts: 'js', typescript: 'js', jsx: 'js', tsx: 'js', json: 'json',
  py: 'py', python: 'py',
  sh: 'sh', bash: 'sh', zsh: 'sh', shell: 'sh', console: 'sh',
  yaml: 'yaml', yml: 'yaml', toml: 'ini', ini: 'ini', conf: 'ini',
};

const set = (words) => new Set((words || '').split(/\s+/).filter(Boolean));

function rulesFor(lang) {
  const kw = set(KEYWORDS[lang]);
  const ty = set(TYPES[lang]);

  const comment =
    lang === 'py' || lang === 'sh' || lang === 'yaml' || lang === 'ini'
      ? /#[^\n]*/
      : /\/\/[^\n]*|\/\*[\s\S]*?\*\//;

  const strings =
    lang === 'py'
      ? /"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/
      : /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/;

  return { kw, ty, comment, strings };
}

export function highlight(code, langHint) {
  const lang = ALIASES[String(langHint || '').toLowerCase()];
  if (!lang) return esc(code);

  const { kw, ty, comment, strings } = rulesFor(lang);
  const pattern = new RegExp(
    [
      `(?<comment>${comment.source})`,
      `(?<string>${strings.source})`,
      String.raw`(?<meta>^\s*#\s*(?:include|define|pragma|version|ifdef|ifndef|endif|else|if)\b[^\n]*)`,
      String.raw`(?<key>^\s*[A-Za-z_][\w.-]*(?=\s*[:=]))`,
      String.raw`(?<num>\b(?:0[xX][0-9a-fA-F]+|\d+\.?\d*(?:[eE][-+]?\d+)?[fFuUlL]*|\.\d+[fF]?)\b)`,
      String.raw`(?<fn>\b[A-Za-z_]\w*(?=\s*\())`,
      String.raw`(?<word>\b[A-Za-z_]\w*\b)`,
    ].join('|'),
    'gm'
  );

  let out = '';
  let last = 0;

  for (const m of code.matchAll(pattern)) {
    out += esc(code.slice(last, m.index));
    last = m.index + m[0].length;
    const g = m.groups;
    const raw = esc(m[0]);

    if (g.comment) out += `<span class="tok-com">${raw}</span>`;
    else if (g.string) out += `<span class="tok-str">${raw}</span>`;
    else if (g.meta) out += `<span class="tok-meta">${raw}</span>`;
    else if (g.key && (lang === 'yaml' || lang === 'ini' || lang === 'json')) out += `<span class="tok-key">${raw}</span>`;
    else if (g.num) out += `<span class="tok-num">${raw}</span>`;
    else if (g.fn) {
      out += kw.has(m[0])
        ? `<span class="tok-kw">${raw}</span>`
        : `<span class="tok-fn">${raw}</span>`;
    } else if (g.word || g.key) {
      if (kw.has(m[0])) out += `<span class="tok-kw">${raw}</span>`;
      else if (ty.has(m[0])) out += `<span class="tok-type">${raw}</span>`;
      else out += raw;
    } else out += raw;
  }

  out += esc(code.slice(last));
  return out;
}
