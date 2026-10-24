# API Architecture: Reference Page vs. the Vue 3 Demo

This document describes the API architecture of the Vue 3 demo in this folder and compares it with the reference page analysed in Task 1.

## 1. Summary

The Vue 3 demo adopts **only a small part** of the reference page's architecture: the style of the image API (group B, `tuku-be`). The rest is left out on purpose, because the task only asks for the user interface.

- **Adopted:** API access separated from the UI, the `{success, data, meta}` envelope, `page` + `meta.hasMore` pagination, hash router, centralised error handling.
- **Not adopted:** request signing/encryption, tokens, multiple hosts, image CDN, dynamic configuration, WebSocket, anti-bot and tracking.

## 2. API architecture of the demo

### 2.1. Architecture diagram

```
┌──────────────────────────────────────────────────────────────┐
│ Browser: Vue 3 SPA (loaded from CDN, no build step)          │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────────┐   │
│  │ UI           │   │ Composable   │   │ API layer       │   │
│  │ (components) │──►│ useGallery   │──►│ GalleryApi      │   │
│  │ Header, Grid,│   │ state,       │   │ fetchItems()    │   │
│  │ Card, Nav…   │◄──│ paging       │◄──│ per-category    │   │
│  └──────────────┘   └──────────────┘   │ cache           │   │
│                                        └───────┬─────────┘   │
└────────────────────────────────────────────────┼─────────────┘
                                                 │ ① item list (JSON)
                             ┌───────────────────┴──────────────┐
                             ▼                                  ▼
                  ┌─────────────────────┐           ┌────────────────────┐
                  │ picsum.photos       │           │ Generated data     │
                  │ GET /v2/list        │           │ (fallback on       │
                  │ primary source      │           │ network error or   │
                  └─────────────────────┘           │ timeout)           │
                                                    └────────────────────┘

Browser ──② load each photo (lazy)──► picsum.photos/id/{id}/{w}/{h}
                                        │ error → the <img> switches to a locally generated SVG
```

### 2.2. Data flow

```
User opens the page / switches category / types a search / scrolls to the bottom
   │
   ▼
useGallery.loadNext()  ── ignored if already loading or hasMore = false
   │  calls fetchItems({ category, page, query })
   ▼
GalleryApi.getCatalog(category)
   ├─ cached ─────────────────► reuse
   └─ not cached ─► GET /v2/list?page={window}&limit=50 (8 s timeout)
                      ├─ success ─► map to { id, title, ratio, hue, imageUrl }
                      └─ error/timeout ─► use generated data
   │
   ▼
Filter by query → slice one page (10 items)
   │
   ▼
Return  { success, data[10], meta{ page, perPage, total, totalPages, hasMore } }
   │
   ▼
useGallery: append to the shorter column (masonry), update hasMore
   │
   ▼
Vue renders the cards ──► browser loads photos ──► error? ──► SVG placeholder
   │
   ▼
IntersectionObserver watches the last element ──► loads the next page
```

### 2.3. Layer responsibilities

| Layer | Parts | Responsibility |
|---|---|---|
| UI | `AppHeader`, `QuickMenu`, `MasonryGrid`, `GalleryCard`, `CategoryPills`, `BottomNav` | Render and emit events (select category, search); never call the API directly |
| State | `useGallery` | Holds category, query, columns, `page`, `hasMore`, `loading`; drops stale results when the category changes (`requestId`) |
| Data access | `GalleryApi.fetchItems` | The only entry point for data: cache, filter, paging, envelope |
| Data source | `picsum.photos` / generated data | Provides the photo list and the photos |
| Navigation | `useHashRoute` | Reads `#/home`, `#/discover`… from the URL |

Because data access has its own layer, switching the source (Picsum → a real API) affects one function only.

### 2.4. Business description of the main functions

Every function has a business-level comment in the source ([api.js](./api.js), [app.js](./app.js)). Summary:

**`api.js` – data layer**

| Function | Business role |
|---|---|
| `fetchItems({category, page, query})` | Single entry point for the UI: get the category list → filter by search text → slice 10 items per page → return `{success, data, meta}` |
| `getCatalog(category)` | Returns the list of one category, loaded only once (cached); falls back to generated data on failure |
| `loadRemoteCatalog(category)` | Calls Picsum for the category's photo list, 8 s timeout |
| `buildFallbackCatalog(categoryId)` | Creates 50 local items when offline; cards draw an SVG instead of a photo |
| `placeholderImage(item)` | Generates a gradient SVG so a card is never empty |
| `ratioFor`, `hueFor`, `seededRandom` | Derive a stable card ratio, color and random sequence from the id, so the layout is the same on every load |

