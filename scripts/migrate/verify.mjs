// Compares an imported D1 database and KV namespace with the export manifests.
// Usage: node scripts/migrate/verify.mjs <outDir> <d1DatabaseName> <accountId> <kvNamespaceId>
// Needs CLOUDFLARE_API_TOKEN. Exits non-zero on any mismatch.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { D1_SELECT, TABLE, keyOf, manifest } from "./rows.mjs";

const [outDir, database, accountId, namespaceId] = process.argv.slice(2);
if (!outDir || !database || !accountId || !namespaceId) {
  throw new Error("usage: verify.mjs <outDir> <d1DatabaseName> <accountId> <kvNamespaceId>");
}

function wrangler(args) {
  const out = execFileSync("pnpm", ["exec", "wrangler", ...args], {
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["ignore", "pipe", "inherit"],
  });
  return JSON.parse(out);
}

const PAGE = 1000;
const d1Rows = [];
for (let offset = 0; ; offset += PAGE) {
  const [result] = wrangler(["d1", "execute", database, "--remote", "--json", "--command", `${D1_SELECT} ORDER BY rowid LIMIT ${PAGE} OFFSET ${offset}`]);
  d1Rows.push(...result.results);
  if (result.results.length < PAGE) break;
}

const expected = JSON.parse(readFileSync(join(outDir, "mysql-manifest.json"), "utf8"));
const actual = manifest(d1Rows);
const expectedMap = new Map(expected.entries);
const actualMap = new Map(actual.entries);
const missing = [...expectedMap.keys()].filter((k) => !actualMap.has(k));
const extra = [...actualMap.keys()].filter((k) => !expectedMap.has(k));
const changed = [...expectedMap.keys()].filter((k) => actualMap.has(k) && actualMap.get(k) !== expectedMap.get(k));
const duplicateKeys = d1Rows.length - new Set(d1Rows.map(keyOf)).size;

const kvExpected = JSON.parse(readFileSync(join(outDir, "kv-manifest.json"), "utf8"));
const kvEntries = JSON.parse(readFileSync(join(outDir, "kv-bulk.json"), "utf8"));
// The REST API returns exact value bytes; `wrangler kv key get` appends a newline.
const kvBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
async function kvFetch(path) {
  const res = await fetch(`${kvBase}${path}`, { headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` } });
  if (!res.ok) throw new Error(`KV API ${res.status} for ${path}`);
  return res;
}
const kvKeys = new Set();
for (let cursor = ""; ; ) {
  const body = await (await kvFetch(`/keys?limit=1000${cursor ? `&cursor=${cursor}` : ""}`)).json();
  for (const k of body.result) kvKeys.add(k.name);
  cursor = body.result_info?.cursor;
  if (!cursor) break;
}
const kvMissing = kvEntries.filter((e) => !kvKeys.has(e.key)).length;
// Spot-check values with a fixed sample to keep API calls bounded.
const sample = kvEntries.filter((_, i) => i % Math.max(1, Math.floor(kvEntries.length / 50)) === 0);
let kvValueMismatches = 0;
for (const e of sample) {
  const value = await (await kvFetch(`/values/${encodeURIComponent(e.key)}`)).text();
  if (value !== e.value) kvValueMismatches++;
}

const report = {
  table: TABLE,
  d1: { expected: expected.count, actual: actual.count, missing: missing.length, extra: extra.length, changed: changed.length, duplicateKeys, digestMatch: expected.digest === actual.digest },
  kv: { expected: kvExpected.count, missing: kvMissing, sampled: sample.length, valueMismatches: kvValueMismatches },
};
console.log(JSON.stringify(report, null, 2));
const ok = report.d1.digestMatch && duplicateKeys === 0 && kvMissing === 0 && kvValueMismatches === 0;
process.exit(ok ? 0 : 1);
