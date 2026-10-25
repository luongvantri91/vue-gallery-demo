# Analyse this website API

https://43.213.218.98:8000/?800tk#/pages/index/index

### 1. Summary

- **Architecture:** the website is a single-page application (SPA) built with uni-app (Vue 2). The root URL only returns a skeleton HTML page; the UI and data are loaded afterwards by JavaScript.
- **APIs observed with DevTools:** 3 API groups, 6 Fetch/XHR requests across 3 pages (Home, 发现, 好站).
- **3 key findings:**
  1. The three API groups use **three different response formats**.
  2. The `/lhc` group **signs (MD5) and encrypts (AES-CBC)** all request parameters and responses inside a `_data` field.
  3. The image API has **clear pagination** (`meta.total`, `totalPages`, `hasMore`).

### 2. Method and Scope

- **Tools:** Chrome DevTools (Network tab), `curl`, and reading the public client-side JavaScript.
- **Scope:** passive analysis only. No login, no requests that write data.
- **Verification levels:**
  - **Observed** in DevTools: Home, 发现, 好站.
  - **Inferred from client code:** other endpoints, listed separately in section 4.4.
  - **Not yet explored:** the remaining buttons and sub-pages.

### 3. Page Loading Flow

```
Browser
  │ ① GET /?800tk
  ▼
nginx 43.213.218.98:8000 ──► skeleton HTML, only <script> tags          [Doc]
  │ ② load scripts from api.bdmijg.com (loader, config, tracking)
  ▼
api.bdmijg.com/js-1-index ──► compressed HTML (base64 + deflate)
  │ ③ decompress → document.write(real HTML)
  ▼
cdn.edgovn.com ──► uni-app bundle (index.js, chunk-vendors.js)
  │ ④ Vue renders the home page
  ▼
User clicks a button ──► ⑤ load route chunk ──► call API               [Fetch/XHR]
```

**The entry point is a Document request, not an API.** `GET /?800tk` returns `200`, `text/html`, `gzip`, `cache-control: max-age=60, public, s-maxage=600`, and `x-cache-status: STALE` (nginx proxy cache). The body has no business data. Data APIs only appear after the bundle runs.

### 4. API Inventory

#### 4.1. API Architecture

```
                    ┌───────────────────────────┐
                    │  uni-app SPA (browser)    │
                    └────┬─────────┬─────────┬──┘
                  A      │       B │       C │
        ┌────────────────▼─┐ ┌─────▼────────┐ ┌▼─────────────────┐
        │ Business API     │ │ Image/video  │ │ Site list        │
        │ /lhc             │ │ tuku-be      │ │ api.edgoalb.com  │
        │ tkapi1/2/3       │ │ .ptallenvery │ │ /sites           │
        │ .352722.com      │ │ .com         │ │ encrypted data   │
        │ MD5 + AES (_data)│ │ plain JSON   │ │                  │
        └──────────────────┘ └──────┬───────┘ └──────────────────┘
                                    │ image URLs
                                    ▼
                         Image CDN tuku.ptallenvery.com
```

| | A. Business `/lhc` | B. Image / video | C. Site list |
|---|---|---|---|
| Host | `tkapi1/2/3.352722.com` (picked randomly by the client) | `tuku-be.ptallenvery.com` | `api.edgoalb.com` |
| Purpose | Forum, members, voting | Images by lottery type | List of recommended sites ("好站") |
| Read access | Public | Public | Public |
| Encryption | Request and response (`_data`) | None | Response (`encode=true`) |
| Envelope | `{_data, version}` → `{status, message, data}` | `{success, data, meta}` | `{code, msg, data, encoded}` |
| Pagination | `per_page`, `page` | `limit`, `page` + `meta` | `page` |

#### 4.2. APIs Observed with DevTools

| # | Page | Method + URL | Group | Status |
|---|---|---|---|---|
| 1 | Home | `GET tuku-be.ptallenvery.com/api/public/pictures/macau?sort=site&page=1&limit=100` | B | 200 |
| 2 | 发现 | `GET tkapi3.352722.com/lhc/bbs/categories?_data=abc...` | A | 200 |
| 3 | 发现 | `GET tkapi3.352722.com/lhc/bbs/views?per_page=10&page=1&_data=abc...` | A | 200 |
| 4 | 好站 | `GET api.edgoalb.com/sites?type=hklhc&page=1&encode=true` | C | 200 |
| 5 | 好站 | `GET api.edgoalb.com/sites?type=am2lhc&page=1&encode=true` | C | 200 |
| 6 | 好站 | `GET api.edgoalb.com/sites?category_id=h100&page=1&encode=true` | C | 200 |

The 发布 and 会员登陆 pages are static login forms and make no API calls. Details of two representative requests are in section 4.3.

#### 4.3. Detailed Analysis of Two Representative APIs

**API #1: `GET /api/public/pictures/macau`** (plain JSON)

| Item | Detail |
|---|---|
| Query | `sort=site`, `page=1`, `limit=100` |
| Auth | Not required |
| Response | `{ success, data: [...], meta }` |
| `data[]` | `id`, `lottery`, `category`, `filename`, `name`, `keyword`, `letter`, `sortOrder`, `latest {year, issue, url, thumbnailUrl, originalUrl, width, height}`, `urlTemplate`, `thumbnailUrlTemplate`, `fetchUrlTemplate` |
| `meta` | `page`, `perPage`, `total` = 2103, `totalPages` = 22, `hasMore` |

