// Read-only inspection of the Railway MySQL and Redis sources.
// Usage: DATABASE_URL=... REDIS_URL=... node scripts/migrate/inspect.mjs
// Prints shapes and counts only; never prints credentials or row contents.
import mysql from "mysql2/promise";
import { createClient } from "redis";

const TABLE = "tweetstocommits_user";

async function inspectMysql(url) {
  const conn = await mysql.createConnection({ uri: url });
  await conn.query("SET SESSION TRANSACTION READ ONLY");
  const q = async (sql) => (await conn.query(sql))[0];

  const [version] = await q("SELECT VERSION() v, @@global.time_zone gtz, @@session.time_zone stz, @@character_set_database cs, @@collation_database coll");
  const [ddl] = await q(`SHOW CREATE TABLE ${TABLE}`);
  const tables = await q("SELECT table_name t, table_rows r, data_length d, index_length i FROM information_schema.tables WHERE table_schema = DATABASE()");
  const columns = await q(`SELECT column_name c, column_type t, collation_name coll, is_nullable n, column_default d, extra e FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = '${TABLE}' ORDER BY ordinal_position`);
  const [stats] = await q(`SELECT
      COUNT(*) total,
      SUM(heatmapData IS NOT NULL) withHeatmap,
      MAX(LENGTH(CAST(heatmapData AS CHAR))) maxHeatmapBytes,
      SUM(LENGTH(CAST(heatmapData AS CHAR))) totalHeatmapBytes,
      SUM(updated_at IS NULL) nullUpdatedAt,
      SUM(updated_at <> createdAt) updatedDiffers,
      MIN(createdAt) minCreated, MAX(createdAt) maxCreated,
      SUM(githubName REGEXP '[^ -~]' OR twitterName REGEXP '[^ -~]') nonAsciiKeys,
      SUM(githubName <> TRIM(githubName) OR twitterName <> TRIM(twitterName)) paddedKeys,
      SUM(BINARY githubName <> LOWER(githubName) OR BINARY twitterName <> LOWER(twitterName)) mixedCaseKeys,
      MAX(LENGTH(twitterDisplayName)) maxDisplayName,
      MAX(LENGTH(twitterAvatarUrl)) maxAvatarUrl
    FROM ${TABLE}`);
  const [rowBytes] = await q(`SELECT MAX(
      LENGTH(CAST(heatmapData AS CHAR)) + LENGTH(twitterDisplayName) + LENGTH(githubName)
      + LENGTH(twitterName) + IFNULL(LENGTH(twitterAvatarUrl), 0) + IFNULL(LENGTH(twitterId), 0)
    ) maxRowBytes FROM ${TABLE}`);
  await conn.end();
  return { version, ddl: ddl["Create Table"], tables, columns, stats, rowBytes };
}

function prefixOf(key) {
  if (key.startsWith("twitter-profile-")) return "twitter-profile-*";
  if (key.endsWith("-github-total-contributions-all-time-v2")) return "*-github-total-contributions-all-time-v2";
  if (key.endsWith("-metadata-github")) return "*-metadata-github";
  if (key.endsWith("-rate-limit-v2")) return "*-rate-limit-v2";
  return "other (bare twitter name: tweet arrays from the unused streaming path)";
}

async function inspectRedis(url) {
  const client = createClient({ url });
  await client.connect();
  const info = await client.info("memory");
  const groups = {};
  for await (const key of client.scanIterator({ COUNT: 1000 })) {
    const g = (groups[prefixOf(key)] ??= { keys: 0, withTtl: 0, bytes: 0, maxBytes: 0, maxKeyBytes: 0, nonString: 0 });
    g.keys++;
    const [type, ttl, len] = await Promise.all([client.type(key), client.pTTL(key), client.strLen(key).catch(() => 0)]);
    if (type !== "string") g.nonString++;
    if (ttl > 0) g.withTtl++;
    g.bytes += len;
    g.maxBytes = Math.max(g.maxBytes, len);
    g.maxKeyBytes = Math.max(g.maxKeyBytes, Buffer.byteLength(key));
  }
  const dbsize = await client.dbSize();
  await client.quit();
  return {
    dbsize,
    usedMemory: /used_memory_human:(\S+)/.exec(info)?.[1],
    groups,
  };
}

const out = {};
if (process.env.DATABASE_URL) out.mysql = await inspectMysql(process.env.DATABASE_URL);
if (process.env.REDIS_URL) out.redis = await inspectRedis(process.env.REDIS_URL);
console.log(JSON.stringify(out, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
