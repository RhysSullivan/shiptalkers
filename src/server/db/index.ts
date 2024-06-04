import * as schema from "./schema";
import { env } from "../../env";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const poolConnection = mysql.createPool(env.DATABASE_URL ?? "mysql://youruser:yourpassword@localhost:3306/yourdatabase");

export const db = drizzle(
  poolConnection,
  { schema, mode: "default" }
);
