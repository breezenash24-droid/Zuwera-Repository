# Zuwera Website

## How to Run Locally
1. Open `index.html` in your browser (no build step needed).
2. Products, cart drawer, and login modal are all functional.

## Deploy to Netlify
1. Go to [Netlify](https://www.netlify.com/).
2. Drag & drop this folder into the Netlify dashboard.
3. Site goes live immediately.
4. Optionally connect a custom domain in Site Settings.

## File Structure
```
zuwera-website/
├─ index.html       — Main page (semantic HTML, accessible modals)
├─ style.css        — All styles (CSS variables, responsive, animations)
├─ main.js          — Cart logic, modal handling, toast notifications
├─ assets/
│   ├─ logo.png     — Replace with your logo
│   ├─ hero.mp4     — Replace with your hero video
│   ├─ product1.jpg — Replace with product photos
│   ├─ product2.jpg
│   ├─ product3.jpg
│   └─ product4.jpg
├─ netlify.toml     — Netlify deployment config
└─ README.md
```

## What Was Fixed
- **Hero text invisible bug** — removed `color:black` from the global `*` reset; hero `h1` now correctly renders white
- **Semantic HTML** — wrapped nav in `<nav>`, products in `<article>`, added `aria` attributes throughout
- **Cart modal** — full cart with item list, remove buttons, running total, and checkout flow
- **No more `alert()`** — replaced with a smooth toast notification system
- **Login validation** — email format check, password length check, inline error messages
- **Modal accessibility** — `role="dialog"`, `aria-modal`, Escape key closes, backdrop click closes
- **`netlify.toml` duplication** — removed duplicate content that would cause parse errors
- **CSS specificity issues** — proper scoped color rules, no more conflicting overrides
- **Responsive layout** — mobile-friendly grid and nav down to 320px
