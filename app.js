// app.js — DevToolbox UI shell. Zero dependencies, ES modules only.
import * as T from './tools.js';

/* ---------- tiny DOM helper ---------- */
function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null) node.append(kid.nodeType ? kid : document.createTextNode(kid));
  return node;
}

function copyButton(getText) {
  const btn = el('button', { class: 'btn copy', onclick: async () => {
    try {
      await navigator.clipboard.writeText(getText());
      const old = btn.textContent;
      btn.textContent = '✓ Copied';
      btn.classList.add('ok');
      setTimeout(() => { btn.textContent = old; btn.classList.remove('ok'); }, 1200);
    } catch { btn.textContent = 'Copy failed'; }
  } }, 'Copy');
  return btn;
}

// Standard "input -> actions -> output" scaffold most tools reuse.
function playground({ placeholder = 'Paste here…', actions = [], mono = true, rows = 8 }) {
  const input = el('textarea', { class: 'field' + (mono ? ' mono' : ''), rows, placeholder, spellcheck: 'false' });
  const output = el('pre', { class: 'output mono', tabindex: '0' });
  const err = el('div', { class: 'error', role: 'alert' });
  const setOut = (text) => { err.textContent = ''; output.textContent = text; };
  const setErr = (msg) => { output.textContent = ''; err.textContent = '⚠ ' + msg; };
  const bar = el('div', { class: 'actions' },
    ...actions.map(({ label, run, primary }) =>
      el('button', { class: 'btn' + (primary ? ' primary' : ''), onclick: () => {
        try { run(input.value, setOut); } catch (e) { setErr(e.message); }
      } }, label)
    ),
    copyButton(() => output.textContent)
  );
  return el('div', {}, input, bar, err, el('div', { class: 'out-wrap' }, output));
}

