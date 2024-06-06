import {
  boolean,
  mysqlTableCreator,
  varchar,
  timestamp,
  customType,
  json,
  primaryKey
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm"
import { HeatmapData } from "../../lib/utils";
/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const mysqlTable = mysqlTableCreator(
  (name) => `tweetstocommits_${name}`,
);

const int11 = customType<{ data: number }>({
  dataType() {
    // i have no idea
    if (process.env.DATABASE_URL?.includes("localhost")) {
      return "int(11)";
    }
    return "int";
  },
});



export type TweetCommitData = {
  day: string;
  commits: number;
  tweets: number;
}[];

export const users = mysqlTable("user", {
  twitterFollowerCount: int11("twitterFollowerCount").notNull().default(0),
  githubFollowerCount: int11("githubFollowerCount").notNull().default(0),
  tweetsSent: int11("tweetsSent").notNull().default(0),
  commitsMade: int11("commitsMade").notNull().default(0),
  twitterId: varchar("twitterId", {
    length: 255,
  }),
  twitterDisplayName: varchar("twitterDisplayName", {
    length: 255,
  }).notNull(),
  githubName: varchar("githubName", {
    length: 255,
  }).notNull(),
  twitterName: varchar("twitterName", {
    length: 255,
  }).notNull(),
  twitterAvatarUrl: varchar("twitterAvatarUrl", {
    length: 255,
  }),
  twitterInGithubBio: boolean("twitterInGithubBio").notNull(),
  createdAt: timestamp("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(
    sql`CURRENT_TIMESTAMP`
  ),
  heatmapData: json("heatmapData").$type<TweetCommitData>(),
}, (t) => ({
  pk: primaryKey(t.githubName, t.twitterName)
}));


export type User = typeof users.$inferSelect;
export type HeatmaplessUser = Omit<User, "heatmapData">;