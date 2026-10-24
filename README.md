# Vue Gallery Demo

Two small tasks of a fullstack assessment.

| Task | What it is | Where |
|---|---|---|
| **Task 1** | API analysis of a given website, based on browser observation and DevTools | [task-analys-api/](./task-analys-api/) |
| **Task 2** | A mobile-first image gallery homepage built with Vue 3 | [task-homepage/](./task-homepage/) |

## Live demo

`https://luongvantri91.github.io/vue-gallery-demo/`

Best viewed at mobile width (browser device toolbar, or open it on a phone).

## Task 1: API analysis

Read [task-analys-api/analys-api.en.md](./task-analys-api/analys-api.en.md).
It covers how the page loads, the 6 observed APIs (3 API groups), response formats, security observations and a test strategy.
Sensitive values are masked as `abc...`.

## Task 2: Homepage

- Vue 3 from CDN, plain CSS, **no build step and no backend**.
- Two-column masonry grid, infinite scroll, category switch, debounced search, share, hash routing.
- Photos come from [Lorem Picsum](https://picsum.photos); if it is unreachable, generated placeholder images are used.
- Details: [task-homepage/README.md](./task-homepage/README.md).
- API architecture, diagrams and comparison with the reference page: [task-homepage/api-architecture.en.md](./task-homepage/api-architecture.en.md).

## Run locally

Open `task-homepage/index.html` in a browser. No install is needed; an internet connection is required for Vue (CDN) and the photos.

## Notes

- The reference page's images, branding and private APIs are not reused. The demo uses neutral content only.
- The demo has no automated tests yet; behavior was checked manually in the browser.
