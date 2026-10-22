# Moving Shiptalkers to Cloudflare

Status: **plan for review**. A preview Worker runs on a `workers.dev` URL
against a synthetic D1 database. Production traffic, data, and DNS are
unchanged. The cutover, data import, DNS change, and retirement of the old
databases each need separate approval.

## Target

| Today | Cloudflare |
| --- | --- |
| Next.js 15.0 RC on Vercel | Next.js 15.5 on Workers via `@opennextjs/cloudflare` |
| MySQL (Drizzle, `mysql2`) | D1 (Drizzle, `drizzle-orm/d1`), binding `DB` |
| Redis (`redis`) | Workers KV, binding `CACHE` |
| Vercel ISR cache | None needed (see below) |
| Vercel DNS + bot protection | Cloudflare zone, Bot Fight Mode, AI-bot blocking |

The Worker has four bindings: `DB`, `CACHE`, `ASSETS`, and
`WORKER_SELF_REFERENCE`. It uses no R2, Durable Objects, Queues, or Images.

## What the app actually uses

Live paths (rendered by Next on request):

- `/compare`: reads one row by `(githubName, twitterName)`. For a pair it has
  not seen, it fetches GitHub and SocialData through the KV caches, then
  upserts the row.
- `/match`: reads one or two rows, plus suggestion queries.
- `/`: three leaderboard queries (top tweeters, top committers, popular).
- `/api/invalidate` (token-gated) and `/api/invalidate-public` (KV-backed
  60 s rate limit): optionally delete a row and its cache keys.
- `/api/og/*`: image generation from query parameters, no storage.

Unused in production (left as they are, not migrated):

- The tRPC subscription (`post.data`), `prodServer.ts`, and `wssDevServer.ts`.
  No client component subscribes; `api.shiptalkers.dev` returns 404.
- `fetchTweetsFromUser` and the Redis keys it wrote. Those are tweet arrays
  keyed by the bare Twitter handle, with no expiry, and nothing reads them now.
- `heatmapData` is never written for new rows (always `NULL`). Old rows may
  still have it, and it is migrated unchanged.

## Code changes in this branch

1. `next` 15.0.0-rc.0 → 15.5.28 and React 19.2 (OpenNext requires
   `>=15.5.28`). `searchParams` is now awaited at each page entry point.
   `experimental.ppr` is removed (canary-only), and `runtime = "edge"` is
   removed from the OG routes (OpenNext runs everything in the Node runtime).
2. Schema ported to `sqlite-core`. The table name, column names, and the
   composite primary key are unchanged. `githubName` and `twitterName` use
   `COLLATE NOCASE` to keep MySQL's case-insensitive key semantics. Indexes
   are added for the three leaderboard sorts and `createdAt`.
3. `onDuplicateKeyUpdate` → `onConflictDoUpdate` on the same key, with the same
   update set (heatmap and timestamps excluded, as before).
4. `db` is now `getDb()`, because the D1 binding exists only inside a request.
5. `cache.ts` uses KV with the same key names and superjson values. TTLs are
   clamped to KV's 60 s minimum (the only TTL in use is exactly 60 s).
6. `/` is `force-dynamic`. On Vercel it was ISR, prerendered at build time
   against the production database, which a Cloudflare build cannot reach.
   `/compare` and `/match` read `searchParams`, so they were already dynamic;
   their `revalidate` exports never applied.
7. GitHub API requests send a `User-Agent`. Workers' `fetch` sends none, and
   GitHub answers 403 without one. Node's fetch sent one implicitly.
8. `images.unoptimized`, because the only `next/image` is one static logo.
9. `scripts/migrate/{inspect,export,verify}.mjs` for the data move (below).

## Validated on the preview Worker

| Check | Result |
| --- | --- |
| OpenNext build and deploy | Passes; 2.1 MiB gzipped (limit 10 MiB) |
| `/`, `/compare`, `/match`, `/not-ready`, 404 | 200/200/200/200/404; 20/20 home requests 200 |
| Live GitHub scrape and API from Worker egress | Works once a `User-Agent` is sent |
| D1 upsert from `/compare` | Row written with defaults, `heatmapData` NULL |
| Case-insensitive key | `ExampleShipper` upserts into `exampleshipper`; lowercase URL finds mixed-case rows |
| KV caches and the 60 s public rate limit | Second call within 60 s returns 429 |
| OG image route (`next/og`) | 1200×630 PNG |
| PostHog `/ingest` rewrite | Proxies |
| Export → import → verify rehearsal (synthetic MySQL 8.4 + Redis 7) | 1,501 rows, digest match; 901 KV keys, 51/51 sampled values identical; tampered row detected |

CPU per request, measured with `wrangler tail`: `/compare` 41–334 ms,
`/match` 103–426 ms, `/` 150–456 ms (it renders about 600 cards and tables).

## Data invariants

D1 (`tweetstocommits_user`):

1. Same row count as MySQL at the snapshot. Every MySQL key appears exactly
   once and no extra keys exist.
2. Each row matches MySQL in every column: integers equal; strings
   byte-identical (UTF-8); `twitterInGithubBio` 0/1; `createdAt` and
   `updated_at` equal to MySQL `UNIX_TIMESTAMP()`, so the driver timezone
   cannot shift them; `heatmapData` equal to MySQL's own JSON text, or NULL.
