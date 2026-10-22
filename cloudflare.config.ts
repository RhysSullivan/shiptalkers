import { bindings, defineConfig, defineWorker } from "cf/config";
import { createWorkersCacheConfig } from "@vinext/cloudflare/cache/config";

const cache = await createWorkersCacheConfig();

export default defineConfig({
  worker: defineWorker({
    ...cache,
    name: "shiptalkers-vinext-preview",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-22",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ...cache.env,
      ASSETS: bindings.assets(),
      DB: bindings.d1({ name: "shiptalkers-preview", id: "174929aa-2310-4d80-89fc-1f26ae2beea8" }),
      CACHE: bindings.kv({ id: "9e4da5271b68429db3b2171b85020a59" }),
    },
  }),
});
