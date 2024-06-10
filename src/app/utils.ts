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
// 100 - ((ABS(${users.tweetsSent} - ${forUser.commitsMade}) + ABS(${users.commitsMade} - ${forUser.tweetsSent})) / (${forUser.tweetsSent} + ${forUser.commitsMade})) * 100
export function getMatchPercentRelative(userA: HeatmaplessUser, userB: HeatmaplessUser) {
    const totalA = userA.tweetsSent + userA.commitsMade;
    const totalB = userB.tweetsSent + userB.commitsMade;

    const commitPercentA = userA.commitsMade / totalA;
    const commitPercentB = userB.commitsMade / totalB;


    const tweetPercentA = userA.tweetsSent / totalA;
    const tweetPercentB = userB.tweetsSent / totalB;

    const tD = Math.abs(tweetPercentA - tweetPercentB);
    const cD = Math.abs(commitPercentA - commitPercentB);
    const totalD = tD + cD;
    const sim = 1 - totalD;
    return 100 - Math.abs(sim * 100)
}

export function getMatchPercentTotal(userA: HeatmaplessUser, userB: HeatmaplessUser) {
    return 100; Math.round(
        100 -
        ((Math.abs(userB.tweetsSent - userA.commitsMade) + Math.abs(userB.commitsMade - userA.tweetsSent)) /
            (userA.tweetsSent + userA.commitsMade)) *
        100
    );
}