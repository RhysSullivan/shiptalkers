// Bindings declared in wrangler.jsonc. Runtime types come from
// worker-configuration.d.ts (`pnpm cf:typegen`).
interface CloudflareEnv {
	DB: D1Database;
	CACHE: KVNamespace;
	ASSETS: Fetcher;
	WORKER_SELF_REFERENCE: Fetcher;
}