**`app.js` – UI and state**

| Part | Business role |
|---|---|
| `useGallery` | Core logic "show photos page by page": `loadNext()` appends the next page to the shorter column, `reset()` reloads from page 1, stale responses are ignored |
| `useHashRoute` | Routing by `#/…` without a library |
| `useToast` | Short message that disappears after 1.8 s |
| `AppHeader` | Category tabs, search box, download/share buttons |
| `GalleryCard` | One photo with its title; switches to an SVG if the photo fails |
| `MasonryGrid` | Two columns of cards, with a skeleton block while loading |
| `QuickMenu`, `CategoryPills`, `BottomNav` | Shortcuts, quick category switch, bottom navigation bar |
| `App` | Wires everything: infinite scroll with `IntersectionObserver`, category change, search with 300 ms debounce, link sharing, retry on error |

## 3. Comparison with the reference page

| Aspect | Reference page (as analysed) | Vue 3 demo | Inherited? |
|---|---|---|---|
| Overall model | SPA calling several backends over REST | SPA calling one API layer (`GalleryApi`) | Partly: keeps the idea of separating API access from the UI |
| Shared API caller | `apiLHCResquest` (one function for the `/lhc` group) | `fetchItems()` (one function) | Yes: one entry point for data |
| Number of API groups | 3 (`/lhc`, `tuku-be`, `edgoalb`) | 1 | No: not needed for this task |
| Response envelope | 3 different styles | One style `{success, data, meta}` | Yes: taken from group B because it is the clearest |
| Pagination | `limit`, `page` + `meta` (`total`, `totalPages`, `hasMore`) | `page`, `PER_PAGE = 10` + the same `meta` fields | Yes: same `meta` structure |
| `hasMore` flag | Yes | Yes, used to stop loading while scrolling | Yes |
| Filter / search | `category_id`, `title`, `type` | `category`, `query` | Yes (simplified) |
| Image URL | Own CDN, `urlTemplate`, `?v=` cache busting | `picsum.photos/id/{id}/{w}/{h}` (Lorem Picsum), SVG fallback when a photo fails | Partly: same idea of templated image URLs, different source |
| API host | One of 3 hosts chosen randomly on the client | One public service `picsum.photos` (`/v2/list`), generated data as offline fallback | No |
| MD5 signing + AES encryption (`_data`, `sign`, `timestamp`) | Yes (`/lhc` group) | No | No: specific to that system, key is in the client |
| Token / login | `authorization` from `localStorage` | No login | No |
| Error handling | By HTTP status (400/401/403/422), inferred from client code | List-loading errors fall back to generated data; other unexpected errors show "Tap to retry" | Partly: centralised error handling |
| Dynamic configuration | `js-b-tkconfig` (hosts, CDN, banners) | Constants in `api.js` | No |
| Realtime WebSocket | Present in the config (`socket.io`, not verified) | No | No |
| Anti-bot, tracking | `runtime.js`, `rc.js` | No | No |
| Router | Hash router `#/pages/...` | Hash router `#/home`… | Yes |
| Page loading | Compressed loader + bundle + route chunks | One JS file, no chunks | No |

## 4. Data source and moving to a real API

Photos come from the public service [Lorem Picsum](https://picsum.photos): free, no API key, and callable from the browser (CORS `*`).

| Part | Details |
|---|---|
| List | `GET https://picsum.photos/v2/list?page={n}&limit=50` returns `id`, `author`, `width`, `height`, `url`, `download_url` |
| Displayed photo | `https://picsum.photos/id/{id}/400/{height}` (resized and cropped to the card ratio) |
| Categories | Picsum has none. Each category (Nature, City, Travel) uses a different window of the list (`page` 1, 2, 3) |
| Paging and search | 50 photos per category are loaded once (cached), then paged 10 per page and filtered by title (format "author #id") on the client |
| Envelope | `fetchItems` wraps the result as `{success, data, meta}`, like the group B image API |
| On network error | Generated data and locally drawn SVG; a single failed photo also switches to SVG |

With a real API, only the body of `fetchItems` in [api.js](./api.js) needs to be replaced by a `fetch()` call. The UI in [app.js](./app.js) does not change.

```
GET /pictures/{category}?page=1&limit=10&q=...
→ { success, data: [...], meta: { page, perPage, total, totalPages, hasMore } }
```

Note: the photos are illustrative only and do not really match "Nature/City/Travel"; the category names only demonstrate the UI.
