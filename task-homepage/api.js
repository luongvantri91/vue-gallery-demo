/* Data layer of the demo (the only file that knows where data comes from).
 *
 * The reference homepage shows, for one "lottery" at a time: a banner, a notice line, the latest draw result,
 * a countdown to the next draw, a quick menu and an infinite gallery of poster images.
 * Gallery posters come from the same public image API the reference page calls (no key, CORS open);
 * everything else (banners, notice, draw numbers) is generated locally and seeded, so it is identical on every reload.
 * If the image API fails, the gallery falls back to generated posters. All numbers are DEMO data, not real results.
 *
 * Response envelope (same style as the paginated API found in the analysis task):
 *   { success, data, meta? }
 *
 * Public API: LOTTERIES, fetchBanners(), fetchNotice(), fetchDraw(id), fetchGallery({ lottery, page }), nextDrawAt(id)
 * To use a real backend, replace only the bodies of these functions; the UI does not change.
 */
window.HomeApi = (() => {
  "use strict";

  const LOTTERIES = [
    { id: "hk", name: "港彩六合", color: "#bf4141", badge: "港", drawAt: [21, 32] },
    { id: "mo", name: "澳门六合", color: "#07c160", badge: "澳", drawAt: [21, 30] },
    { id: "k8", name: "快乐8六合", color: "#f5a21a", badge: "8", drawAt: [20, 0] },
  ];

  const PER_PAGE = 20;
  const TOTAL_ITEMS = 100;
  const LATENCY_MS = 250;
  const ZODIAC = ["马", "蛇", "龙", "兔", "虎", "牛", "鼠", "猪", "狗", "鸡", "猴", "羊"];
  const ELEMENTS = [
    { name: "金", cls: "wx-jin" },
    { name: "木", cls: "wx-mu" },
    { name: "水", cls: "wx-shui" },
    { name: "火", cls: "wx-huo" },
    { name: "土", cls: "wx-tu" },
  ];
  const RED = new Set([1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46]);
  const BLUE = new Set([3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48]);
  const TITLES = ["图解跑狗", "九肖30码", "玄机报", "马会传真", "12码特图", "四不像", "十码精选", "平特一肖",
    "六合宝典", "心水论坛", "金牌资料", "幸运锦囊", "博士论码", "神算子", "一语中特", "天机妙算"];
  const BANNER_IMAGES = [
    "https://res-img1.ptallenvery.com/image/qxw750_280.gif",
    "https://res-img1.ptallenvery.com/image/dc750_280.gif",
    "https://res-img1.ptallenvery.com/image/jc750_280.gif",
    "https://res-img1.ptallenvery.com/image/mc_800x280-tuku.gif",
    "https://res-img1.ptallenvery.com/image/54949.jpg?3",
  ];
  const BANNER_TEXTS = ["精选图库", "每日更新", "高手论坛", "资料大全", "开奖直播"];
  const BANNER_SUBS = ["演示站 · 仅供界面展示", "资料每日同步更新", "交流 · 分享 · 学习", "图文资料一应俱全", "界面演示 · 非真实开奖"];
  const IMAGE_API = "https://tuku-be.ptallenvery.com/api/public/pictures";
  const REMOTE_TYPE = { hk: "hongkong", mo: "macau", k8: "kl8" };
  const REQUEST_TIMEOUT_MS = 8000;
  const BLOCKED_TITLE = /春宫|女人味|男人味|相入非非|美人鱼|欲|情|色|艳|性|床|裸|妖|嫩|诱/;

  const delay = (value) => new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
  const lotteryOf = (id) => LOTTERIES.find((l) => l.id === id) || LOTTERIES[1];
  const escapeXml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
  const toDataUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  /* seededRandom(seed): same seed, same sequence. Keeps the demo identical on every run. */
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

  const seedOf = (id) => [...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  const dayOfYear = (d) => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);

  /* nextDrawAt(id): the next time (Date) this lottery draws; today if still ahead, else tomorrow. */
  function nextDrawAt(id) {
    const [h, m] = lotteryOf(id).drawAt;
    const t = new Date();
    t.setHours(h, m, 0, 0);
    if (t <= new Date()) t.setDate(t.getDate() + 1);
    return t;
  }

  /* describeNumber(n): everything the result row shows under one ball: color, zodiac, element. */
  function describeNumber(n) {
    const element = ELEMENTS[n % 5];
    return {
      value: String(n).padStart(2, "0"),
      color: RED.has(n) ? "red" : BLUE.has(n) ? "blue" : "green",
      zodiac: ZODIAC[(n - 1) % 12],
      element: element.name,
      elementClass: element.cls,
    };
  }

  /* fetchDraw(id): latest draw (7 distinct numbers of 1-49: 6 regular + 1 special) and the next issue. */
  function fetchDraw(id) {
    const rand = seededRandom(seedOf(id) + dayOfYear(new Date()));
    const picked = [];
    while (picked.length < 7) {
      const n = 1 + Math.floor(rand() * 49);
      if (!picked.includes(n)) picked.push(n);
    }
    const issue = dayOfYear(new Date()) - 1;
    return delay({
      success: true,
      data: {
        lottery: id,
        issue,
        numbers: picked.map(describeNumber),
        nextIssue: issue + 1,
        nextDrawAt: nextDrawAt(id).getTime(),
      },
    });
  }

  /* fetchNotice(): the scrolling announcement line. */
  function fetchNotice() {
    return delay({ success: true, data: { text: "欢迎使用图库演示站：本页面所有号码与图片均为演示数据，仅用于界面展示，请勿作任何参考。" } });
  }

  /* fetchBanners(): the 5 public banner images used by the reference home page (hotlinked, test only).
     Each slide also carries a generated SVG `fallbackUrl`, used if the remote image fails to load. */
  function fetchBanners() {
    const data = BANNER_TEXTS.map((text, i) => {
      const dark = i % 2 ? "#7a0c1c" : "#9c0f24";
      return {
        id: i + 1,
        imageUrl: BANNER_IMAGES[i],
        fallbackUrl: toDataUrl(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 280">` +
            `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0223c"/><stop offset="1" stop-color="${dark}"/></linearGradient>` +
            `<linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6b0"/><stop offset="1" stop-color="#f5b81c"/></linearGradient></defs>` +
            `<rect width="750" height="280" fill="url(#g)"/>` +
            `<rect x="10" y="10" width="730" height="260" rx="14" fill="none" stroke="#f5c542" stroke-width="3"/>` +
            `<circle cx="650" cy="40" r="120" fill="rgba(255,214,102,.14)"/><circle cx="80" cy="260" r="90" fill="rgba(255,214,102,.12)"/>` +
            `<text x="375" y="150" font-size="92" font-weight="900" text-anchor="middle" fill="url(#t)" stroke="#6b0a18" stroke-width="3" paint-order="stroke" font-family="'Microsoft YaHei','PingFang SC',sans-serif">${escapeXml(text)}</text>` +
            `<rect x="215" y="188" width="320" height="46" rx="23" fill="#fff6d6"/>` +
            `<text x="375" y="221" font-size="26" font-weight="700" text-anchor="middle" fill="#b3122c" font-family="'Microsoft YaHei','PingFang SC',sans-serif">${escapeXml(BANNER_SUBS[i])}</text>` +
            `</svg>`
        ),
      };
    });
    return delay({ success: true, data });
  }

  /* posterImage(item, rand): generated "poster" with a framed title and fake text lines.
     Used when the public image API is unreachable, and as the per-card fallback when one image fails to load. */
  function posterImage(item, rand) {
    const w = 300;
    const h = Math.round(w * item.ratio);
    const frame = `hsl(${item.hue} 45% 38%)`;
    const bg = `hsl(${item.hue} 60% 90%)`;
    const lines = Array.from({ length: Math.max(3, Math.floor((h - 150) / 34)) }, (_, i) => {
      const nums = Array.from({ length: 5 }, () => String(1 + Math.floor(rand() * 49)).padStart(2, "0")).join(" ");
      return `<text x="150" y="${150 + i * 34}" font-size="20" text-anchor="middle" fill="hsl(${item.hue} 40% 25%)">${nums}</text>`;
    }).join("");
    return toDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">` +
        `<rect width="${w}" height="${h}" fill="${bg}"/>` +
        `<rect x="6" y="6" width="${w - 12}" height="${h - 12}" fill="none" stroke="${frame}" stroke-width="4" rx="6"/>` +
        `<circle cx="${w - 40}" cy="40" r="22" fill="${frame}" opacity=".25"/>` +
        `<text x="150" y="72" font-size="40" font-weight="700" text-anchor="middle" fill="${frame}" font-family="serif">${escapeXml(item.title)}</text>` +
        `<text x="150" y="104" font-size="16" text-anchor="middle" fill="hsl(${item.hue} 40% 35%)">第${item.issue}期 · 演示</text>` +
        lines +
        `</svg>`
    );
  }

  /* placeholderImage(item): generated poster for one card (same ratio), seeded by the item id. */
  function placeholderImage(item) {
    const seed = seedOf(String(item.id));
    return posterImage({ ...item, hue: seed % 360, issue: dayOfYear(new Date()) - 1 }, seededRandom(seed));
  }

  /* fetchRemoteGallery({ lottery, page }): one page from the public image API (no key, CORS open),
     the same endpoint family as API #1 of the analysis task. Items whose title looks adult-oriented are dropped.
     Images are loaded straight from the public CDN; nothing is copied into this project. */
  async function fetchRemoteGallery({ lottery, page }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const url = `${IMAGE_API}/${REMOTE_TYPE[lottery]}?sort=site&page=${page}&limit=${PER_PAGE}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (!body.success) throw new Error("API error");
      const data = body.data
        .filter((r) => r.latest && (r.latest.thumbnailUrl || r.latest.url) && !BLOCKED_TITLE.test(r.name))
        .map((r) => ({
          id: `${lottery}-${r.id}`,
          title: r.name,
          ratio: Math.min(3, Math.max(0.5, r.latest.height / r.latest.width)) || 1.4,
          imageUrl: r.latest.thumbnailUrl || r.latest.url,
        }));
      return { success: true, data, meta: body.meta };
    } finally {
      clearTimeout(timer);
    }
  }

  /* fetchGeneratedGallery({ lottery, page }): offline fallback, same item shape and paging. */
  function fetchGeneratedGallery({ lottery, page }) {
    const rand = seededRandom(seedOf(lottery) * 13);
    const issue = dayOfYear(new Date()) - 1;
    const all = Array.from({ length: TOTAL_ITEMS }, (_, i) => {
      const item = {
        id: `${lottery}-${i + 1}`,
        title: TITLES[i % TITLES.length] + (i >= TITLES.length ? String.fromCharCode(64 + Math.floor(i / TITLES.length)) : ""),
        ratio: 1 + rand() * 0.85,
        hue: Math.floor(rand() * 360),
        issue,
      };
      item.imageUrl = posterImage(item, rand);
      return item;
    });
    const start = (page - 1) * PER_PAGE;
    return delay({
      success: true,
      data: all.slice(start, start + PER_PAGE).map(({ id, title, ratio, imageUrl }) => ({ id, title, ratio, imageUrl })),
      meta: { page, perPage: PER_PAGE, total: TOTAL_ITEMS, totalPages: Math.ceil(TOTAL_ITEMS / PER_PAGE), hasMore: start + PER_PAGE < TOTAL_ITEMS },
    });
  }

  /* fetchGallery({ lottery, page }): one page of poster cards; meta.hasMore tells the UI whether to keep loading.
     Public image API first; on any failure the page keeps working with generated posters.
     Item shape: { id, title, ratio (height / width), imageUrl }. */
  async function fetchGallery(args) {
    try {
      return await fetchRemoteGallery(args);
    } catch (e) {
      return fetchGeneratedGallery(args);
    }
  }

  return { LOTTERIES, fetchBanners, fetchNotice, fetchDraw, fetchGallery, placeholderImage, nextDrawAt };
})();
