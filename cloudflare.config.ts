import { bindings, defineConfig, defineWorker } from "cf/config";
import { createWorkersCacheConfig } from "@vinext/cloudflare/cache/config";

const cache = await createWorkersCacheConfig();

// `deploy:vinext --env preview` builds in "preview" mode; plain builds are production.
const targets = {
  preview: {
    name: "shiptalkers-vinext-preview",
    db: { name: "shiptalkers-preview", id: "174929aa-2310-4d80-89fc-1f26ae2beea8" },
    kv: { id: "9e4da5271b68429db3b2171b85020a59" },
  },
  production: {
    name: "shiptalkers",
    db: { name: "shiptalkers", id: "2ae6e896-6baa-4bda-b512-e95580091d24" },
    kv: { id: "3a836f3c9fec4c4e902185a7e8293bf8" },
  },
};

export default defineConfig(({ mode }) => {
  const target = mode === "preview" ? targets.preview : targets.production;
  return {
    worker: defineWorker({
      ...cache,
      name: target.name,
      entrypoint: "vinext/server/fetch-handler",
      compatibilityDate: "2026-10-22",
      compatibilityFlags: ["nodejs_compat"],
      observability: { enabled: true },
      assets: {
        htmlHandling: "none",
        notFoundHandling: "none",
        runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
      },
      env: {
        ...cache.env,
        ASSETS: bindings.assets(),
        DB: bindings.d1(target.db),
        CACHE: bindings.kv(target.kv),
      },
    }),
  };
});
