import { HeatmaplessUser } from "../server/db/schema";

export type Props = {
    searchParams:
    | {
        github: string;
        twitter: string;
    }
    | {
        name: string;
    };
};

export function parse(props: Props) {
    return "name" in props.searchParams
        ? {
            github: props.searchParams.name.toLowerCase(),
            twitter: props.searchParams.name.toLowerCase(),
        }
        : {
            github: props.searchParams.github.toLowerCase(),
            twitter: props.searchParams.twitter.toLowerCase(),
        };
}


// match percent is the inverse of what users spend time on
// i.e if userA tweets 70% more than they commit, and userB commits 70% more than they tweet, they are a 100% match
export function getMatchPercentLegacy(userA: HeatmaplessUser, userB: HeatmaplessUser) {
    const totalA = userA.tweetsSent + userA.commitsMade;
    const totalB = userB.tweetsSent + userB.commitsMade;
    const percentA = userA.tweetsSent / totalA;
    const percentB = userB.commitsMade / totalB;
    const percentDiff = Math.abs(percentA - percentB);
    return Math.round((1 - percentDiff) * 100);
}

// sql`100 - ((ABS(${users.tweetsSent} - ${forUser.commitsMade}) + ABS(${users.commitsMade} - ${forUser.tweetsSent})) / (${forUser.tweetsSent} + ${forUser.commitsMade})) * 100`,
export function getMatchPercent(userA: HeatmaplessUser, userB: HeatmaplessUser) {
    return 100 - ((Math.abs(userB.tweetsSent - userA.commitsMade) + Math.abs(userB.commitsMade - userA.tweetsSent)) / (userA.tweetsSent + userA.commitsMade)) * 100;
}