# Vue Gallery Demo

Two small tasks of a fullstack assessment.

| Task | What it is | Where |
|---|---|---|
| **Task 1** | API analysis of a given website, based on browser observation and DevTools | [task-analys-api/](./task-analys-api/) |
| **Task 2** | A mobile-first homepage that reproduces the reference page, built with Vue 3 | [task-homepage/](./task-homepage/) |

## Live demo

`https://luongvantri91.github.io/vue-gallery-demo/`

Best viewed at mobile width (browser device toolbar, or open it on a phone).

## Task 1: API analysis

Read [task-analys-api/analys-api.en.md](./task-analys-api/analys-api.en.md).
It covers how the page loads, the 6 observed APIs (3 API groups), response formats, security observations and a test strategy.
Sensitive values are masked as `abc...`.

## Task 2: Homepage

- Reproduces the layout of the reference homepage: header, banner, notice, lottery tabs, draw result with countdown, quick menu, masonry gallery with infinite scroll, floating switch and bottom tab bar.
- Vue 3 from CDN, plain CSS, **no build step and no backend**.
- Details: [task-homepage/README.md](./task-homepage/README.md).
- Data flow and how to plug in a real API: [task-homepage/api-architecture.en.md](./task-homepage/api-architecture.en.md).

## Run locally

Open `task-homepage/index.html` in a browser. No install is needed; an internet connection is required only for Vue (CDN).

## Notes

- Gallery posters (adult-looking titles filtered) and the 5 banners are hotlinked from the public image hosts used by the reference page, for this personal, temporary test only. Numbers and other content are generated demo data; the reference logo, texts, domains and private APIs are not reused.
- The demo has no automated tests yet; behavior was checked manually in the browser.
