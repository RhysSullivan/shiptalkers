import { type Config } from "drizzle-kit";

export default {
  schema: "./src/server/db/schema.ts",
  driver: "mysql2",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL ?? "mysql://youruser:yourpassword@localhost:3306/yourdatabase",
  },
  tablesFilter: ["tweetstocommits_*"],
} satisfies Config;
