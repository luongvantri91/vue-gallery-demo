/* Homepage of the demo (Vue 3, Composition API, string templates, no build step).
 *
 * Layout reproduces the reference mobile page, top to bottom:
 *   fixed header (logo, lottery tabs, download / search / share)
 *   -> banner carousel -> scrolling notice -> lottery tabs with dates
 *   -> latest draw result + countdown -> quick menu (2 rows of 5, first row sticks under the header)
 *   -> two-column masonry gallery with infinite scroll
 *   -> floating lottery switch -> fixed bottom tab bar.
 *
 * Data comes only from window.HomeApi (api.js).
 */
(() => {
  "use strict";
  const { createApp, ref, computed, watch, onMounted, onBeforeUnmount, nextTick } = Vue;
  const api = window.HomeApi;

  /* ---------- Icons (inline SVG paths, drawn with currentColor) ---------- */
  const ICONS = {
    image: '<path d="M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm3 3.2a1.6 1.6 0 100 3.2 1.6 1.6 0 000-3.2zM5 17h14l-4.5-6-3.2 4-2.3-2.6z"/>',
    live: '<path d="M4 6h16a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zm6 3v6l5-3z"/>',
    cap: '<path d="M12 4L1 9l11 5 9-4.1V15h2V9zM5 13.2V17c0 1.7 3.1 3 7 3s7-1.3 7-3v-3.8l-7 3.2z"/>',
    book: '<path d="M6 3h12a1 1 0 011 1v14H7a1 1 0 000 2h12v2H7a3 3 0 01-3-3V5a2 2 0 012-2zm3 3v4l2-1.2 2 1.2V6z"/>',
    history: '<path d="M13 3a9 9 0 11-8.5 12h2.2A7 7 0 1013 5a6.9 6.9 0 00-4.9 2L11 10H4V3l2.7 2.7A9 9 0 0113 3zm-1 5h2v4.6l3 1.8-1 1.7-4-2.4z"/>',
    star: '<path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z"/>',
    trend: '<path d="M3 17l6-6 4 4 7-8 1.4 1.4-8.4 9.6-4-4-4.6 4.6z"/>',
    paw: '<ellipse cx="12" cy="16" rx="5" ry="4"/><circle cx="6" cy="10" r="2"/><circle cx="18" cy="10" r="2"/><circle cx="9.5" cy="5.5" r="2"/><circle cx="14.5" cy="5.5" r="2"/>',
    dots: '<circle cx="5" cy="5" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>',
    download: '<path d="M11 3h2v9.2l3.6-3.6L18 10l-6 6-6-6 1.4-1.4 3.6 3.6zM5 18h14v2H5z"/>',
    search: '<path d="M10.5 3a7.5 7.5 0 015.9 12.1l4.3 4.3-1.4 1.4-4.3-4.3A7.5 7.5 0 1110.5 3zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11z"/>',
    share: '<path d="M14 3l7 6.5-7 6.5v-4c-4.4 0-7 1.3-9 4.5.4-5.5 3.7-9.2 9-9.8zM4 19h13v2H4z"/>',
    home: '<path d="M12 3l9 8h-2.5v9h-5v-6h-3v6h-5v-9H3z"/>',
    binoculars: '<path d="M5 4h3l1.2 6H4zM16 4h3l1 6h-5.2zM9 10h6v3H9z"/><circle cx="7" cy="16" r="4"/><circle cx="17" cy="16" r="4"/>',
    basket: '<path d="M2 10h20l-2 10H4zm5-1l3-6h4l3 6h-2l-2.2-4h-1.6L9 9z"/>',
    diamond: '<path d="M6 3h12l4 6-10 12L2 9z"/>',
    user: '<circle cx="12" cy="8" r="4.5"/><path d="M3.5 21c0-4.6 3.8-7.5 8.5-7.5s8.5 2.9 8.5 7.5z"/>',
    sound: '<path d="M3 9h4l5-4v14l-5-4H3zm13 .5a4 4 0 010 5l-1.2-1.2a2.3 2.3 0 000-2.6z"/>',
  };

  const Icon = {
    props: { name: { type: String, required: true }, size: { type: Number, default: 24 } },
    template: `<svg :width="size" :height="size" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" v-html="path"></svg>`,
    setup: (props) => ({ path: computed(() => ICONS[props.name] || "") }),
  };

  /* ---------- Small helpers ---------- */
  const pad2 = (n) => String(n).padStart(2, "0");
  const dateLabel = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;

  /* useToast(): one-line message at the bottom of the screen, auto-hides after 1.8 s. */
  function useToast() {
    const message = ref("");
    let timer = 0;
    const show = (text) => {
      message.value = text;
      clearTimeout(timer);
      timer = setTimeout(() => (message.value = ""), 1800);
    };
    onBeforeUnmount(() => clearTimeout(timer));
    return { message, show };
  }

  /* useCountdown(targetMs): "HH:MM:SS" until the target time, updated every second.
     When it reaches zero it calls onExpire once (the page then loads the next draw). */
  function useCountdown(targetMs, onExpire) {
    const text = ref("00:00:00");
    let timer = 0;
    const tick = () => {
      const diff = Math.max(0, Math.floor((targetMs.value - Date.now()) / 1000));
      text.value = `${pad2(Math.floor(diff / 3600))}:${pad2(Math.floor((diff % 3600) / 60))}:${pad2(diff % 60)}`;
      if (diff === 0 && targetMs.value) onExpire();
    };
    onMounted(() => {
      tick();
      timer = setInterval(tick, 1000);
    });
    onBeforeUnmount(() => clearInterval(timer));
    watch(targetMs, tick);
    return text;
  }

  /* useGallery(lotteryId): paging state + 2-column masonry.
     Each new card goes to the column with the smaller estimated height (ratio is known before the image loads,
     so the layout never jumps). Switching lottery resets to page 1; a stale response is ignored. */
  function useGallery(lotteryId) {
    const columns = ref([[], []]);
    const loading = ref(false);
    const hasMore = ref(true);
    const failed = ref(false);
    let page = 0;
    let heights = [0, 0];
    let generation = 0;

    const reset = () => {
      generation++;
      columns.value = [[], []];
      heights = [0, 0];
      page = 0;
      hasMore.value = true;
      failed.value = false;
      loading.value = false;
    };

    async function loadMore() {
      if (loading.value || !hasMore.value) return;
      const mine = generation;
      loading.value = true;
      failed.value = false;
      try {
        const res = await api.fetchGallery({ lottery: lotteryId.value, page: page + 1 });
        if (mine !== generation) return;
        page += 1;
        for (const item of res.data) {
          const col = heights[0] <= heights[1] ? 0 : 1;
          columns.value[col].push(item);
          heights[col] += item.ratio + 0.1;
        }
        hasMore.value = res.meta.hasMore;
      } catch (e) {
        if (mine === generation) failed.value = true;
      } finally {
        if (mine === generation) loading.value = false;
      }
    }

    return { columns, loading, hasMore, failed, reset, loadMore };
  }

  /* ---------- Components ---------- */
  const AppHeader = {
    components: { Icon },
    props: { lotteries: Array, current: String },
    emits: ["select", "action"],
    template: `
      <header class="header">
        <div class="logo"><b>图库<i>.demo</i></b><small>备用网址</small></div>
        <nav class="lottery-tab">
          <a v-for="l in lotteries" :key="l.id" class="list-tab-span" :class="{ active: l.id === current }" @click="$emit('select', l.id)"><span>{{ l.name }}</span></a>
        </nav>
        <div class="brt">
          <div class="bsearch" @click="$emit('action', 'download')"><Icon name="download" :size="20" /><span>下载</span></div>
          <div class="bsearch" @click="$emit('action', 'search')"><Icon name="search" :size="20" /><span>搜索</span></div>
          <div class="bsearch" @click="$emit('action', 'share')"><Icon name="share" :size="20" /><span>分享</span></div>
        </div>
      </header>`,
  };

  /* BannerSwiper: autoplay every 4 s, loops, swipe with touch/mouse drag, dots at the bottom. */
  const BannerSwiper = {
    props: { slides: Array },
    template: `
      <div class="home-top-banner" @touchstart.passive="start" @touchend="end" @mousedown="start" @mouseup="end" @mouseenter="paused = true" @mouseleave="paused = false">
        <div class="swiper-track" :style="{ transform: 'translateX(' + (-index * 100) + '%)' }">
          <div class="swiper-item" v-for="s in slides" :key="s.id"><img class="swiper-img" :src="s.imageUrl" alt="" draggable="false" referrerpolicy="no-referrer" @error="onImgError($event, s)"></div>
        </div>
        <div class="swiper-dots"><span v-for="(s, i) in slides" :key="s.id" :class="{ active: i === index }" @click="index = i"></span></div>
      </div>`,
    setup(props) {
      const index = ref(0);
      const paused = ref(false);
      let timer = 0;
      let startX = 0;
      const go = (step) => {
        const n = props.slides.length;
        if (n) index.value = (index.value + step + n) % n;
      };
      const point = (e) => (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
      const start = (e) => (startX = point(e));
      const end = (e) => {
        const dx = point(e) - startX;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      };
      const onImgError = (e, s) => {
        if (s.fallbackUrl && e.target.src !== s.fallbackUrl) e.target.src = s.fallbackUrl;
      };
      onMounted(() => (timer = setInterval(() => !paused.value && go(1), 4000)));
      onBeforeUnmount(() => clearInterval(timer));
      return { index, paused, start, end, onImgError };
    },
  };

  const NoticeBar = {
    components: { Icon },
    props: { text: String },
    template: `
      <div class="uni-noticebar">
        <Icon name="sound" :size="21" class="notice-icon" />
        <div class="notice-wrap"><span class="notice-text">{{ text }}</span></div>
      </div>`,
  };

  /* DrawTabs: one tab per lottery with its next draw date, plus a fixed blue "gallery" tab. */
  const DrawTabs = {
    props: { lotteries: Array, current: String },
    emits: ["select", "extra"],
    methods: { label: (id) => dateLabel(api.nextDrawAt(id)) },
    template: `
      <div class="tab-title">
        <ul>
          <li v-for="l in lotteries" :key="l.id" :class="{ active: l.id === current }" @click="$emit('select', l.id)">
            <div class="title">{{ l.name }}</div><div class="time">{{ label(l.id) }}</div>
          </li>
          <li class="extra" @click="$emit('extra')"><div class="title">600图库</div><div class="time">demo.local</div></li>
        </ul>
      </div>`,
  };

  /* DrawResult: latest draw balls (6 + "+" + special), zodiac / element under each, countdown to next draw. */
  const DrawResult = {
    props: { lottery: Object, draw: Object, countdown: String },
    emits: ["refresh", "history"],
    template: `
      <div class="kj-box-padding">
        <div class="kj-box-border">
          <div class="kj-box">
            <div class="kj-desc">{{ lottery.name }}第{{ draw ? draw.issue : '--' }}期开奖结果：</div>
            <div class="kj-btn" @click="$emit('refresh')">自动刷新</div>
            <div class="kj-btn" @click="$emit('history')">开奖记录</div>
          </div>
          <div class="kj-nums">
            <div class="nums-wrap" v-if="draw">
              <template v-for="(n, i) in draw.numbers" :key="n.value">
                <div class="nums-item plus" v-if="i === 6">+</div>
                <div class="nums-item">
                  <div class="nums-icon" :class="n.color">{{ n.value }}</div>
                  <div class="nums-desc">{{ n.zodiac }}/<span :class="n.elementClass">{{ n.element }}</span></div>
                </div>
              </template>
            </div>
            <div class="nums-wrap nums-loading" v-else>加载中…</div>
            <div class="count-down">第{{ draw ? draw.nextIssue : '--' }}期开奖倒计时：<b>{{ countdown }}</b></div>
          </div>
        </div>
      </div>`,
  };

  const MENU_ROW_1 = [
    { name: "彩色图库", icon: "image", bg: "linear-gradient(135deg,#1e9bff,#0057ff)" },
    { name: "黑白图库", icon: "image", bg: "linear-gradient(135deg,#9a9a9a,#444)" },
    { name: "开奖直播", icon: "live", bg: "linear-gradient(135deg,#ffb020,#ff5a3c)" },
    { name: "高手论坛", icon: "cap", bg: "linear-gradient(135deg,#7a6cf0,#3f8de0)" },
    { name: "资料大全", icon: "book", bg: "linear-gradient(135deg,#f07a7a,#d2434b)" },
  ];
  const MENU_ROW_2 = [
    { name: "开奖记录", icon: "history", bg: "linear-gradient(135deg,#17d6b8,#00a5b8)" },
    { name: "特码走势", icon: "star", bg: "linear-gradient(135deg,#ff9a8b,#ff6a88)" },
    { name: "正码走势", icon: "trend", bg: "linear-gradient(135deg,#6fd3f5,#2aa0e0)" },
    { name: "生肖走势", icon: "paw", bg: "linear-gradient(135deg,#ffd86f,#f7a935)" },
    { name: "路珠分析", icon: "dots", bg: "linear-gradient(135deg,#c9a8ff,#9d7bea)" },
  ];

  const MenuRow = {
    components: { Icon },
    props: { items: Array },
    emits: ["pick"],
    template: `
      <div class="navbar">
        <div class="menu-item" v-for="m in items" :key="m.name" @click="$emit('pick', m.name)">
          <div class="nav-icon" :style="{ background: m.bg }"><Icon :name="m.icon" :size="28" /></div>
          <span>{{ m.name }}</span>
        </div>
      </div>`,
  };

  /* Gallery: two columns of cards; a sentinel at the bottom triggers the next page. */
  const Gallery = {
    props: { columns: Array, loading: Boolean, hasMore: Boolean, failed: Boolean },
    emits: ["more", "pick"],
    template: `
      <section class="gallary-picture">
        <div class="columns">
          <div class="column" v-for="(col, c) in columns" :key="c">
            <div class="col" v-for="item in col" :key="item.id" @click="$emit('pick', item)">
              <img :src="item.imageUrl" :alt="item.title" loading="lazy" referrerpolicy="no-referrer" :style="{ aspectRatio: '1 / ' + item.ratio }" @error="onImgError($event, item)">
              <div class="inner"><div class="center">{{ item.title }}</div></div>
            </div>
          </div>
        </div>
        <div ref="sentinel" class="sentinel"></div>
        <p class="gallery-state" v-if="failed" @click="$emit('more')">加载失败，点击重试</p>
        <p class="gallery-state" v-else-if="loading">加载中…</p>
        <p class="gallery-state" v-else-if="!hasMore">没有更多了</p>
      </section>`,
    setup(props, { emit }) {
      const sentinel = ref(null);
      let observer = null;
      onMounted(() => {
        observer = new IntersectionObserver((entries) => entries[0].isIntersecting && !props.failed && emit("more"), { rootMargin: "400px" });
        observer.observe(sentinel.value);
      });
      // The sentinel may stay on screen after a page loads (short pages), so re-check on every state change.
      watch(() => [props.loading, props.hasMore], async () => {
        await nextTick();
        if (!props.loading && props.hasMore && !props.failed && sentinel.value) {
          const r = sentinel.value.getBoundingClientRect();
          if (r.top < window.innerHeight + 400) emit("more");
        }
      });
      onBeforeUnmount(() => observer && observer.disconnect());
      // A card whose image fails to load gets a generated poster of the same shape (only once, no retry loop).
      const onImgError = (e, item) => {
        if (!e.target.dataset.fallback) {
          e.target.dataset.fallback = "1";
          e.target.src = api.placeholderImage(item);
        }
      };
      return { sentinel, onImgError };
    },
  };

  /* PillBar: floating lottery switch above the tab bar. */
  const PillBar = {
    props: { lotteries: Array, current: String },
    emits: ["select"],
    template: `
      <div class="list-tab-btn">
        <a v-for="l in lotteries" :key="l.id" class="list-tab-span" :class="{ active: l.id === current }"
           :style="l.id === current ? null : { color: l.color, borderColor: l.color }" @click="$emit('select', l.id)">
          <i class="icon-channel" :style="{ background: l.id === current ? '#fff' : l.color, color: l.id === current ? '#07c160' : '#fff' }">{{ l.badge }}</i>
          <span>{{ l.name }}</span>
        </a>
      </div>`,
  };

  const TabBar = {
    components: { Icon },
    props: { current: String },
    emits: ["select"],
    data: () => ({
      tabs: [
        { key: "home", name: "图库", icon: "home" },
        { key: "discover", name: "发现", icon: "binoculars" },
        { key: "publish", name: "发布", icon: "basket", middle: true },
        { key: "sites", name: "好站", icon: "diamond" },
        { key: "me", name: "我的", icon: "user" },
      ],
    }),
    template: `
      <footer class="floor-bottom">
        <div class="item-tab" v-for="t in tabs" :key="t.key" :class="{ middle: t.middle }" @click="$emit('select', t.key)">
          <span class="tab-ico" v-if="t.middle"><Icon :name="t.icon" :size="26" /></span>
          <Icon v-else :name="t.icon" :size="20" class="tabbar-img" />
          <span :class="{ active: t.key === current }">{{ t.name }}</span>
        </div>
      </footer>`,
  };

  /* ---------- Root ---------- */
  const App = {
    components: { AppHeader, BannerSwiper, NoticeBar, DrawTabs, DrawResult, MenuRow, Gallery, PillBar, TabBar },
    setup() {
      const lotteries = api.LOTTERIES;
      const lotteryId = ref("mo");
      const lottery = computed(() => lotteries.find((l) => l.id === lotteryId.value));
      const banners = ref([]);
      const notice = ref("");
      const draw = ref(null);
      const nextDrawMs = computed(() => (draw.value ? draw.value.nextDrawAt : 0));
      const { message, show } = useToast();
      const gallery = useGallery(lotteryId);
      const tab = ref("home");

      const loadDraw = async () => {
        const id = lotteryId.value;
        const res = await api.fetchDraw(id);
        if (id === lotteryId.value) draw.value = res.data;
      };
      const countdown = useCountdown(nextDrawMs, loadDraw);

      const selectLottery = (id) => {
        if (id === lotteryId.value) return;
        lotteryId.value = id;
        draw.value = null;
        window.scrollTo({ top: 0 });
      };
      watch(lotteryId, () => {
        gallery.reset();
        loadDraw();
        gallery.loadMore();
      });

      const soon = (what) => show(`「${what}」为演示页面，暂未开放`);

      async function onHeaderAction(kind) {
        if (kind === "share") {
          const data = { title: document.title, url: location.href };
          if (navigator.share) return navigator.share(data).catch(() => {});
          try {
            await navigator.clipboard.writeText(data.url);
            show("链接已复制");
          } catch (e) {
            show(data.url);
          }
          return;
        }
        soon(kind === "search" ? "搜索" : "下载");
      }

      onMounted(async () => {
        const [b, n] = await Promise.all([api.fetchBanners(), api.fetchNotice()]);
        banners.value = b.data;
        notice.value = n.data.text;
        loadDraw();
        gallery.loadMore();
      });

      return {
        lotteries, lotteryId, lottery, banners, notice, draw, countdown, tab, message,
        ...gallery, MENU_ROW_1, MENU_ROW_2,
        selectLottery, soon, onHeaderAction,
        refreshDraw: async () => { await loadDraw(); show("已刷新"); },
        selectTab: (key) => (key === "home" ? (tab.value = "home") : soon({ discover: "发现", publish: "发布", sites: "好站", me: "我的" }[key])),
      };
    },
    template: `
      <div class="app">
        <AppHeader :lotteries="lotteries" :current="lotteryId" @select="selectLottery" @action="onHeaderAction" />
        <main class="page">
          <BannerSwiper :slides="banners" />
          <NoticeBar :text="notice" />
          <DrawTabs :lotteries="lotteries" :current="lotteryId" @select="selectLottery" @extra="soon('600图库')" />
          <DrawResult :lottery="lottery" :draw="draw" :countdown="countdown" @refresh="refreshDraw" @history="soon('开奖记录')" />
          <MenuRow class="menu-sticky" :items="MENU_ROW_1" @pick="soon" />
          <MenuRow :items="MENU_ROW_2" @pick="soon" />
          <Gallery :columns="columns" :loading="loading" :has-more="hasMore" :failed="failed" @more="loadMore" @pick="soon($event.title)" />
        </main>
        <PillBar :lotteries="lotteries" :current="lotteryId" @select="selectLottery" />
        <TabBar :current="tab" @select="selectTab" />
        <div class="toast" :class="{ show: message }">{{ message }}</div>
      </div>`,
  };

  createApp(App).mount("#app");
})();
