# characterground Cloudflare Worker proxy

Free-tier reverse proxy in front of the Render backend, no domain purchase needed. See the
top-of-file comment in `worker.js` for exactly what this does and doesn't cover — short version:
basic bot-UA blocking + per-IP rate limiting (best-effort, not Cloudflare's real WAF product,
which requires owning a domain).

## Deploy it (dashboard, no CLI needed)

1. Sign up / log in at https://dash.cloudflare.com (free account, no domain required).
2. Workers & Pages → Create → Create Worker.
3. Give it a name (e.g. `characterground-proxy`) → Deploy the default "Hello World" first.
4. Click "Edit code" and replace everything with the contents of `worker.js` in this folder.
5. Save and Deploy.
6. Your proxy URL is `https://characterground-proxy.<your-subdomain>.workers.dev` (Cloudflare
   shows the exact address after deploying — the subdomain is your account's, assigned once).

## Or deploy it via CLI (wrangler)

```
npm install -g wrangler
cd cloudflare-worker
wrangler login
wrangler deploy
```

## After deploying — test before switching real traffic to it

- Load the Worker URL, confirm the site renders identically to the direct onrender.com URL.
- Log in through the Worker URL specifically — confirm the session actually holds (this is the
  one thing most likely to break with a naive reverse proxy; cookies need to survive the extra hop).
- Hit `/login` or `/signup` more than 10 times in a minute from the same connection — confirm you
  get a 429, not a normal response.
- If anything looks wrong, the direct `characterground-er73.onrender.com` URL keeps working
  completely unaffected the whole time — this Worker is additive, not a replacement, until you
  decide to point people at the workers.dev URL instead.

## Known limitation, worth remembering

The rate limiter uses Cloudflare's Cache API, which is scoped per-datacenter, not globally
synced. A distributed attacker spread across many Cloudflare edge locations could exceed the
nominal limit. It still meaningfully raises the bar against the common case (one script hammering
one endpoint from one place). Real global rate limiting is a Cloudflare product feature gated
behind owning a domain.
