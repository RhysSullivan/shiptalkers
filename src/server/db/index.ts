import { Client } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";


import * as schema from "./schema";
import { env } from "../../env";

export const db = drizzle(
  new Client({
    url: env.DATABASE_URL,
  }).connection(),
  { schema }
);
