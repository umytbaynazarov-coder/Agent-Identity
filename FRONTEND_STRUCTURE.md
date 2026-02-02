# Frontend Structure

This frontend is a static, single-page marketing site served from `public/` and deployed via Netlify.

## High-Level Overview

- Entry point: `public/index.html`
- Styling: `public/css/styles.css`
- Behavior: `public/js/main.js`
- Hosting config: `netlify.toml` (SPA redirect to `index.html`)

## Directory Tree (Frontend Only)

```
public/
  index.html
  css/
    styles.css
  js/
    main.js
netlify.toml
```

## File Responsibilities

### `public/index.html`

- Static page content and structure.
- Sections include:
  - Hero with CTA buttons and status badge.
  - Feature grid and quick start curl examples.
  - Tabbed language quick-start guides (JS, Python, LangChain).
  - Interactive demo with register/verify/fetch steps.
  - Use cases and template cards with modal.
  - Integration checklist and footer links.
- Loads assets:
  - CSS: `css/styles.css`
  - JS: `js/main.js`

### `public/css/styles.css`

- Global reset and layout defaults.
- Visual system: gradients, cards, badges, buttons, shadows.
- Major UI groups:
  - Hero + CTA styling
  - Feature cards and code blocks
  - Tabbed quick-start area (buttons, panels, syntax coloring)
  - Interactive demo styles (buttons, outputs, success states)
  - Template cards and modal styling
  - Integration checklist styling
  - Responsive rules for tablets/phones

### `public/js/main.js`

- **Tab switching** for quick-start guides.
- **Copy-to-clipboard** helpers for code snippets and templates.
- **Template modal** logic (open/close, insert code, copy).
- **Interactive demo** flow:
  - Step 1: register agent
  - Step 2: verify agent to receive JWT
  - Step 3: fetch agent details with JWT
  - UI state updates, copy buttons, and success banner.
- **API base URL** used for demo calls:
  - `https://agent-identity-production-dc4e.up.railway.app`
- **Analytics hooks** (optional): `gtag` calls if present.

### `netlify.toml`

- Publishes `public/` as the site root.
- Redirects all routes to `/index.html` for SPA behavior.

## Runtime Flow (Browser)

1. Browser loads `public/index.html`.
2. Styles apply from `public/css/styles.css`.
3. `public/js/main.js` initializes event handlers.
4. User interacts with tabs, templates, or demo calls:
   - Demo calls hit the public API base URL.
   - Responses render in `<pre>` blocks with copy support.

## External Dependencies

- No build tools or frontend frameworks.
- No npm-based frontend dependencies; everything is static.
- Uses standard browser APIs: `fetch`, `navigator.clipboard`, DOM APIs.

