import { env } from "../../env";
import { readFromCache, writeToCache } from "./cache";
import { throttledQueue } from "./throttle";
import { ErrorResponse, SuccessResponse, Tweet, TwitterUser } from "./twitter.types";



const throttle = throttledQueue({
    maxRequestsPerInterval: 350,
    interval: 70000,
    evenlySpaced: true,
    onThrottle(numRequestsInQueue) {
        console.log(`Throttling fetch, ${numRequestsInQueue} in queue`);
    },
});

export async function getCachedTwitterProfile(name: string) {
    const cached = await readFromCache<TwitterUser>(`twitter-profile-${name}`);
    const isRealCached = cached && !('json' in cached) && 'name' in cached;
    if (!isRealCached) {
        return null;
    }
    return cached;
}


export async function fetchTwitterProfile(name: string) {
    const cached = await getCachedTwitterProfile(name);
    if (cached) {
        return cached;
    }
    const userInfo = await throttle(async () => {
        return await fetch(`https://api.socialdata.tools/twitter/user/${name}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${process.env.SOCIAL_DATA_API_KEY}`,
                Accept: "application/json",
            },
            cache: "force-cache",
        })
    }
    );

    if (!userInfo.ok) {
        if (userInfo.status == 429) {
            throw new Error(`Rate limit exceeded fetching ${name} ${userInfo.status}`);
        }
        throw new Error(`Failed to fetch twitter profile for ${name} ${userInfo.status}`);
    }
    const data = await userInfo.json() as Promise<TwitterUser>;
    await writeToCache(`twitter-profile-${name}`, data);
    return data;
}

const SAFETY_STOP = env.NODE_ENV === "development" ? 10 : 3000;

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
    const res = await throttle(async () => {
        return await fetch(apiUrl, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${process.env.SOCIAL_DATA_API_KEY}`,
                Accept: "application/json",
            },
            cache: "force-cache",
        })
    });
    console.log(`Fetching tweets from ${apiUrl} with status ${res.status}`)
    const json = (await res.json()) as SuccessResponse | ErrorResponse;
    if ("status" in json) {
        throw new Error(json.message);
    }
    if (!('tweets' in json) || json.tweets === undefined) {
        console.error('No tweets found in response', json);
        throw new Error(`No tweets found in response ${res.status}`);
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
    if (input.runs) {
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

export function getCachedTweets(name: string) {
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
