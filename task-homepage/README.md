# Task 2: Homepage (Vue 3)

A mobile-first homepage that reproduces the **layout, colors, sizes and behavior** of the reference page
`https://43.213.218.98:8000/?800tk#/pages/index/index` (home tab).
Sizes and colors were measured from the reference page with DevTools (content column 480 px, header 47 px, ball 42 px, tab bar 51 px, and so on).

## Run it

No install, no build step.

1. Open `index.html` in a modern browser (double-click is enough).
2. An internet connection is needed for Vue (jsDelivr CDN) and for the gallery images (public image API). Without it the gallery shows generated posters.

Use the browser's device toolbar (mobile width) for the intended look. On wide screens the page stays a centered 480 px column, as the reference does.

## What the page contains (top to bottom)

| Block | Behavior |
|---|---|
| Fixed green header | Logo, three lottery tabs (港彩六合 / 澳门六合 / 快乐8六合), 下载 / 搜索 / 分享 |
| Banner | The 5 public banner images of the reference page (hotlinked; generated SVG fallback), 180 px high, autoplay every 4 s, swipe or drag, dots |
| Notice bar | Red speaker icon and a scrolling announcement |
| Lottery tabs | Name + next draw date for each lottery, blue extra tab on the right |
| Draw result | Issue number, 6 balls + "+" + special ball (red / blue / green), zodiac and element under each ball, countdown to the next draw, 自动刷新 button |
| Quick menu | 2 rows of 5 round icons; the first row sticks under the header while scrolling |
| Gallery | Two-column masonry of poster cards with a title strip, infinite scroll (20 per page), end and retry states. Posters are loaded from the public image API |
| Floating switch | Three pills above the tab bar; same state as the header tabs |
| Bottom tab bar | 图库 / 发现 / 发布 (raised round button) / 好站 / 我的 |

Switching lottery (header tab, lottery tab or floating pill) reloads the draw result, countdown and gallery from page 1.
Buttons without a page behind them (search, download, quick menu, other tabs) show a short toast.

## Project structure

```
task-homepage/
├─ index.html            Entry point, loads Vue, api.js, app.js
├─ api.js                Data layer: draw, banners, notice, gallery (generated demo data)
├─ app.js                Composables (toast, countdown, gallery paging), components, root App
├─ styles.css            Styles
├─ api-architecture.en.md  Data flow and how to connect a real backend
└─ README.md
```

## Tech choices

- **Vue 3 from CDN** (pinned version, SRI hash), Composition API with string templates.
- **Plain CSS**, inline SVG icons, no UI framework, no images to download.
- **No backend.** `api.js` returns Promises with a small delay and the same envelope style as the paginated API found in Task 1:
  `{ success, data, meta: { page, perPage, total, totalPages, hasMore } }`.

## Scope and limitations

- **Gallery images come from the public image API** used by the reference page (`tuku-be.ptallenvery.com/api/public/pictures/{hongkong|macau|kl8}`, no key, CORS open), as the owner of this demo allowed. Images are hotlinked, never copied into the repo. Titles that look adult-oriented are filtered out, and a card whose image fails gets a generated poster. If the API is unreachable, the whole gallery falls back to generated posters.
- **Banners are reused** from the reference's public image host (hotlinked, not stored in the repo) for this personal, temporary test only. They are third-party advertisements; remove them before any public use. If one fails to load, a generated red/gold banner is shown instead.
- **Other content is demo data.** Lottery numbers are generated (seeded by lottery and date) and are not real results.
- The reference page's logo, texts, domains and private APIs are **not** copied or called. The brand is a neutral "图库.demo".
- Only the home tab is built. The 发现 / 发布 / 好站 / 我的 pages, search and download are placeholders.
- No automated tests. Behavior (rendering, sticky row, infinite scroll, lottery switch, remote and fallback images) was checked manually in the browser.
