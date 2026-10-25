# Homepage data flow

## 1. Overview

```
 app.js (UI)                         api.js (data layer)
 ┌──────────────────────┐            ┌─────────────────────────────┐
 │ App                  │ ─ mount ─► │ fetchBanners()  → slides    │
 │  ├ BannerSwiper      │            │ fetchNotice()   → text      │
 │  ├ NoticeBar         │            │ fetchDraw(id)   → balls,    │
 │  ├ DrawTabs/Result   │ ◄───────── │                   next time │
 │  ├ MenuRow x2        │            │ fetchGallery({lottery,page})│
 │  ├ Gallery (infinite)│            │                 → cards+meta│
 │  ├ PillBar, TabBar   │            └─────────────────────────────┘
 └──────────────────────┘      gallery: public image API (fallback: generated)
                               everything else: generated locally, seeded
```

The UI calls only the six functions of `window.HomeApi`. Nothing else knows where data comes from.

## 2. Contract

| Function | Returns (`data`) | Notes |
|---|---|---|
| `fetchBanners()` | `[{ id, imageUrl, fallbackUrl }]` | 5 public banners (hotlinked), generated SVG fallback |
| `fetchNotice()` | `{ text }` | Scrolling line |
| `fetchDraw(id)` | `{ lottery, issue, numbers[7], nextIssue, nextDrawAt }` | `numbers[i]`: `{ value, color, zodiac, element, elementClass }`; the 7th is the special ball |
| `fetchGallery({ lottery, page })` | `[{ id, title, ratio, imageUrl }]` + `meta` | Public image API first (`hk`→`hongkong`, `mo`→`macau`, `k8`→`kl8`); `ratio` = height / width from the API, so the layout is known before the image loads. Generated fallback on failure |
| `placeholderImage(item)` | data URL | Generated poster shown when a single image fails to load |
| `nextDrawAt(id)` | `Date` | Used for the date under each tab and for the countdown |

`meta` follows the paginated envelope seen in the analysis task: `{ page, perPage, total, totalPages, hasMore }`.

## 3. Business rules

- **Ball color** follows fixed number sets (red, blue, green), the same rule the reference page uses.
- **Zodiac** is `(n - 1) mod 12` over a fixed list; **element** is `n mod 5`. Both are demo rules.
- **Countdown** ticks every second toward `nextDrawAt`. At zero the page loads the next draw.
- **Masonry**: each new card goes to the column with the smaller estimated height (sum of `ratio`), which keeps both columns balanced.
- **Infinite scroll**: an `IntersectionObserver` sentinel (400 px before the end) calls `loadMore`. It is guarded against double calls, and a response that arrives after the lottery was switched is ignored (`generation` counter).
- **Failure**: a failed page shows "tap to retry"; the end shows "没有更多了".

## 4. Design decisions and trade-offs

| Decision | Why | What I gave up |
|---|---|---|
| **Vue 3 from a CDN, no build step** (loaded with an SRI hash) | The reviewer can open `index.html` by double-click (`file://`) with no Node, no install and no build. The page is small enough that a bundler adds more setup than value. | No TypeScript, tree-shaking, hot reload or single-file components. |
| **One data layer, `window.HomeApi`** (`api.js`) | The reference mixes three API groups with three envelopes. Hiding them behind one contract of six functions keeps the UI independent of the source, so mock data and a real backend are swappable (section 6). | One more indirection for a page this small. |
| **Plain JSON envelope `{ success, data, meta }`** for every function | It is the cleanest of the three shapes seen in Task 1 and already carries pagination. | The real `/lhc` group would need a mapping layer. |
| **Public image API first, generated fallback second** | Real thumbnails make the page look like the reference. The generated 100-poster set and per-card `placeholderImage` keep the page usable when the network or one image fails. | The page depends on a third-party host when it is online. |
| **Masonry by `ratio` (height / width)** | The API returns `width` and `height`, so every card's height is known before its image loads. Cards are placed without layout jumps, and no masonry library is needed. | The column choice is an estimate (sum of ratios), not a measured height. |
| **`IntersectionObserver` sentinel for infinite scroll** | No scroll listeners and no throttling. A `generation` counter drops stale responses after a lottery switch, and the sentinel is re-checked after each load because a short page can leave it in view. | None significant. |
| **Seeded, locally generated draw data** | Draw results come from the encrypted `/lhc` group, which is out of scope (section 5). A deterministic generator gives stable, testable numbers and the same issue number as the reference (day of year − 1). | Numbers are not real results; the element rule is a demo rule. |
| **Plain CSS, values measured from the reference** (480 px column, 47 px header, 180 px banner, 42 px balls) | Pixel-level match without a CSS framework, and every number is traceable to a measurement. | No design tokens or theming. |

## 5. Mapping from the API analysis (Task 1)

| Task 1 group | Used by the homepage? | How |
|---|---|---|
| **B. Image API** (`tuku-be.ptallenvery.com`, plain JSON) | **Yes, called for real** | `fetchGallery` calls `GET /api/public/pictures/{hongkong\|macau\|kl8}?sort=site&page=N&limit=20`. The reference uses `limit=100`; I use 20 per page for faster first paint and use the `meta` envelope (`hasMore`) to drive infinite scroll. |
| **A. Business `/lhc`** (signed with MD5, encrypted with AES, `_data`) | **No, simulated** | Draw results (`draws`, `draw/lastdraw`) are inferred endpoints that I did not observe and cannot call without implementing the signing and AES scheme. `fetchDraw` returns generated data in the shape such an API would give. |
| **C. Site list** (`api.edgoalb.com/sites`, encrypted) | **No** | It feeds the 好站 tab, which is out of scope for the home tab. |
| Banners | Static URLs | The 5 URLs are read from the reference page's DOM, not from an API call. They come from the public image host and are hotlinked for this personal test only. |
| Notice text, menu rows | Local constants | No API was observed for them. |

So only one of the three API groups is called for real. The other data is shaped like the real thing, which is why moving to a real backend only changes `api.js`.

## 6. Connecting a real backend

Replace only the bodies of the functions in `api.js`. If a real API returns another shape (for example encrypted `_data` like the `/lhc` group in Task 1), map it to the shapes in section 2 inside `api.js`; components stay unchanged.
