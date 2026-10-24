/* Demo Gallery: Vue 3 single-page app (loaded from CDN, no build step).
 *
 * Screen: header (tabs, search, share) > quick menu > 2-column photo grid (infinite scroll)
 *         > category pills > bottom navigation.
 *
 * File layout:
 *   1. Composables  - reusable logic with state (toast, route, gallery)
 *   2. Components   - small UI pieces (icon, header, menu, card, grid, pills, bottom nav)
 *   3. Root App     - wires everything together and mounts the page
 *
 * Data flow: UI event > useGallery > GalleryApi.fetchItems() > columns state > re-render.
 */
(() => {
  "use strict";

  const { createApp, ref, computed, watch, onMounted, onBeforeUnmount } = Vue;
  const { CATEGORIES, fetchItems, placeholderImage } = window.GalleryApi;

  const CAPTION_RATIO = 0.22;
  const SEARCH_DEBOUNCE_MS = 300;

  const QUICK_MENU = [
    { label: "Gallery", colors: ["#00a6ff", "#0050ff"], icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m21 16-5-5-8 8"/>' },
    { label: "Gray Gallery", colors: ["#9ca3af", "#4b5563"], icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 6"/>' },
    { label: "Live", colors: ["#fde68a", "#fecaca"], dark: true, icon: '<circle cx="12" cy="12" r="3"/><path d="M6.3 6.3a8 8 0 0 0 0 11.4m11.4 0a8 8 0 0 0 0-11.4"/>' },
    { label: "Community", colors: ["#6366f1", "#06b6d4"], icon: '<path d="M2 9 12 4l10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>' },
    { label: "Library", colors: ["#f87171", "#dc2626"], icon: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M9 8h6"/>' },
  ];

  const NAV = [
    { route: "home", label: "Home", icon: '<path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>' },
    { route: "discover", label: "Discover", icon: '<circle cx="7" cy="14" r="3.5"/><circle cx="17" cy="14" r="3.5"/><path d="M10 14h4M7 10V5h3M17 10V5h-3"/>' },
    { route: "publish", label: "Publish", center: true, icon: '<path d="M5 9h14l-1.5 10h-11z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>' },
    { route: "sites", label: "Sites", icon: '<path d="m12 3 3 6 6 .8-4.5 4.4 1 6.3L12 17.6 6.5 20.5l1-6.3L3 9.8 9 9z"/>' },
    { route: "me", label: "Me", icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 15-5 16 0"/>' },
  ];

  /* ---------- Composables ---------- */

  /* useToast(): small temporary message ("Link copied", "... is not part of the exercise").
     show(text) displays it for 1.8 s; a new message replaces the old one and restarts the timer. */
  function useToast() {
    const message = ref("");
    let timer;
    function show(text) {
      message.value = text;
      clearTimeout(timer);
      timer = setTimeout(() => (message.value = ""), 1800);
    }
    onBeforeUnmount(() => clearTimeout(timer));
    return { message, show };
  }

  /* useHashRoute(): tiny router based on the URL hash (#/home, #/me ...), no library needed.
     Returns a reactive route name. Unknown hashes fall back to "home".
     Listens to browser back/forward (hashchange) and cleans up when the app unmounts. */
  function useHashRoute() {
    const read = () => {
      const match = location.hash.match(/^#\/([a-z]+)/);
      const route = match ? match[1] : "home";
      return NAV.some((n) => n.route === route) ? route : "home";
    };
    const route = ref(read());
    const onChange = () => (route.value = read());
    onMounted(() => window.addEventListener("hashchange", onChange));
    onBeforeUnmount(() => window.removeEventListener("hashchange", onChange));
    return route;
  }

  /* useGallery(onLoaded): the core business logic of the home page: "show photos, page by page".
     State:  category, query, columns (two lists of items), loading, hasMore, total, failed.
     Actions:
       loadNext() - fetch the next page and append it. Ignored while loading or when there is no more data.
                    Each item goes into the currently shorter column (masonry look).
                    Responses from an outdated request are dropped (requestId guard), so quickly
                    switching category or typing never shows mixed results.
       reset()    - start over (new category or new search text): clear everything, load page 1.
     statusText - message under the grid: error + retry hint, "No results", or "End of list".
     onLoaded   - callback after each load, used by the page to check if more content is needed. */
  function useGallery(onLoaded) {
    const category = ref(CATEGORIES[0].id);
    const query = ref("");
    const columns = ref([[], []]);
    const loading = ref(false);
    const hasMore = ref(true);
    const total = ref(null);
    const failed = ref(false);

    let heights = [0, 0];
    let page = 0;
    let requestId = 0;

    async function loadNext() {
      if (loading.value || !hasMore.value) return;
      loading.value = true;
      failed.value = false;
      const current = requestId;

      try {
        const res = await fetchItems({ category: category.value, page: page + 1, query: query.value });
        if (current !== requestId) return;
        res.data.forEach((item) => {
          const target = heights[0] <= heights[1] ? 0 : 1;
          columns.value[target].push(item);
          heights[target] += item.ratio + CAPTION_RATIO;
        });
        page = res.meta.page;
        hasMore.value = res.meta.hasMore;
        total.value = res.meta.total;
      } catch (err) {
        if (current === requestId) failed.value = true;
      } finally {
        if (current === requestId) {
          loading.value = false;
          onLoaded?.();
        }
      }
    }

    function reset() {
      requestId += 1;
      page = 0;
      heights = [0, 0];
      columns.value = [[], []];
      hasMore.value = true;
      total.value = null;
      failed.value = false;
      loading.value = false;
      loadNext();
    }

    const statusText = computed(() => {
      if (failed.value) return "Could not load data. Tap to retry.";
      if (loading.value) return "";
      if (total.value === 0) return "No results found.";
      if (total.value !== null && !hasMore.value) return `End of list · ${total.value} items`;
      return "";
    });

    return { category, query, columns, loading, hasMore, failed, statusText, loadNext, reset };
  }

  /* ---------- Components ---------- */

  /* AppIcon: draws one SVG icon from the path data it receives. Used by every button with an icon. */
  const AppIcon = {
    props: { paths: { type: String, required: true } },
    // `paths` only ever receives the static constants defined in this file.
    template: `<svg viewBox="0 0 24 24" aria-hidden="true" v-html="paths"></svg>`,
  };

  /* AppHeader: top bar with brand, category tabs and the Download / Search / Share actions.
     Emits: select (tab clicked), update:query (search text changed), share, download.
     toggleSearch(): open or close the search box; closing clears the text, which resets the results. */
  const AppHeader = {
    components: { AppIcon },
    props: { categories: Array, active: String },
    emits: ["select", "update:query", "share", "download"],
    data() {
      return {
        searchOpen: false,
        text: "",
        icons: {
          download: '<path d="M12 3v11m0 0-4-4m4 4 4-4M5 19h14"/>',
          search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
          share: '<path d="M14 4h6v6m0-6-9 9M18 14v5H5V6h5"/>',
        },
      };
    },
    watch: {
      text(value) {
        this.$emit("update:query", value);
      },
    },
    methods: {
      toggleSearch() {
        this.searchOpen = !this.searchOpen;
        if (this.searchOpen) this.$nextTick(() => this.$refs.input?.focus());
        else this.text = "";
      },
    },
    template: `
      <header class="header">
        <div class="header__top">
          <a class="brand" href="#/home">
            <span class="brand__name">Demo<em>Gallery</em></span>
            <span class="brand__sub">Backup site</span>
          </a>
          <nav class="tabs" aria-label="Categories">
            <button v-for="c in categories" :key="c.id" type="button"
              class="tab" :class="{ 'is-active': c.id === active }"
              :aria-pressed="c.id === active" @click="$emit('select', c.id)">{{ c.name }}</button>
          </nav>
          <div class="actions">
            <button class="action" type="button" aria-label="Download" @click="$emit('download')">
              <app-icon :paths="icons.download" /><span>Download</span>
            </button>
            <button class="action" type="button" aria-label="Search" :aria-expanded="searchOpen" @click="toggleSearch">
              <app-icon :paths="icons.search" /><span>Search</span>
            </button>
            <button class="action" type="button" aria-label="Share" @click="$emit('share')">
              <app-icon :paths="icons.share" /><span>Share</span>
            </button>
          </div>
        </div>
        <form v-if="searchOpen" class="search" role="search" @submit.prevent>
          <input ref="input" v-model="text" type="search" placeholder="Search by title…"
            autocomplete="off" aria-label="Search by title">
        </form>
      </header>`,
  };

  /* QuickMenu: horizontal row of round shortcut icons under the header (static content).
     Emits: pick(label) when an entry is tapped. */
  const QuickMenu = {
    components: { AppIcon },
    props: { items: Array },
    emits: ["pick"],
    template: `
      <ul class="quick">
        <li v-for="item in items" :key="item.label">
          <button class="quick__item" type="button" @click="$emit('pick', item.label)">
            <span class="quick__icon"
              :style="{ background: 'linear-gradient(135deg,' + item.colors[0] + ',' + item.colors[1] + ')', color: item.dark ? '#b45309' : '' }">
              <app-icon :paths="item.icon" />
            </span>
            <span>{{ item.label }}</span>
          </button>
        </li>
      </ul>`,
  };

  /* GalleryCard: one photo with its title.
     src: the remote photo, or a generated SVG placeholder if the item has no image or the image failed (@error).
     frameStyle: reserves the card's height from the item's ratio before the photo loads, avoiding layout jumps. */
  const GalleryCard = {
    props: { item: { type: Object, required: true } },
    data() {
      return { imageFailed: false };
    },
    computed: {
      src() {
        return this.item.imageUrl && !this.imageFailed ? this.item.imageUrl : placeholderImage(this.item);
      },
      frameStyle() {
        return { aspectRatio: `1 / ${this.item.ratio}` };
      },
    },
    template: `
      <article class="card">
        <div class="card__img" :style="frameStyle">
          <img :src="src" :alt="item.title" loading="lazy" decoding="async" @error="imageFailed = true">
        </div>
        <p class="card__title">{{ item.title }}</p>
      </article>`,
  };

  /* MasonryGrid: renders the two columns of cards; shows a skeleton block at the end of each column while loading. */
  const MasonryGrid = {
    components: { GalleryCard },
    props: { columns: Array, loading: Boolean },
    template: `
      <div class="grid" aria-live="polite">
        <div v-for="(col, i) in columns" :key="i" class="grid__col">
          <gallery-card v-for="item in col" :key="item.id" :item="item" />
          <div v-if="loading" class="skeleton" :style="{ aspectRatio: i ? '1 / 1.8' : '1 / 1.4' }"></div>
        </div>
      </div>`,
  };

  /* CategoryPills: floating shortcut to switch category without scrolling back to the header. Emits: select(id). */
  const CategoryPills = {
    props: { categories: Array, active: String },
    emits: ["select"],
    template: `
      <div class="pills" role="group" aria-label="Quick category switch">
        <button v-for="c in categories" :key="c.id" type="button"
          class="pill" :class="{ 'is-active': c.id === active }"
          :aria-pressed="c.id === active" @click="$emit('select', c.id)">
          <span class="pill__dot"></span>{{ c.name }}
        </button>
      </div>`,
  };

  /* BottomNav: 5-item bottom tab bar. Each item is a link to #/route; the current route is highlighted. */
  const BottomNav = {
    components: { AppIcon },
    props: { items: Array, current: String },
    template: `
      <nav class="bottom" aria-label="Main navigation">
        <a v-for="n in items" :key="n.route" :href="'#/' + n.route"
          class="bottom__item" :class="{ 'is-active': n.route === current, 'bottom__item--center': n.center }"
          :aria-current="n.route === current ? 'page' : null">
          <app-icon :paths="n.icon" /><span>{{ n.label }}</span>
        </a>
      </nav>`,
  };

  /* ---------- Root ---------- */

  /* App: root component. Connects the route, the gallery state and the UI components.
     - Infinite scroll: an invisible "sentinel" at the bottom of the list is watched by IntersectionObserver;
       when it comes into view (200 px early) the next page is loaded.
     - recheck(): after each load, re-observe the sentinel so a tall screen keeps loading until it is filled.
     - selectCategory(id): change category, reload from page 1, scroll to top.
     - Search: typing is debounced (300 ms) so one reload happens after the user stops typing.
     - share(): native share sheet if available, otherwise copy the link; cancelling is not an error.
     - retry(): tap the error message to try loading again.
     - Non-home routes show a simple "not part of the exercise" placeholder. */
  const App = {
    components: { AppHeader, QuickMenu, MasonryGrid, CategoryPills, BottomNav },
    setup() {
      const content = ref(null);
      const sentinel = ref(null);
      const route = useHashRoute();
      const toast = useToast();
      let observer;

      // Re-observing makes the observer fire again, which keeps filling a tall viewport.
      const recheck = () => {
        if (!observer || !sentinel.value) return;
        observer.unobserve(sentinel.value);
        observer.observe(sentinel.value);
      };

      const gallery = useGallery(recheck);

      onMounted(() => {
        observer = new IntersectionObserver(
          (entries) => entries.some((e) => e.isIntersecting) && gallery.loadNext(),
          { root: content.value, rootMargin: "200px" }
        );
        observer.observe(sentinel.value);
        gallery.reset();
      });
      onBeforeUnmount(() => observer?.disconnect());

      function selectCategory(id) {
        if (id === gallery.category.value) return;
        gallery.category.value = id;
        gallery.reset();
        if (content.value) content.value.scrollTop = 0;
      }

      let searchTimer;
      watch(gallery.query, () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          gallery.reset();
          if (content.value) content.value.scrollTop = 0;
        }, SEARCH_DEBOUNCE_MS);
      });

      async function share() {
        const data = { title: document.title, url: location.href };
        try {
          if (navigator.share) await navigator.share(data);
          else {
            await navigator.clipboard.writeText(data.url);
            toast.show("Link copied");
          }
        } catch (err) {
          if (err.name !== "AbortError") toast.show("Sharing is not available");
        }
      }

      function retry() {
        if (!gallery.failed.value) return;
        gallery.failed.value = false;
        gallery.loadNext();
      }

      const isHome = computed(() => route.value === "home");
      const otherTitle = computed(() => NAV.find((n) => n.route === route.value)?.label ?? "");

      return {
        content, sentinel, route, isHome, otherTitle, toast,
        categories: CATEGORIES, quickMenu: QUICK_MENU, nav: NAV,
        gallery, selectCategory, share, retry,
      };
    },
    template: `
      <div class="app">
        <app-header
          :categories="categories" :active="gallery.category.value"
          @select="selectCategory"
          @update:query="gallery.query.value = $event"
          @share="share"
          @download="toast.show('Download is not part of the exercise')" />

        <main class="content" ref="content">
          <section v-show="isHome">
            <quick-menu :items="quickMenu" @pick="toast.show($event + ' is not part of the exercise')" />
            <masonry-grid :columns="gallery.columns.value" :loading="gallery.loading.value" />
            <p class="status" role="status" @click="retry">{{ gallery.statusText.value }}</p>
            <div class="sentinel" ref="sentinel"></div>
          </section>

          <section v-if="!isHome" class="view--placeholder">
            <h2>{{ otherTitle }}</h2>
            <p>This section is not part of the exercise.</p>
          </section>
        </main>

        <category-pills v-show="isHome" :categories="categories" :active="gallery.category.value" @select="selectCategory" />
        <bottom-nav :items="nav" :current="route" />
        <div v-if="toast.message.value" class="toast" role="status">{{ toast.message.value }}</div>
      </div>`,
  };

  createApp(App).mount("#app");
})();