/* ---------- tools ---------- */
const TOOLS = [
  { id: 'json', name: 'JSON Formatter', icon: '{ }', desc: 'Pretty-print, validate & minify JSON',
    render: () => playground({ placeholder: '{"hello":"world"}', actions: [
      { label: 'Format', primary: true, run: (v, out) => out(T.formatJSON(v, 2)) },
      { label: 'Minify', run: (v, out) => out(T.minifyJSON(v)) },
    ] }) },

  { id: 'jwt', name: 'JWT Decoder', icon: '🔑', desc: 'Inspect a token’s header & claims (no verify)',
    render: () => playground({ rows: 4, placeholder: 'eyJhbGciOi…', actions: [
      { label: 'Decode', primary: true, run: (v, out) => {
        const r = T.decodeJWT(v);
        out(`HEADER\n${JSON.stringify(r.header, null, 2)}\n\nPAYLOAD\n${JSON.stringify(r.payload, null, 2)}` +
          (r.notes.length ? `\n\n${r.notes.join('\n')}` : ''));
      } },
    ] }) },

  { id: 'base64', name: 'Base64', icon: '🔁', desc: 'Encode & decode Base64 (UTF-8 safe)',
    render: () => playground({ placeholder: 'Text or Base64…', actions: [
      { label: 'Encode', primary: true, run: (v, out) => out(T.base64Encode(v)) },
      { label: 'Decode', run: (v, out) => out(T.base64Decode(v)) },
    ] }) },

  { id: 'url', name: 'URL Encode', icon: '%', desc: 'Percent-encode & decode URL components',
    render: () => playground({ rows: 4, placeholder: 'https://example.com/a b?x=1', actions: [
      { label: 'Encode', primary: true, run: (v, out) => out(T.urlEncode(v)) },
      { label: 'Decode', run: (v, out) => out(T.urlDecode(v)) },
    ] }) },

  { id: 'ts', name: 'JSON → TypeScript', icon: 'TS', desc: 'Generate TypeScript interfaces from JSON',
    render: () => playground({ placeholder: '{"id":1,"user":{"name":"Ada"}}', actions: [
      { label: 'Generate', primary: true, run: (v, out) => out(T.jsonToTypeScript(v, 'Root')) },
    ] }) },

  { id: 'hash', name: 'Hash', icon: '#', desc: 'SHA-1 / 256 / 384 / 512 via Web Crypto',
    render: () => {
      const input = el('textarea', { class: 'field mono', rows: 6, placeholder: 'Text to hash…', spellcheck: 'false' });
      const output = el('pre', { class: 'output mono' });
      const err = el('div', { class: 'error' });
      const run = async (algo) => {
        try { err.textContent = ''; output.textContent = await T.hash(algo, input.value); }
        catch (e) { err.textContent = '⚠ ' + e.message; }
      };
      const bar = el('div', { class: 'actions' },
        ...['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'].map((a, i) =>
          el('button', { class: 'btn' + (i === 1 ? ' primary' : ''), onclick: () => run(a) }, a)),
        copyButton(() => output.textContent));
      return el('div', {}, input, bar, err, el('div', { class: 'out-wrap' }, output));
    } },

  { id: 'uuid', name: 'UUID Generator', icon: '🆔', desc: 'Generate v4 UUIDs',
    render: () => {
      const count = el('input', { class: 'field inline', type: 'number', min: '1', max: '100', value: '5' });
      const output = el('pre', { class: 'output mono' });
      const gen = () => { output.textContent = Array.from({ length: Math.max(1, Math.min(100, +count.value || 1)) }, T.uuidv4).join('\n'); };
      const bar = el('div', { class: 'actions' },
        el('label', { class: 'lbl' }, 'How many ', count),
        el('button', { class: 'btn primary', onclick: gen }, 'Generate'),
        copyButton(() => output.textContent));
      gen();
      return el('div', {}, bar, el('div', { class: 'out-wrap' }, output));
    } },

  { id: 'time', name: 'Timestamp', icon: '⏱', desc: 'Convert Unix epoch ↔ human date',
    render: () => {
      const input = el('input', { class: 'field', placeholder: '1700000000  or  2026-01-01T00:00:00Z' });
      const output = el('pre', { class: 'output mono' });
      const err = el('div', { class: 'error' });
      const show = (fn) => { try { err.textContent = ''; output.textContent = fn(); } catch (e) { err.textContent = '⚠ ' + e.message; } };
      const bar = el('div', { class: 'actions' },
        el('button', { class: 'btn primary', onclick: () => show(() => {
          const r = T.epochToDate(input.value.trim()); return `ISO:   ${r.iso}\nUTC:   ${r.utc}\nLocal: ${r.local}`;
        }) }, 'Epoch → Date'),
        el('button', { class: 'btn', onclick: () => show(() => {
          const r = T.dateToEpoch(input.value.trim()); return `seconds: ${r.seconds}\nmillis:  ${r.millis}`;
        }) }, 'Date → Epoch'),
        el('button', { class: 'btn', onclick: () => { input.value = ''; show(() => { const r = T.dateToEpoch(); return `now (s): ${r.seconds}\nnow (ms): ${r.millis}`; }); } }, 'Now'),
        copyButton(() => output.textContent));
      return el('div', {}, input, bar, err, el('div', { class: 'out-wrap' }, output));
    } },

  { id: 'color', name: 'Colour + Contrast', icon: '🎨', desc: 'HEX ↔ RGB ↔ HSL with WCAG contrast',
    render: () => {
      const input = el('input', { class: 'field', value: '#4f46e5' });
      const swatch = el('div', { class: 'swatch' });
      const output = el('pre', { class: 'output mono' });
      const err = el('div', { class: 'error' });
      const update = () => {
        try {
          err.textContent = '';
          const rgb = T.hexToRgb(input.value);
          const hex = T.rgbToHex(rgb.r, rgb.g, rgb.b);
          const hsl = T.rgbToHsl(rgb.r, rgb.g, rgb.b);
          swatch.style.background = hex;
          const onWhite = T.contrastRatio(rgb, { r: 255, g: 255, b: 255 });
          const onBlack = T.contrastRatio(rgb, { r: 0, g: 0, b: 0 });
          const grade = (c) => (c >= 7 ? 'AAA' : c >= 4.5 ? 'AA' : c >= 3 ? 'AA Large' : 'Fail');
          output.textContent =
            `HEX  ${hex}\nRGB  rgb(${rgb.r}, ${rgb.g}, ${rgb.b})\nHSL  hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)\n\n` +
            `Contrast vs white: ${onWhite}:1  (${grade(onWhite)})\nContrast vs black: ${onBlack}:1  (${grade(onBlack)})`;
        } catch (e) { err.textContent = '⚠ ' + e.message; }
      };
      input.addEventListener('input', update);
      const bar = el('div', { class: 'actions' }, el('label', { class: 'lbl' }, 'Colour ', input), swatch, copyButton(() => output.textContent));
      update();
      return el('div', {}, bar, err, el('div', { class: 'out-wrap' }, output));
    } },

  { id: 'case', name: 'Case Converter', icon: 'Aa', desc: 'camelCase, snake_case, kebab-case & more',
    render: () => {
      const input = el('textarea', { class: 'field', rows: 3, placeholder: 'hello world example' });
      const output = el('pre', { class: 'output mono' });
      const run = () => { const r = T.convertCase(input.value); output.textContent = Object.entries(r).map(([k, v]) => `${k.padEnd(16)} ${v}`).join('\n'); };
      input.addEventListener('input', run);
      return el('div', {}, input, el('div', { class: 'actions' }, el('button', { class: 'btn primary', onclick: run }, 'Convert'), copyButton(() => output.textContent)), el('div', { class: 'out-wrap' }, output));
    } },

  { id: 'cron', name: 'Cron Explainer', icon: '🗓', desc: 'Translate a cron expression to English',
    render: () => {
      const input = el('input', { class: 'field mono', value: '*/15 9 * * 1-5', placeholder: '*/15 9 * * 1-5' });
      const output = el('pre', { class: 'output' });
      const err = el('div', { class: 'error' });
      const run = () => { try { err.textContent = ''; output.textContent = T.explainCron(input.value); } catch (e) { err.textContent = '⚠ ' + e.message; } };
      input.addEventListener('input', run);
      run();
      return el('div', {}, input, el('div', { class: 'actions' }, el('button', { class: 'btn primary', onclick: run }, 'Explain'), copyButton(() => output.textContent)), err, el('div', { class: 'out-wrap' }, output));
    } },

  { id: 'lorem', name: 'Lorem Ipsum', icon: '¶', desc: 'Generate placeholder text',
    render: () => {
      const count = el('input', { class: 'field inline', type: 'number', min: '1', max: '50', value: '3' });
      const unit = el('select', { class: 'field inline' }, el('option', { value: 'paragraphs' }, 'paragraphs'), el('option', { value: 'sentences' }, 'sentences'), el('option', { value: 'words' }, 'words'));
      const output = el('pre', { class: 'output' });
      const gen = () => { output.textContent = T.lorem(count.value, unit.value); };
      const bar = el('div', { class: 'actions' }, el('label', { class: 'lbl' }, count, ' ', unit), el('button', { class: 'btn primary', onclick: gen }, 'Generate'), copyButton(() => output.textContent));
      gen();
      return el('div', {}, bar, el('div', { class: 'out-wrap' }, output));
    } },
];

