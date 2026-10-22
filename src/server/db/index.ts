import * as schema from "./schema";
import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export function getDb() {
  return drizzle(getCloudflareContext().env.DB, { schema });
}
