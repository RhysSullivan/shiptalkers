import { type Config } from "drizzle-kit";

export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  tablesFilter: ["tweetstocommits_*"],
} satisfies Config;