/* ---------- router / shell ---------- */
const navList = document.getElementById('nav');
const toolRoot = document.getElementById('tool-root');
const toolTitle = document.getElementById('tool-title');
const toolDesc = document.getElementById('tool-desc');

function openTool(id, push = true) {
  const tool = TOOLS.find((t) => t.id === id) || TOOLS[0];
  toolTitle.textContent = tool.name;
  toolDesc.textContent = tool.desc;
  toolRoot.replaceChildren(tool.render());
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.id === tool.id));
  if (push) history.replaceState({}, '', '#' + tool.id);
  document.querySelector('.sidebar')?.classList.remove('open');
}

for (const tool of TOOLS) {
  navList.append(el('button', { class: 'nav-item', 'data-id': tool.id, onclick: () => openTool(tool.id) },
    el('span', { class: 'nav-icon' }, tool.icon), el('span', {}, tool.name)));
}

/* sidebar filter */
document.getElementById('filter').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('.nav-item').forEach((n) => {
    const t = TOOLS.find((x) => x.id === n.dataset.id);
    n.style.display = (t.name + ' ' + t.desc).toLowerCase().includes(q) ? '' : 'none';
  });
});

/* theme */
const themeBtn = document.getElementById('theme');
function applyTheme(mode) {
  document.documentElement.dataset.theme = mode;
  themeBtn.textContent = mode === 'dark' ? '☀' : '☾';
  try { localStorage.setItem('dt-theme', mode); } catch {}
}
themeBtn.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
try { applyTheme(localStorage.getItem('dt-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')); }
catch { applyTheme('dark'); }

/* command palette (⌘/Ctrl-K) */
const palette = document.getElementById('palette');
const paletteInput = document.getElementById('palette-input');
const paletteList = document.getElementById('palette-list');
function renderPalette(q = '') {
  paletteList.replaceChildren();
  TOOLS.filter((t) => (t.name + ' ' + t.desc).toLowerCase().includes(q.toLowerCase())).forEach((t, i) => {
    paletteList.append(el('button', { class: 'palette-item' + (i === 0 ? ' active' : ''), 'data-id': t.id,
      onclick: () => { closePalette(); openTool(t.id); } },
      el('span', { class: 'nav-icon' }, t.icon), el('span', {}, el('strong', {}, t.name), el('small', {}, ' — ' + t.desc))));
  });
}
function openPalette() { palette.classList.add('show'); paletteInput.value = ''; renderPalette(); paletteInput.focus(); }
function closePalette() { palette.classList.remove('show'); }
paletteInput.addEventListener('input', (e) => renderPalette(e.target.value));
paletteInput.addEventListener('keydown', (e) => {
  const items = [...paletteList.querySelectorAll('.palette-item')];
  let idx = items.findIndex((i) => i.classList.contains('active'));
  if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(items.length - 1, idx + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(0, idx - 1); }
  else if (e.key === 'Enter') { e.preventDefault(); items[idx]?.click(); return; }
  else return;
  items.forEach((it, i) => it.classList.toggle('active', i === idx));
  items[idx]?.scrollIntoView({ block: 'nearest' });
});
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.classList.contains('show') ? closePalette() : openPalette(); }
  else if (e.key === 'Escape') closePalette();
});
palette.addEventListener('click', (e) => { if (e.target === palette) closePalette(); });
document.getElementById('palette-open').addEventListener('click', openPalette);
document.getElementById('menu').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));

openTool(location.hash.slice(1) || TOOLS[0].id, false);

/* offline PWA */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
