// Cloudflare Worker reverse proxy for characterground, sitting on a free *.workers.dev subdomain
// in front of the Render backend. No domain purchase needed — this is the free-tier tradeoff:
// real Cloudflare WAF/bot-management requires owning a domain and pointing its nameservers at
// Cloudflare, which isn't happening here. What this Worker actually does instead:
//
//   1. Blocks requests with no User-Agent or an obviously scripted one (curl, python-requests,
//      scrapy, wget, etc.) — cheap, stateless, catches the laziest bots outright.
//   2. Per-IP rate limiting using the Cache API. This is best-effort, not a true global counter —
//      Cloudflare's Cache API is scoped per-datacenter, so a determined attacker spreading
//      requests across many edge locations can exceed the nominal limit. It's still a real,
//      meaningful floor against a single script hammering one endpoint from one place, which is
//      the overwhelmingly common case for small-app abuse.
//   3. Tighter limit specifically on /login and /signup, since those are the two endpoints where
//      abuse (credential stuffing, signup spam) is cheapest to attempt and most worth slowing down.
//   4. Otherwise passes every request straight through to Render, untouched — same method,
//      headers, cookies, body — so sessions and everything else behave exactly like the Worker
//      isn't there.
//
// This is NOT Cloudflare's actual WAF/bot-management product. If real edge-level protection ever
// matters more than the cost of a cheap domain, that's the upgrade path.

const ORIGIN = "https://characterground-er73.onrender.com";

const GENERAL_RATE_LIMIT = 60; // requests per IP per window, general traffic
const AUTH_RATE_LIMIT = 10; // requests per IP per window, /login and /signup specifically
const RATE_WINDOW_SECONDS = 60;

const AUTH_PATHS = new Set(["/login", "/signup"]);

const BLOCKED_UA_SUBSTRINGS = ["curl/", "python-requests", "scrapy", "libwww-perl", "wget/", "go-http-client"];

function isBlockedUserAgent(ua) {
  if (!ua) return true; // a real browser always sends a User-Agent
  const lowered = ua.toLowerCase();
  return BLOCKED_UA_SUBSTRINGS.some((bad) => lowered.includes(bad));
}

async function getCount(cache, key) {
  const cached = await cache.match(key);
  if (!cached) return 0;
  try {
    const body = await cached.json();
    return body.count || 0;
  } catch {
    return 0;
  }
}

async function bumpCount(cache, key, count, maxAgeSeconds) {
  const res = new Response(JSON.stringify({ count }), {
    headers: {
      "Cache-Control": `max-age=${maxAgeSeconds}`,
      "Content-Type": "application/json",
    },
  });
  await cache.put(key, res);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const ua = request.headers.get("User-Agent") || "";

    if (isBlockedUserAgent(ua)) {
      return new Response("blocked", { status: 403 });
    }

    const isAuthPath = AUTH_PATHS.has(url.pathname);
    const limit = isAuthPath ? AUTH_RATE_LIMIT : GENERAL_RATE_LIMIT;
    const bucket = isAuthPath ? "auth" : "general";
    const window = Math.floor(Date.now() / (RATE_WINDOW_SECONDS * 1000));

    const cache = caches.default;
    const cacheKey = new Request(`https://ratelimit.internal/${bucket}/${ip}/${window}`);

    const count = await getCount(cache, cacheKey);
    if (count >= limit) {
      return new Response("rate limited — slow down and try again in a bit", { status: 429 });
    }
    ctx.waitUntil(bumpCount(cache, cacheKey, count + 1, RATE_WINDOW_SECONDS));

    const originUrl = new URL(url.pathname + url.search, ORIGIN);
    const originRequest = new Request(originUrl.toString(), request);
    return fetch(originRequest);
  },
};