3. No two rows collide under NOCASE. MySQL's case-insensitive primary key
   already guarantees this, and verification re-checks it.
4. Lookups behave the same: the lowercased URL handle finds the stored
   mixed-case row.
5. The upsert never changes `createdAt`, `updated_at`, or `heatmapData` for
   an existing row.

`verify.mjs` checks 1–3 with a per-row SHA-256 manifest of the canonical
tuple and fails on any difference. 4–5 come from the schema and are covered
by the preview checks above.

KV:

1. Only keys the app reads are migrated: `twitter-profile-*`,
   `*-metadata-github`, and `*-github-total-contributions-all-time-v2`.
2. Values are byte-identical superjson strings.
3. Keys with no expiry stay without expiry. Keys with a TTL keep the
   remaining TTL; anything under 60 s is skipped (KV minimum).
4. Losing a cache key is safe: it only causes a refetch. KV is therefore not
   the source of truth, and failed or partial KV imports are not data loss.

Redis keys not migrated (rate-limit keys and the unused tweet arrays) stay
in Redis, which is not touched.

## Failure states

| Failure | Detection | Handling |
| --- | --- | --- |
| A row's `heatmapData` makes its INSERT exceed D1's 100 KB statement limit | Export | Row inserted with empty heatmap, then appended in 80 KB `UPDATE` chunks (rehearsed with 200 KB) |
| A row exceeds D1's 2 MB row limit | Export aborts, lists rows in `oversized-rows.json` | Needs a decision before import; no silent truncation |
| Real MySQL collation is case-sensitive (`_bin`/`_cs`) | `inspect.mjs` column collations | NOCASE would merge distinct keys; schema must change first |
| Non-ASCII or padded handles | `inspect.mjs` `nonAsciiKeys`, `paddedKeys` | NOCASE folds ASCII only and SQLite has no PAD SPACE; check affected rows by hand |
| `updated_at` has `ON UPDATE CURRENT_TIMESTAMP` in MySQL | `inspect.mjs` `extra` column | The D1 upsert would need to set `updated_at`; it changes OG image `etag` behaviour only |
| Writes on Vercel between snapshot and DNS move | Reconciliation diff | Three-way merge (below) |
| Partial import | `verify.mjs` count and digest | Drop the table, re-apply the migration, re-import; D1 is empty before cutover |
| GitHub rate-limits shared Worker egress | Logs: `Failed to fetch Github metadata ... 403/429` | Add a GitHub token (5,000 req/h) |
| Bot traffic no longer challenged after the DNS move | Request volume and CPU in Workers analytics | Enable Bot Fight Mode and AI-bot blocking on the zone before switching the apex |
| Home latency without ISR | Worker wall time on `/` | Optional: cache `/` in the Workers Cache API for 10 minutes |

## Cutover runbook (needs approval, not started)

Preconditions:

- A Railway credential in the Agents vault so `inspect.mjs` can run.
- Its output reviewed against the failure states above.
- `SOCIAL_DATA_API_KEY`, `INVALIDATE_TOKEN`, and `NEXT_PUBLIC_POSTHOG_KEY`
  available as Agents items (today they exist only as Vercel encrypted env).

1. Create production D1 `shiptalkers` and KV `shiptalkers-cache`, add a
   `production` environment to `wrangler.jsonc`, and set Worker secrets.
2. Snapshot export (read-only, consistent snapshot):
   `export.mjs out/T0`. Keep `mysql-manifest.json` as the merge base.
3. Apply the migration, import `d1-import.sql`, bulk-put `kv-bulk.json`, and
   run `verify.mjs`. It must exit 0.
4. Deploy the production Worker on `workers.dev` and check real rows.
5. DNS: add the `shiptalkers.dev` zone to Cloudflare with records equivalent
   to Vercel's (apex and `www` still pointing at Vercel), turn on bot
   protection, then change nameservers at the registrar. Wait until the zone
   is active. Nothing changes for users at this step.
6. Switch the apex to the Worker custom domain and add the
   `www` → apex redirect. Rollback is pointing the apex back at Vercel.
   The Vercel deployment stays up and unchanged.
7. Once Vercel request volume reaches about zero, re-export MySQL (`out/T1`)
   and three-way merge with base = T0, ours = D1, theirs = T1:
   - Key only in theirs → insert.
   - Theirs changed and ours equals base → take theirs.
   - Ours changed (written on Cloudflare after the switch) → keep ours and log
     it.
   - Key deleted in theirs and ours equals base → delete it and log it.
8. Keep Railway MySQL/Redis and the Vercel project unchanged for an agreed
   soak period. Retiring them is a separate approval.

## Cost model

- Workers Paid includes 10M requests and 30M CPU-ms a month. Static assets
  are free and do not invoke the Worker.
- D1 includes 25B rows read and 50M rows written a month. A leaderboard
  render reads at most 3 × the table size (indexed sorts with a filter), a
  compare reads 1 row, and an upsert writes a few rows (row and indexes).
- KV includes 10M reads and 1M writes a month. A new comparison costs about
  3 reads and up to 3 writes.
- At current traffic, expected usage is well inside the included amounts.
  The main variable is CPU on `/`, which caching `/` would remove.
