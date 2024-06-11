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

export function getMatchPercentRelative(userA: Pick<HeatmaplessUser, "commitsMade" | "tweetsSent">, userB: Pick<HeatmaplessUser, "commitsMade" | "tweetsSent">) {
    const totalA = userA.tweetsSent + userA.commitsMade;
    const commitPercentA = Number(((userA.commitsMade / totalA) * 100).toFixed());
    const tweetPercentA = Number(((userA.tweetsSent / totalA) * 100).toFixed());

    const totalB = userB.tweetsSent + userB.commitsMade;
    const commitPercentB = Number(((userB.commitsMade / totalB) * 100).toFixed());
    const tweetPercentB = Number(((userB.tweetsSent / totalB) * 100).toFixed());


    const tweetsToCommits = Math.abs(tweetPercentA - commitPercentB);
    const commitsToTweets = Math.abs(commitPercentA - tweetPercentB);

    const tweetsToTweets = Math.abs(tweetPercentA - tweetPercentB);
    const commitsToCommits = Math.abs(commitPercentA - commitPercentB);




    if (Math.abs(tweetsToTweets + commitsToCommits) > Math.abs(tweetsToCommits + commitsToTweets)) {
        return 100 - (tweetsToCommits + commitsToTweets);
    }

    const tD = Math.abs(tweetPercentA - tweetPercentB);
    const cD = Math.abs(commitPercentA - commitPercentB);
    const totalD = tD + cD;
    const sim = 100 - totalD;
    return 100 - sim
}

export function getMatchPercentTotal(userA: Pick<HeatmaplessUser, "commitsMade" | "tweetsSent">, userB: Pick<HeatmaplessUser, "commitsMade" | "tweetsSent">) {
    return Math.round(
        100 -
        ((Math.abs(userB.tweetsSent - userA.commitsMade) + Math.abs(userB.commitsMade - userA.tweetsSent)) /
            (userA.tweetsSent + userA.commitsMade)) *
        100
    );
}