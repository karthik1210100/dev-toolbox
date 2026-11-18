// tools.js — pure, dependency-free helpers for every DevToolbox utility.
// Everything here runs entirely in the browser. No network, no tracking.

/* ---------- JSON ---------- */
export function formatJSON(input, indent = 2) {
  const parsed = JSON.parse(input);
  return JSON.stringify(parsed, null, indent);
}
export function minifyJSON(input) {
  return JSON.stringify(JSON.parse(input));
}

/* ---------- Base64 (UTF-8 safe) ---------- */
export function base64Encode(str) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(str)));
}
export function base64Decode(str) {
  const bytes = Uint8Array.from(atob(str.trim()), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/* ---------- URL ---------- */
export const urlEncode = (s) => encodeURIComponent(s);
export const urlDecode = (s) => decodeURIComponent(s);

/* ---------- JWT (decode only — never verifies a signature) ---------- */
export function decodeJWT(token) {
  const parts = token.trim().split('.');
  if (parts.length !== 3) throw new Error('A JWT has three dot-separated parts.');
  const decodePart = (p) => JSON.parse(base64Decode(p.replace(/-/g, '+').replace(/_/g, '/')));
  const header = decodePart(parts[0]);
  const payload = decodePart(parts[1]);
  const notes = [];
  if (payload.exp) {
    const d = new Date(payload.exp * 1000);
    notes.push(`exp: ${d.toUTCString()} (${d > new Date() ? 'valid' : 'EXPIRED'})`);
  }
  if (payload.iat) notes.push(`iat: ${new Date(payload.iat * 1000).toUTCString()}`);
  return { header, payload, signature: parts[2], notes };
}

/* ---------- UUID v4 ---------- */
export function uuidv4() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0'));
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10).join('')}`;
}

/* ---------- Unix timestamp ---------- */
export function epochToDate(epoch) {
  const n = Number(epoch);
  const ms = String(epoch).trim().length > 10 ? n : n * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) throw new Error('Not a valid epoch.');
  return { iso: d.toISOString(), utc: d.toUTCString(), local: d.toString() };
}
export function dateToEpoch(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) throw new Error('Not a valid date.');
  return { seconds: Math.floor(d.getTime() / 1000), millis: d.getTime() };
}

/* ---------- Hashing (Web Crypto) ---------- */
export async function hash(algo, text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest(algo, data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- Colour ---------- */
export function hexToRgb(hex) {
  const m = hex.trim().replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error('Enter a hex colour like #4f46e5.');
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
}
export const rgbToHex = (r, g, b) =>
  '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
function luminance({ r, g, b }) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}
export function contrastRatio(rgb1, rgb2) {
  const l1 = luminance(rgb1), l2 = luminance(rgb2);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return Math.round(ratio * 100) / 100;
}

/* ---------- Case converter ---------- */
function words(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}
export function convertCase(str) {
  const w = words(str);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  return {
    camelCase: w.map((x, i) => (i ? cap(x) : x)).join(''),
    PascalCase: w.map(cap).join(''),
    snake_case: w.join('_'),
    'kebab-case': w.join('-'),
    CONSTANT_CASE: w.join('_').toUpperCase(),
    'Title Case': w.map(cap).join(' '),
    'sentence case': w.length ? cap(w.join(' ')) : '',
  };
}

/* ---------- Lorem ipsum ---------- */
const LOREM = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor ' +
  'incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ' +
  'ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate').split(' ');
function sentence() {
  const len = 8 + Math.floor(Math.random() * 10);
  const s = Array.from({ length: len }, () => LOREM[Math.floor(Math.random() * LOREM.length)]);
  s[0] = s[0].charAt(0).toUpperCase() + s[0].slice(1);
  return s.join(' ') + '.';
}
export function lorem(count, unit) {
  count = Math.max(1, Math.min(50, Number(count) || 1));
  if (unit === 'words') return Array.from({ length: count }, () => LOREM[Math.floor(Math.random() * LOREM.length)]).join(' ');
  if (unit === 'sentences') return Array.from({ length: count }, sentence).join(' ');
  return Array.from({ length: count }, () =>
    Array.from({ length: 3 + Math.floor(Math.random() * 3) }, sentence).join(' ')
  ).join('\n\n');
}

/* ---------- JSON -> TypeScript interfaces ---------- */
export function jsonToTypeScript(input, rootName = 'Root') {
  const parsed = typeof input === 'string' ? JSON.parse(input) : input;
  const out = [];
  const seen = new Set();
  const pascal = (s) => s.replace(/(^|[_\-\s])(\w)/g, (_, __, c) => c.toUpperCase()).replace(/[^A-Za-z0-9]/g, '') || 'Item';
  function typeOf(value, keyHint) {
    if (value === null) return 'null';
    if (Array.isArray(value)) {
      if (!value.length) return 'unknown[]';
      return typeOf(value[0], keyHint.replace(/s$/, '')) + '[]';
    }
    if (typeof value === 'object') {
      const name = pascal(keyHint);
      build(name, value);
      return name;
    }
    return typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string';
  }
  function build(name, obj) {
    if (seen.has(name)) return;
    seen.add(name);
    const lines = [`export interface ${name} {`];
    for (const [k, v] of Object.entries(obj)) {
      const safe = /^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`;
      lines.push(`  ${safe}: ${typeOf(v, k)};`);
    }
    lines.push('}');
    out.push(lines.join('\n'));
  }
  if (Array.isArray(parsed)) build(pascal(rootName), parsed[0] || {});
  else build(pascal(rootName), parsed);
  return out.reverse().join('\n\n');
}

/* ---------- Cron explainer (5-field) ---------- */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Translate one cron field (which may contain lists/ranges/steps) into a phrase.
function describeField(field, kind) {
  if (field === '*' || field === '?') return null;
  const label = (v) => {
    if (kind === 'month') return MONTHS[Number(v) - 1] || v;
    if (kind === 'dow') return DAYS[Number(v) % 7] || v;
    return v;
  };
  const part = (p) => {
    if (p.startsWith('*/')) return `every ${p.slice(2)}`;
    if (p.includes('-')) { const [a, b] = p.split('-'); return `${label(a)}–${label(b)}`; }
    return label(p);
  };
  return field.split(',').map(part).join(', ');
}

export function explainCron(expr) {
  const f = expr.trim().split(/\s+/);
  if (f.length !== 5) throw new Error('Use the standard 5 fields: minute hour day-of-month month day-of-week.');
  const [min, hour, dom, mon, dow] = f;
  const isNum = (s) => /^\d+$/.test(s);

  let time;
  if (min === '*' && hour === '*') time = 'Every minute';
  else if (isNum(min) && isNum(hour)) time = `At ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  else {
    const minClause = min === '*' ? 'every minute'
      : min.startsWith('*/') ? `every ${min.slice(2)} minutes`
      : `at minute ${describeField(min, 'num')}`;
    if (hour === '*') time = cap(minClause) + ' of every hour';
    else {
      const hourClause = hour.startsWith('*/') ? `every ${hour.slice(2)} hours` : `during hour ${describeField(hour, 'num')}`;
      time = `${cap(minClause)}, ${hourClause}`;
    }
  }

  const parts = [time];
  const domD = describeField(dom, 'num'); if (domD) parts.push(`on day-of-month ${domD}`);
  const monD = describeField(mon, 'month'); if (monD) parts.push(`in ${monD}`);
  const dowD = describeField(dow, 'dow'); if (dowD) parts.push(`on ${dowD}`);
  return parts.join(' ') + '.';
}
