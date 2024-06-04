import { readFromCache, writeToCache } from "./cache";
import { ErrorResponse, SuccessResponse, Tweet, TwitterUser } from "./twitter.types";

export async function fetchTwitterProfile(name: string) {
    const userInfo = await fetch(`https://api.socialdata.tools/twitter/user/${name}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${process.env.SOCIAL_DATA_API_KEY}`,
            Accept: "application/json",
        },
        cache: "force-cache",
    })
    return userInfo.json() as Promise<TwitterUser | undefined>;
}

const SAFETY_STOP = 3000;

export type PartialTweet = {
    id: string;
    full_text: string;
    text: string | null;
    created_at: string;
    retweet_count: number;
    favorite_count: number;
    bookmark_count: number;
    reply_count: number;
    view_count: number;
}
// sorted by ID in descending order
async function fetchFromSocialData(input: {
    username: string;
    max_id?: string;
    runs?: number;
    collection: Map<string, PartialTweet>;
    stopDate: Date;
    callback: (collection: PartialTweet[]) => void;
}) {
    if (input.runs && input.runs > SAFETY_STOP) {
        console.log("Too many runs, stopping");
        return;
    }

    let query = `from:${input.username}`;
    if (input.max_id) {
        query += ` max_id:${BigInt(input.max_id) - BigInt(1)}`;
    }

    const queryParams = new URLSearchParams({
        query,
        type: "Latest",
    });
    const apiUrl = `https://api.socialdata.tools/twitter/search?${queryParams.toString()}`;
    const res = await fetch(apiUrl, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${process.env.SOCIAL_DATA_API_KEY}`,
            Accept: "application/json",
        },
        cache: "force-cache",
    });
    const json = (await res.json()) as SuccessResponse | ErrorResponse;

    if ("status" in json) {
        throw new Error(json.message);
    }
    const oldestTweet = json.tweets
        .sort((a, b) => (BigInt(a.id_str) < BigInt(b.id_str) ? 1 : -1))
        .at(-1);
    console.log(
        `Fetching from snowflake ${input.max_id}, on run ${input.runs}, collected ${input.collection.size} tweets, oldest tweet created at ${oldestTweet?.tweet_created_at}`,
    );

    const hasAnyNewTweets = json.tweets.some(
        (tweet) => !input.collection.has(tweet.id_str),
    );
    json.tweets.forEach((tweet) => {
        input.collection.set(tweet.id_str,
            {
                id: tweet.id_str,
                full_text: tweet.full_text,
                text: tweet.text,
                created_at: tweet.tweet_created_at,
                retweet_count: tweet.retweet_count,
                favorite_count: tweet.favorite_count,
                bookmark_count: tweet.bookmark_count,
                reply_count: tweet.reply_count,
                view_count: tweet.views_count
            });
    });
    const array = Array.from(input.collection.values());
    input.callback(
        array
    );
    if (input.runs && (input.runs % 5 === 0)) {
        console.log('Setting partial cache')
        void setCachedTweets(input.username, array);
    }
    if (
        !oldestTweet?.id_str ||
        new Date(oldestTweet.tweet_created_at) < input.stopDate ||
        !hasAnyNewTweets
    ) {
        if (!oldestTweet?.id_str) {
            console.log("No more tweets to fetch");
        } else if (new Date(oldestTweet.tweet_created_at) < input.stopDate) {
            console.log(
                `Reached stop date ${input.stopDate.toISOString()} at tweet created at ${oldestTweet.tweet_created_at
                }`,
            );
        } else if (!hasAnyNewTweets) {
            console.log("Did not find any new tweets");
        }
        return;
    }
    await fetchFromSocialData({
        username: input.username,
        max_id: oldestTweet.id_str,
        runs: (input.runs ?? 0) + 1,
        stopDate: input.stopDate,
        collection: input.collection,
        callback: input.callback,
    });
    return;
}

function getCachedTweets(name: string) {
    return readFromCache<PartialTweet[]>(name);
}

function setCachedTweets(name: string, tweets: PartialTweet[]) {
    return writeToCache(name, tweets);
}

export async function fetchTweetsFromUser(
    name: string,
    stop: Date,
    callback: (collection: PartialTweet[]) => void,
) {
    const cached = await getCachedTweets(name);
    const oldestTweet = cached?.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? 1 : -1)).at(-1);
    const collection = new Map<string, PartialTweet>(
        cached?.map(tweet => [tweet.id, tweet]) ?? []
    );
    await fetchFromSocialData({
        username: name,
        stopDate: stop,
        collection,
        max_id: oldestTweet?.id,
        callback,
    });
    const tweets = Array.from(collection.values());
    console.log(`Caching ${tweets.length} tweets for ${name}`);
    return tweets;
}
