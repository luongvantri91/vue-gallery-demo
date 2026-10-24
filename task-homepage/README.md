# Demo Gallery (Vue 3)

A mobile-first image gallery homepage, built as a response to the "Create homepage like that" task.
It reproduces the **layout and behavior** of the reference page with neutral content and its own data layer.

## Run it

No install, no build step.

1. Open `index.html` in a modern browser (double-click is enough).
2. An internet connection is needed for Vue (jsDelivr CDN) and the photos (Lorem Picsum).
   Without internet, the page still works and shows generated placeholder images.

Tip: use the browser's device toolbar (mobile width) for the intended look.

## What it does

| Feature | Details |
|---|---|
| Two-column masonry grid | Each new card goes to the shorter column |
| Infinite scroll | `IntersectionObserver` loads the next page of 10 items |
| Category switch | Tabs in the header and floating pills; reloads from page 1 |
| Search | Debounced (300 ms), filters by title |
| Share | Native share sheet, or copies the link |
| Hash routing | `#/home`, `#/discover`, `#/publish`, `#/sites`, `#/me` |
| Loading / empty / error / end states | Skeleton, "No results", tap-to-retry, "End of list" |
| Resilience | Remote list fails or times out (8 s) → generated items; a photo fails → SVG placeholder |

## Tech choices

- **Vue 3 from CDN** (`vue.global.prod.js`, pinned version, with SRI hash). Composition API with string templates, so no tooling is required to review the code.
- **Plain CSS** (`styles.css`), no UI framework.
- **No backend.** Data comes from [Lorem Picsum](https://picsum.photos), a public image service.

## Project structure

```
homepage-vue/
├─ index.html            Entry point, loads Vue, api.js, app.js
├─ api.js                Data layer: fetchItems(), cache, fallback, placeholder images
├─ app.js                Composables, components, root App
├─ styles.css            Styles
├─ api-architecture.md   API architecture, diagrams, comparison with the reference page
└─ README.md
```

Code map (details are in the comments of each file):

- `api.js`: `fetchItems({ category, page, query })` is the only function the UI calls for data.
- `app.js`: `useGallery` (paging state and business logic), `useHashRoute`, `useToast`, and 7 UI components.

## API contract

`fetchItems` returns the same envelope style as the paginated API seen in the analysis task:

```json
{
  "success": true,
  "data": [{ "id": "a-10", "title": "Author #10", "ratio": 1.2, "hue": 110, "imageUrl": "https://picsum.photos/id/10/400/480" }],
  "meta": { "page": 1, "perPage": 10, "total": 50, "totalPages": 5, "hasMore": true }
}
```

Picsum does not provide categories, search, or a total count, so the data layer builds them on the client:
each category is a different page of Picsum's public list, and filtering and paging are done in `fetchItems`.

## Scope and limitations

Stated openly so the review is easy:

- **No server-side code.** There is no own backend, authentication, or persistence.
  Moving to a real API only means replacing the body of `fetchItems()`; the UI does not change
  (see `api-architecture.md`, section 4).
- **Reference page content is not reused.** Its images, branding, and private APIs are not copied or called.
- Pages other than Home are placeholders; Download and quick-menu entries show a toast.
- No automated tests yet. Behavior was checked manually in the browser.
- Photos are provided by a third-party service and may change or be slow.

## More

See [api-architecture.en.md](./api-architecture.en.md) (English) or [api-architecture.md](./api-architecture.md) (Vietnamese) for the architecture diagrams, data flow,
function-by-function business description, and the comparison with the reference page.
