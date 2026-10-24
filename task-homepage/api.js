/* Data layer of the demo (the only file that knows where images come from).
 *
 * Business role: give the UI a list of gallery items, page by page, filtered by category and search text.
 * Source: Lorem Picsum (public, no key). If it is unreachable, generated items are used instead,
 * so the page always shows something.
 *
 * Response envelope (same shape as the paginated API observed in the analysis):
 *   { success, data: [...], meta: { page, perPage, total, totalPages, hasMore } }
 *
 * Public API:  CATEGORIES, fetchItems(), placeholderImage()
 */
window.GalleryApi = (() => {
  "use strict";

  const CATEGORIES = [
    { id: "a", name: "Nature" },
    { id: "b", name: "City" },
    { id: "c", name: "Travel" },
  ];

  const PER_PAGE = 10;
  const ITEMS_PER_CATEGORY = 50;
  const PICSUM = "https://picsum.photos";
  const REQUEST_TIMEOUT_MS = 8000;
  const FALLBACK_TITLES = ["Sunrise", "Harbor", "Forest", "Market", "Lantern", "Garden", "Bridge", "Meadow", "Canyon", "Village", "Island", "Glacier"];

  /* ratioFor(n): card height / width for image id n (1.1 to 2.0).
     Derived from the id, so a photo keeps the same shape on every reload and the masonry layout does not jump. */
  const ratioFor = (n) => 1.1 + ((n * 37) % 90) / 100;

  /* hueFor(n): base color (0-359) of the placeholder shown while the photo loads or if it fails. */
  const hueFor = (n) => (n * 47) % 360;

  /* seededRandom(seed): small random generator that returns the same sequence for the same seed.
     Used by the offline fallback so "random" items are identical on every run (predictable demo, testable). */
  function seededRandom(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* buildFallbackCatalog(categoryId): offline safety net.
     When Picsum fails (no internet, timeout, HTTP error), create 50 local items per category.
     They have no imageUrl, so the card draws a generated SVG instead of a photo. */
  function buildFallbackCatalog(categoryId) {
    const rand = seededRandom(categoryId.charCodeAt(0) * 977);
    return Array.from({ length: ITEMS_PER_CATEGORY }, (_, i) => ({
      id: `${categoryId}-${i + 1}`,
      title: `${FALLBACK_TITLES[Math.floor(rand() * FALLBACK_TITLES.length)]} #${i + 1}`,
      ratio: 1.1 + rand() * 1.1,
      hue: Math.floor(rand() * 360),
      imageUrl: null,
    }));
  }

  /* loadRemoteCatalog(category): download the full item list of one category from Picsum (1 request).
     Picsum has no categories, so Nature / City / Travel each map to a different page of its public list.
     Aborts after 8 s so a slow network never blocks the screen; the caller then uses the fallback.
     Returns: [{ id, title, ratio, hue, imageUrl }] */
  async function loadRemoteCatalog(category) {
    const windowIndex = CATEGORIES.findIndex((c) => c.id === category) + 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${PICSUM}/v2/list?page=${windowIndex}&limit=${ITEMS_PER_CATEGORY}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const photos = await res.json();
      return photos.map((p) => {
        const n = Number(p.id);
        const ratio = ratioFor(n);
        return {
          id: `${category}-${p.id}`,
          title: `${p.author} #${p.id}`,
          ratio,
          hue: hueFor(n),
          imageUrl: `${PICSUM}/id/${p.id}/400/${Math.round(400 * ratio)}`,
        };
      });
    } finally {
      clearTimeout(timer);
    }
  }

  const catalogCache = new Map();

  /* getCatalog(category): return the item list of a category, loading it only once.
     The pending promise is cached, so scrolling, searching and switching back to a category
     never trigger a second network call. Any remote failure silently switches to the fallback list. */
  function getCatalog(category) {
    if (!catalogCache.has(category)) {
      catalogCache.set(
        category,
        loadRemoteCatalog(category).catch(() => buildFallbackCatalog(category))
      );
    }
    return catalogCache.get(category);
  }

  /* fetchItems({ category, page, query }): the single entry point used by the UI.
     1. Get the category list (cached).
     2. Keep items whose title contains the search text (case-insensitive).
     3. Cut out one page of 10 items.
     4. Return the envelope with paging info; meta.hasMore tells the UI whether to keep scrolling.
     To use a real backend, replace only the body of this function; the UI does not change. */
  async function fetchItems({ category, page, query = "" }) {
    const catalog = await getCatalog(category);
    const q = query.trim().toLowerCase();
    const all = catalog.filter((item) => !q || item.title.toLowerCase().includes(q));
    const start = (page - 1) * PER_PAGE;
    const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    return {
      success: true,
      data: all.slice(start, start + PER_PAGE),
      meta: { page, perPage: PER_PAGE, total: all.length, totalPages, hasMore: page < totalPages },
    };
  }

  /* placeholderImage(item): build a small gradient SVG (as a data: URL) for an item.
     Shown for fallback items and when a photo fails to load, so a card is never an empty box.
     No network needed; size and colors come from the item's ratio and hue. */
  function placeholderImage(item) {
    const w = 300;
    const h = Math.round(w * item.ratio);
    const c1 = `hsl(${item.hue} 70% 55%)`;
    const c2 = `hsl(${(item.hue + 50) % 360} 70% 35%)`;
    const markup =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
      `<rect width="${w}" height="${h}" fill="url(#g)"/>` +
      `<circle cx="${w * 0.75}" cy="${h * 0.25}" r="${w * 0.12}" fill="rgba(255,255,255,.35)"/>` +
      `<path d="M0 ${h} L${w * 0.35} ${h * 0.62} L${w * 0.6} ${h * 0.82} L${w * 0.8} ${h * 0.55} L${w} ${h * 0.8} V${h}Z" fill="rgba(0,0,0,.22)"/>` +
      `</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  }

  return { CATEGORIES, fetchItems, placeholderImage };
})();
