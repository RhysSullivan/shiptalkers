import { createHash } from "node:crypto";

export const TABLE = "tweetstocommits_user";

// Column order shared by the MySQL export, the D1 import, and verification.
export const COLUMNS = [
  "githubName",
  "twitterName",
  "twitterFollowerCount",
  "githubFollowerCount",
  "tweetsSent",
  "commitsMade",
  "twitterId",
  "twitterDisplayName",
  "twitterAvatarUrl",
  "twitterInGithubBio",
  "createdAt",
  "updated_at",
  "heatmapData",
];

// MySQL source query: timestamps as UTC epoch seconds, JSON as MySQL's own
// canonical text, so neither driver timezone nor JSON re-serialisation can
// change stored values.
export const MYSQL_SELECT = `SELECT
  githubName, twitterName, twitterFollowerCount, githubFollowerCount, tweetsSent,
  commitsMade, twitterId, twitterDisplayName, twitterAvatarUrl,
  CAST(twitterInGithubBio AS SIGNED) AS twitterInGithubBio,
  CAST(UNIX_TIMESTAMP(createdAt) AS SIGNED) AS createdAt,
  CAST(UNIX_TIMESTAMP(updated_at) AS SIGNED) AS updated_at,
  CAST(heatmapData AS CHAR) AS heatmapData
FROM ${TABLE}`;

export const D1_SELECT = `SELECT ${COLUMNS.join(", ")} FROM ${TABLE}`;

export function normalize(row) {
  return COLUMNS.map((c) => {
    const v = row[c];
    if (v === null || v === undefined) return null;
    if (typeof v === "bigint") return Number(v);
    if (typeof v === "string" && /^(twitterFollowerCount|githubFollowerCount|tweetsSent|commitsMade|twitterInGithubBio|createdAt|updated_at)$/.test(c)) {
      return Number(v);
    }
    return v;
  });
}

// Primary-key identity under the NOCASE collation used in D1.
export function keyOf(row) {
  return `${row.githubName.toLowerCase()}\u0000${row.twitterName.toLowerCase()}`;
}

export function rowHash(row) {
  return createHash("sha256").update(JSON.stringify(normalize(row))).digest("hex");
}

export function manifest(rows) {
  const entries = rows.map((r) => [keyOf(r), rowHash(r)]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const digest = createHash("sha256").update(JSON.stringify(entries)).digest("hex");
  return { count: entries.length, digest, entries };
}

export function sqlLiteral(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  return `'${String(v).replaceAll("'", "''")}'`;
}

// KV keys the app reads. Everything else stays in Redis only.
export const KV_PREFIX_RULES = [
  (k) => k.startsWith("twitter-profile-"),
  (k) => k.endsWith("-github-total-contributions-all-time-v2"),
  (k) => k.endsWith("-metadata-github"),
];
