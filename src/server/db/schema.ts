import {
  sqliteTableCreator,
  text,
  integer,
  index,
  primaryKey,
  customType,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const sqliteTable = sqliteTableCreator(
  (name) => `tweetstocommits_${name}`,
);

// MySQL compared these with a case-insensitive collation; NOCASE keeps
// lookups and the primary key case-insensitive for ASCII usernames.
const nocaseText = customType<{ data: string; notNull: true }>({
  dataType() {
    return "text COLLATE NOCASE";
  },
});

export type TweetCommitData = {
  day: string;
  commits: number;
  tweets: number;
}[];

export const users = sqliteTable(
  "user",
  {
    twitterFollowerCount: integer("twitterFollowerCount").notNull().default(0),
    githubFollowerCount: integer("githubFollowerCount").notNull().default(0),
    tweetsSent: integer("tweetsSent").notNull().default(0),
    commitsMade: integer("commitsMade").notNull().default(0),
    twitterId: text("twitterId"),
    twitterDisplayName: text("twitterDisplayName").notNull(),
    githubName: nocaseText("githubName").notNull(),
    twitterName: nocaseText("twitterName").notNull(),
    twitterAvatarUrl: text("twitterAvatarUrl"),
    twitterInGithubBio: integer("twitterInGithubBio", {
      mode: "boolean",
    }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(
      sql`(unixepoch())`,
    ),
    heatmapData: text("heatmapData", { mode: "json" }).$type<TweetCommitData>(),
  },
  (t) => [
    primaryKey({ columns: [t.githubName, t.twitterName] }),
    index("tweetstocommits_user_createdAt_idx").on(t.createdAt),
    index("tweetstocommits_user_followers_idx").on(t.twitterFollowerCount),
    index("tweetstocommits_user_commits_idx").on(t.commitsMade),
    index("tweetstocommits_user_tweets_idx").on(t.tweetsSent),
  ],
);

export type User = typeof users.$inferSelect;
export type HeatmaplessUser = Omit<User, "heatmapData">;
