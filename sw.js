/* あかりちゃんガチャ v2 — Service Worker（ビルドごとに BUILD_ID と PRECACHE が埋め込まれる）
 * - キャッシュ名は akari-v2-shell-{buildId}。v1や他アプリのキャッシュには触れない。
 * - 必要ファイル一式の取得に成功したときだけ install が完了する（途中で通信が切れたら旧版のまま）。
 * - skipWaiting は自動で呼ばない。スタッフが「更新して再起動」を押したときだけメッセージで有効化する。
 */
const BUILD_ID = '9328791dfce9';
const PREFIX = 'akari-v2-shell-';
const CACHE = PREFIX + BUILD_ID;
const PRECACHE = ["./","assets/index-C9bK5Mxj.js","assets/index-Dx31QCEg.css","audio/jackpot.mp3","audio/spin.mp3","fonts/MochiyPopOne-jp.woff2","fonts/MochiyPopOne-latin.woff2","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/icon.svg","img/art/banzai.png","img/art/guide.png","img/art/salute.png","img/prizes/magnet.jpg","img/prizes/marker.png","img/prizes/pin.png","img/prizes/stand.png","index.html","manifest.webmanifest","build-info.json","precache.json"];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const scope = self.registration.scope;
    const reqs = PRECACHE.map((p) => new Request(new URL(p, scope).href, { cache: 'reload' }));
    await cache.addAll(reqs); // 1つでも失敗すれば例外 → インストール失敗 → 旧版を維持
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k.startsWith(PREFIX) && k !== CACHE) await caches.delete(k); // v2自身の旧版だけ削除
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'GET_VERSION' && event.source) event.source.postMessage({ type: 'VERSION', buildId: BUILD_ID });
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    let hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') {
      hit = await cache.match(new URL('index.html', self.registration.scope).href);
      if (hit) return hit;
    }
    try {
      return await fetch(req);
    } catch (e) {
      if (req.mode === 'navigate') {
        const fallback = await cache.match(new URL('index.html', self.registration.scope).href);
        if (fallback) return fallback;
      }
      throw e;
    }
  })());
});
