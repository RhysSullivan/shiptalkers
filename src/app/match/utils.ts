import { and, eq, not, or, sql } from "drizzle-orm";
import { db } from "../../server/db";
import { HeatmaplessUser, users } from "../../server/db/schema";

export type MatchedUser = HeatmaplessUser & {
    matchPercent: string;
};

export async function getMatchSuggestions(props: {
    forUser: HeatmaplessUser;
}) {
    const { forUser } = props;

    const foundUsers = await db
        // @ts-expect-error idk drizzle
        .select({
            matchPercent: sql`100 - ((ABS(${users.tweetsSent} - ${forUser.commitsMade}) + ABS(${users.commitsMade} - ${forUser.tweetsSent})) / (${forUser.tweetsSent} + ${forUser.commitsMade})) * 100`,
            ...users,
        })
        .from(users)
        .where(
            and(
                or(users.twitterInGithubBio, eq(users.twitterName, users.githubName)),
                not(eq(users.githubName, forUser.githubName)),
            ),
        )
        .orderBy(
            sql`ABS(${users.tweetsSent} - ${forUser.commitsMade}) + ABS(${users.commitsMade} - ${forUser.tweetsSent})`,
        )
        .limit(16);
    return foundUsers as MatchedUser[];
}