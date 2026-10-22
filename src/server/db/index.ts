import * as schema from "./schema";
import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";

export function getDb() {
  return drizzle(env.DB, { schema });
}
