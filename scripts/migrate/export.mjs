// Read-only export from Railway into D1/KV import files. Writes nothing to
// either source. Usage:
//   DATABASE_URL=... REDIS_URL=... node scripts/migrate/export.mjs <outDir>
// Produces d1-import.sql, kv-bulk.json, mysql-manifest.json, kv-manifest.json.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import mysql from "mysql2/promise";
import { createClient } from "redis";
import { COLUMNS, KV_PREFIX_RULES, MYSQL_SELECT, TABLE, manifest, normalize, sqlLiteral } from "./rows.mjs";

// D1 rejects SQL statements over 100 KB and rows over 2 MB.
const MAX_STATEMENT_BYTES = 90_000;
const MAX_ROW_BYTES = 1_900_000;
const HEATMAP_CHUNK_BYTES = 80_000;
// KV rejects expirationTtl below 60 seconds.
const MIN_KV_TTL_SECONDS = 60;

const outDir = process.argv[2];
if (!outDir) throw new Error("usage: export.mjs <outDir>");
mkdirSync(outDir, { recursive: true });

// Splits text into pieces of at most maxBytes UTF-8 bytes on code point boundaries.
function chunkText(text, maxBytes) {
  const chunks = [];
  let current = "";
  let bytes = 0;
  for (const ch of text) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > maxBytes) {
      chunks.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += b;
  }
  if (current) chunks.push(current);
  return chunks;
}

// Rows too large for one statement are inserted with an empty heatmap, then
// the heatmap JSON is appended in chunks so the stored text is identical.
function largeRowStatements(prefix, row) {
  const values = normalize(row);
  const heatmapIndex = COLUMNS.indexOf("heatmapData");
  const heatmap = values[heatmapIndex];
  values[heatmapIndex] = "";
  const where = `githubName = ${sqlLiteral(row.githubName)} AND twitterName = ${sqlLiteral(row.twitterName)}`;
  return [
    `${prefix}(${values.map(sqlLiteral).join(", ")});`,
    ...chunkText(heatmap, HEATMAP_CHUNK_BYTES).map((chunk) => `UPDATE ${TABLE} SET heatmapData = heatmapData || ${sqlLiteral(chunk)} WHERE ${where};`),
  ];
}

async function exportMysql() {
  const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL, supportBigNumbers: true });
  await conn.query("SET SESSION TRANSACTION READ ONLY");
  await conn.query("START TRANSACTION WITH CONSISTENT SNAPSHOT");
  const [rows] = await conn.query(MYSQL_SELECT);
  await conn.query("COMMIT");
  await conn.end();

  const prefix = `INSERT INTO ${TABLE} (${COLUMNS.map((c) => `\`${c}\``).join(", ")}) VALUES\n`;
  const statements = [];
  const oversized = [];
  let chunkedRows = 0;
  let batch = [];
  let batchBytes = prefix.length;
  const flush = () => {
    if (batch.length) statements.push(`${prefix}${batch.join(",\n")};`);
    batch = [];
    batchBytes = prefix.length;
  };
  for (const row of rows) {
    const tuple = `(${normalize(row).map(sqlLiteral).join(", ")})`;
    const bytes = Buffer.byteLength(tuple);
    if (bytes > MAX_ROW_BYTES || (prefix.length + bytes > MAX_STATEMENT_BYTES && row.heatmapData === null)) {
      oversized.push({ githubName: row.githubName, twitterName: row.twitterName, bytes });
      continue;
    }
    if (prefix.length + bytes > MAX_STATEMENT_BYTES) {
      flush();
      statements.push(...largeRowStatements(prefix, row));
      chunkedRows++;
      continue;
    }
    if (batchBytes + bytes + 2 > MAX_STATEMENT_BYTES) flush();
    batch.push(tuple);
    batchBytes += bytes + 2;
  }
  flush();
  if (oversized.length) {
    writeFileSync(join(outDir, "oversized-rows.json"), JSON.stringify(oversized, null, 2));
    throw new Error(`${oversized.length} rows exceed the D1 statement limit; see oversized-rows.json. They cannot be stored in D1 as-is.`);
  }
  writeFileSync(join(outDir, "d1-import.sql"), statements.join("\n") + "\n");
  const m = manifest(rows);
  writeFileSync(join(outDir, "mysql-manifest.json"), JSON.stringify(m));
  return { rows: m.count, statements: statements.length, chunkedRows, digest: m.digest };
}

async function exportRedis() {
  const client = createClient({ url: process.env.REDIS_URL });
  await client.connect();
  const entries = [];
  const skipped = { notAllowlisted: 0, shortTtl: 0, notString: 0 };
  for await (const key of client.scanIterator({ COUNT: 1000 })) {
    if (!KV_PREFIX_RULES.some((rule) => rule(key))) {
      skipped.notAllowlisted++;
      continue;
    }
    if ((await client.type(key)) !== "string") {
      skipped.notString++;
      continue;
    }
    const [value, pttl] = await Promise.all([client.get(key), client.pTTL(key)]);
    if (value === null) continue;
    const entry = { key, value };
    if (pttl > 0) {
      const ttl = Math.floor(pttl / 1000);
      if (ttl < MIN_KV_TTL_SECONDS) {
        skipped.shortTtl++;
        continue;
      }
      entry.expiration_ttl = ttl;
    }
    entries.push(entry);
  }
  await client.quit();
  entries.sort((a, b) => (a.key < b.key ? -1 : 1));
  writeFileSync(join(outDir, "kv-bulk.json"), JSON.stringify(entries));
  const digest = createHash("sha256").update(JSON.stringify(entries.map((e) => [e.key, e.value]))).digest("hex");
  writeFileSync(join(outDir, "kv-manifest.json"), JSON.stringify({ count: entries.length, digest, skipped }));
  return { keys: entries.length, skipped, digest };
}

const summary = {};
if (process.env.DATABASE_URL) summary.mysql = await exportMysql();
if (process.env.REDIS_URL) summary.redis = await exportRedis();
console.log(JSON.stringify(summary, null, 2));
