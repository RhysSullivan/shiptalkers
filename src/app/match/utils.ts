import { and, asc, desc, eq, not, or, sql } from "drizzle-orm";
import { db } from "../../server/db";
import { HeatmaplessUser, users } from "../../server/db/schema";

export type MatchedUser = HeatmaplessUser & {
    matchPercent: string;
};

export async function getMatchSuggestionsBasedOnTotal(props: {
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

/*
const totalA = userA.tweetsSent + userA.commitsMade;
const totalB = userB.tweetsSent + userB.commitsMade;
const percentA = userA.tweetsSent / totalA;
const percentB = userB.commitsMade / totalB;
const percentDiff = Math.abs(percentA - percentB);
Math.round((1 - percentDiff) * 100)
*/
export async function getMatchSuggestionBasedOnRelative(forUser: HeatmaplessUser) {
    const totalA = forUser.tweetsSent + forUser.commitsMade;
    const percentA = forUser.tweetsSent / totalA;
    const foundUsers = await db
        // @ts-expect-error idk drizzle
        .select({
            total: sql`(1 - ABS((${users.commitsMade} / (${users.commitsMade} + ${users.tweetsSent})) - ${percentA})) * 100`,
            ...users,
        })
        .from(users)
        .where(
            and(
                or(users.twitterInGithubBio, eq(users.twitterName, users.githubName)),
                not(eq(users.githubName, forUser.githubName)),
            ),
        )
        // sort by total, and then difference in followers
        .orderBy(
            desc(sql`(1 - ABS((${users.commitsMade} / (${users.commitsMade} + ${users.tweetsSent})) - ${percentA})) * 100`),
            // sql`ABS(${ users.twitterFollowerCount } - ${ forUser.twitterFollowerCount })`,
            // sql`ABS(${ users.githubFollowerCount } - ${ forUser.githubFollowerCount })`,
        )
        .limit(16).execute();
    return foundUsers as MatchedUser[];
}