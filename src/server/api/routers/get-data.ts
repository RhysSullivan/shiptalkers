
import type { HeatmapData } from "../../../lib/utils";
import { fetchGithubPage } from "../../lib/github";
import type { ErrorResponse, SuccessResponse, Tweet } from "./types";
import { readFromCache, writeToCache } from "../../lib/cache";
import { fetchTwitterProfile } from "../../lib/twitter";

const SAFETY_STOP = 10;

// sorted by ID in descending order
async function fetchFromSocialData(input: {
  username: string;
  max_id?: string;
  runs?: number;
  collection: Map<string, Tweet>;
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
    input.collection.set(tweet.id_str, tweet);
  });
  input.callback(
    Array.from(input.collection.values()).map((tweet) => ({
      id: tweet.id_str,
      full_text: tweet.full_text,
      text: tweet.text,
      created_at: tweet.tweet_created_at,
      retweet_count: tweet.retweet_count,
      favorite_count: tweet.favorite_count,
      bookmark_count: tweet.bookmark_count,
      reply_count: tweet.reply_count,
      view_count: tweet.views_count
    })),
  );
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

type PartialTweet = {
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

function parseCollection(
  tweets: PartialTweet[],
  githubData: HeatmapData[],
) {
  const tweetsByDay = tweets.reduce(
    (acc, tweet) => {
      const date = new Date(tweet.created_at)
        .toISOString()
        .split("T")[0]!;
      if (acc[date]) {
        acc[date]++;
      } else {
        acc[date] = 1;
      }
      return acc;
    },
    {} as Record<string, number>,
  );
  const asArray = Object.keys(tweetsByDay).map((day) => ({
    day,
    value: tweetsByDay[day]!,
  }));
  const merged = new Map<
    string,
    {
      tweets: number;
      commits: number;
    }
  >();
  githubData.forEach((data) => {
    merged.set(data.day, {
      tweets: 0,
      commits: data.value,
    });
  });
  asArray.forEach((data) => {
    const existing = merged.get(data.day);
    if (existing) {
      existing.tweets = data.value;
    } else {
      merged.set(data.day, {
        tweets: data.value,
        commits: 0,
      });
    }
  });

  const keysInOrder = [...merged.keys()].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );

  const dataInOrder = keysInOrder.map((key) => ({
    day: key,
    commits: merged.get(key)!.commits,
    tweets: merged.get(key)!.tweets,
  }));
  return dataInOrder;
}

async function getCachedTweets(name: string) {
  return readFromCache<PartialTweet[]>(`${name}-tweets-v2`);
}

async function fetchTweetsFromUser(
  name: string,
  stop: Date,
  callback: (collection: PartialTweet[]) => void,
) {
  const cached = await getCachedTweets(name);
  if (cached) {
    return cached
  };
  const collection = new Map<string, Tweet>();
  await fetchFromSocialData({
    username: name,
    stopDate: stop,
    collection,
    callback,
  });
  const tweets = Array.from(collection.values()).map(
    tweet => ({
      id: tweet.id_str,
      full_text: tweet.full_text,
      text: tweet.text,
      created_at: tweet.tweet_created_at,
      retweet_count: tweet.retweet_count,
      favorite_count: tweet.favorite_count,
      bookmark_count: tweet.bookmark_count,
      reply_count: tweet.reply_count,
      view_count: tweet.views_count
    })
  );
  console.log(`Caching ${tweets.length} tweets for ${name}`);
  await writeToCache<PartialTweet[]>(`${name}-tweets-v2`, tweets);
  return tweets;
}

export type TweetCommitData = {
  day: string;
  commits: number;
  tweets: number;
}[];

export const getUserDataStreamed = async (input: {
  githubName: string;
  twitterName: string;
  emit: (chunked: TweetCommitData) => void;
  onComplete: (chunked: TweetCommitData) => void;
}) => {
  const { githubName, twitterName } = input;
  const { heatmapData: githubData } = await fetchGithubPage(githubName);
  const tweetsStop = githubData[0]!.day;
  return fetchTweetsFromUser(twitterName, new Date(tweetsStop), (collection) => {
    input.emit(parseCollection(collection, githubData));
  }).then(async (data) => {
    input.onComplete(parseCollection(data, githubData));
  });
};
export async function getCachedUserData(input: { githubName: string, twitterName: string }) {
  const { githubName, twitterName } = input;
  const [gh, twitterProfile] = await Promise.all([
    fetchGithubPage(githubName),
    fetchTwitterProfile(twitterName),
  ]);
  const tweets = await getCachedTweets(twitterName);
  return {
    ...gh,
    twitterProfile,
    data: tweets ? parseCollection(tweets, gh.heatmapData) : null,
  };
}

export type PageData = {
  isDataLoading: boolean;
  data: TweetCommitData;
};