Notes:
- Offset-based pagination. `hasMore` saves the client from calculating the last page.
- `urlTemplate` with `{year}/{issue}` lets the client build URLs for earlier issues without extra API calls.
- `?v=` on image URLs is used for cache busting.
- `fetchUrlTemplate` points to `http://localhost/...`, which looks like a development environment value.

**API #3: `GET /lhc/bbs/views`** (signed and encrypted)

| Item | Detail |
|---|---|
| Query | `per_page=10`, `page=1` (plain) and `_data` (AES, base64) |
| `_data` plaintext | `page`, `category_id`, `isLogo`, `sort`, `title`, `timestamp`, `sign` |
| Response | `{ _data, version: "1.0.0" }` → decrypted: `{ status, message, data }` |
| Auth | No token needed to read |

Notes:
- The plaintext shows the supported filters: `category_id`, `title` (search), `sort`.
- `timestamp` and `sign` (MD5 of the sorted parameters) let the server check request integrity and expiry.
- The plaintext of API #2 decrypts to `{ timestamp, sign }`; its response is a category list `{ id, name, logo, sort, status, remark, created_at, updated_at }`.

**Request pipeline of group A** (verified by decrypting real data):

```
params + timestamp → sort "k=v" joined by "&" → sign = MD5
  → AES-128-CBC → { _data } in the query string
  → response { _data, version } → AES decrypt → { status, message, data }
```

#### 4.4. Endpoints Inferred from Client Code (not observed in real requests)

| Group | Endpoints | Purpose |
|---|---|---|
| A (`/lhc`, read) | `pictures`, `picture-replies`, `draws`, `draws/{id}`, `draw/lastdraw`, `bbs-replies`, `setting-year/{year}`, `vote/{id}/type/{t}` | Images, comments, draw results, voting |
| A (`/lhc`, write, token required) | `bbs`, `bbs/{id}/like`, `bbs-replies`, `picture-replies`, `vote`, `member`, `member/login`, `member/logout` | Post, like, vote, register, log in |
| B | `pictures/{type}`, `pictures/detail/{id}`, `videos/{type}` | Image details, videos |
| Realtime | `wss://ws.edgoapp.com` (socket.io) | Live draw results (real connection not verified) |

### 5. API Design Observations

- **Strengths:**
  - Group B has clear pagination and `meta`.
  - Good separation of infrastructure: loader, config, API, and image CDN are on separate domains. The API host can change without rebuilding the app.
  - Group A uses `timestamp` and `sign`, which helps reduce forged or replayed requests.
- **Points to keep in mind when testing:**
  - Three different response envelopes, so the client and the tests must handle each group separately.
  - Group A can only be called with a signed `_data`, and encrypted responses make debugging and testing with generic tools harder.
  - `timestamp` changes on every call, so group A requests cannot be cached by URL.
  - URLs have no version segment (only the `/lhc/` prefix).

### 6. Testing Strategy

> Only within the authorised scope; focus on public read APIs.

| Type | What to check | Applies to |
|---|---|---|
| Functional | Status `200` and correct envelope; schema and data types; consistent `meta.total`, `totalPages`, `hasMore` (2103 items, `limit=100` → 22 pages, last page `hasMore=false`); filters `category_id`, `title`, `type` | #1, #3, #4–6 |
| Negative | `page=0`, `-1`, `abc`; `page` beyond `totalPages`; `limit=0` or very large; unknown `type`; `_data` missing, invalid base64, wrong `sign`, expired `timestamp` → expect `400/422`, never `500`; POST to a GET endpoint → `405` | #1, #3 |
| Security | Read APIs work without a token; write APIs return `401` without a token; responses do not expose internal info (e.g. `localhost`); replayed requests are rejected after `timestamp` expires; light rate-limit check | A, B |
| Performance | Response time (p50/p95) per host `tkapi1/2/3`; response size by `limit` and `gzip` efficiency; `Cache-Control` / `ETag` for APIs and image CDN; behaviour when one host is down | A, B |

**Tools:** DevTools (observation), Postman/Newman (scripts and schema checks), k6 or JMeter (performance, when permitted).

### 7. Conclusion

- **Identified:** 3 API groups: business `/lhc` (signed and encrypted), image/video (plain JSON), and site list (encrypted). The home page is only an entry point; APIs appear when users interact with sub-pages.
- **Main flow:** click a button → load the route chunk → call the API through a shared request layer → decrypt → render.
- **Testing priorities:** pagination and data consistency of the image API; correctness of `sign`/`timestamp` in the `/lhc` group; error handling across the 3 response formats.
- **Limitations:** based only on DevTools and public client code; some pages/buttons not explored; WebSocket and the `api.edgoalb.com` decryption method not verified; no measured performance data.
- **Needed for a fuller assessment:** API documentation (OpenAPI/Swagger), test accounts and a test environment, and confirmation of the allowed scope for security and performance testing.
