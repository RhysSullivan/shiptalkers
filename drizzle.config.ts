import { type Config } from "drizzle-kit";

import { env } from "./src/env.js"

export default {
  schema: "./src/server/db/schema.ts",
  driver: "mysql2",
  dbCredentials: {
    connectionString: env.DATABASE_URL,
  },
  tablesFilter: ["tweetstocommits_*"],
} satisfies Config;
