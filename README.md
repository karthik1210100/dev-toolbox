<h1 align="center">🧰 DevToolbox</h1>

<p align="center"><strong>A fast, offline-first developer toolbox that runs entirely in your browser.</strong></p>
<p align="center">No sign-up. No build step. No network calls. Your data never leaves the tab.</p>

<p align="center">
  <a href="https://karthik1210100.github.io/dev-toolbox/"><img src="https://img.shields.io/badge/Live%20Demo-4f46e5?style=for-the-badge&logo=github&logoColor=white" alt="Live demo" /></a>
  <img src="https://img.shields.io/badge/dependencies-0-22c55e?style=for-the-badge" alt="Zero dependencies" />
  <img src="https://img.shields.io/badge/PWA-offline%20ready-6366f1?style=for-the-badge" alt="PWA" />
</p>

---

## Why DevToolbox?

Most "developer utility" sites paste your tokens, JSON and secrets into a server you don't control. DevToolbox does the opposite: **every tool runs 100% client-side** using the browser's native APIs (`crypto.subtle`, `TextEncoder`, `URL`). It works offline, installs as a PWA, and ships as plain static files — so it's fast, private, and auditable in a single read.

## ✨ Features

| Tool | What it does |
|---|---|
| **JSON Formatter** | Pretty-print, validate and minify JSON with clear error messages |
| **JWT Decoder** | Inspect a token's header & claims (decode only — never sent anywhere) |
| **Base64** | UTF-8-safe encode / decode |
| **URL Encode** | Percent-encode & decode URL components |
| **JSON → TypeScript** | Generate `interface` definitions from any JSON sample |
| **Hash** | SHA-1 / 256 / 384 / 512 via the Web Crypto API |
| **UUID Generator** | Bulk v4 UUIDs |
| **Timestamp** | Convert Unix epoch ↔ human dates (ISO / UTC / local) |
| **Colour + Contrast** | HEX ↔ RGB ↔ HSL with live WCAG contrast grading |
| **Case Converter** | camelCase, snake_case, kebab-case, PascalCase & more |
| **Cron Explainer** | Translate a cron expression into plain English |
| **Lorem Ipsum** | Placeholder words, sentences or paragraphs |

Plus: **⌘K / Ctrl-K command palette**, light & dark themes, keyboard navigation, one-click copy, and a fully responsive layout.

## 🚀 Live demo

**https://karthik1210100.github.io/dev-toolbox/**

Open it once online and it keeps working offline — or install it from your browser's address bar.

## 🧱 Tech & design choices

- **Vanilla JavaScript (ES modules)** — zero runtime dependencies, so there's no supply-chain surface and nothing to audit but the code itself.
- **No build step** — the repo *is* the deployable. Static hosting (GitHub Pages) serves it directly.
- **Native browser APIs** — hashing uses `crypto.subtle`; nothing is polyfilled or bundled.
- **Offline-first** — a small service worker caches the app shell.
- **Accessible & themeable** — semantic markup, keyboard support, `prefers-color-scheme` aware.

```
dev-toolbox/
├── index.html      # app shell
├── styles.css      # theme tokens + layout
├── app.js          # UI, routing, command palette
├── tools.js        # pure, testable helper functions
├── sw.js           # offline service worker
└── manifest.webmanifest
```

## 🖥️ Run locally

Because there's no build step, any static server works:

```bash
git clone https://github.com/karthik1210100/dev-toolbox.git
cd dev-toolbox
python3 -m http.server 8080   # then open http://localhost:8080
```

## 🤝 Contributing

Each tool is a small object in `app.js` with a `render()` method, backed by a pure function in `tools.js`. Adding a tool is a few lines in each file — PRs welcome.

## 📄 License

[MIT](./LICENSE) © Karthikeyan
