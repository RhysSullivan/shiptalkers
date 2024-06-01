import type { HeatmapData } from "~/lib/utils";

import { Redis } from "@upstash/redis";
import { fetchGithubPage } from "~/lib/github";
import { Heatmap } from "./heatmap";
import { chunk } from "lodash";
import { Suspense } from "react";
const redis = new Redis({
  url: process.env.UPSTASH_URL!,
  token: process.env.UPSTASH_TOKEN!,
});
export const runtime = "edge";

// If succeeded
type SuccessResponse = {
  next_cursor: string;
  tweets: Tweet[];
};

type Tweet = {
  tweet_created_at: string;
  id_str: string;
  text: null | string;
  full_text: string;
  source: string;
  truncated: boolean;
  in_reply_to_status_id_str: string | null;
  in_reply_to_user_id_str: string;
  in_reply_to_screen_name: string;
  user: User;
  quoted_status_id_str: string | null;
  is_quote_status: boolean;
  quoted_status: null;
  retweeted_status: null;
  quote_count: number;
  reply_count: number;
  retweet_count: number;
  favorite_count: number;
  lang: string;
  entities: {
    user_mentions: UserMention[];
    urls: unknown[]; // You may want to define a type for URLs
    hashtags: unknown[]; // You may want to define a type for hashtags
    symbols: unknown[]; // You may want to define a type for symbols
  };
  views_count: number;
  bookmark_count: number;
};

type User = {
  id_str: string;
  name: string;
  screen_name: string;
  location: string;
  url: null;
  description: string;
  protected: boolean;
  verified: boolean;
  followers_count: number;
  friends_count: number;
  listed_count: number;
  favourites_count: number;
  statuses_count: number;
  created_at: string;
  profile_banner_url: string;
  profile_image_url_https: string;
  can_dm: boolean;
};

type UserMention = {
  id_str: string;
  name: string;
  screen_name: string;
  indices: [number, number];
};

// If failed
type ErrorResponse = {
  status: "error";
  message: string;
};

// sorted by ID in descending order
async function fetchFromSocialData(input: {
  username: string;
  max_id?: string;
  runs?: number;
  collectedTweets?: number;
  stopDate: Date;
}): Promise<Tweet[]> {
  if (input.runs && input.runs > 200) {
    return []; // base case
  }
  let query = `from:${input.username}`;
  if (input.max_id) {
    query += ` max_id:${input.max_id}`;
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
  console.log(
    `Fetching from snowflake ${input.max_id}, on run ${input.runs}, collected ${input.collectedTweets} tweets`,
  );
  const json = (await res.json()) as SuccessResponse | ErrorResponse;

  if ("status" in json) {
    throw new Error(json.message);
  }

  const lastTweet = json.tweets.at(-1);
  const oldestSnowflake = json.tweets[json.tweets.length - 1]?.id_str;

  if (
    !lastTweet?.id_str ||
    new Date(lastTweet.tweet_created_at) < input.stopDate
  ) {
    if (!lastTweet?.id_str) {
      console.log("No more tweets to fetch");
    } else if (new Date(lastTweet.tweet_created_at) < input.stopDate) {
      console.log(
        `Reached stop date ${input.stopDate.toISOString()} at tweet created at ${
          lastTweet.tweet_created_at
        }`,
      );
    }
    return json.tweets;
  }
  const nextTweets = await fetchFromSocialData({
    username: input.username,
    max_id: oldestSnowflake,
    runs: (input.runs ?? 0) + 1,
    collectedTweets: (input.collectedTweets ?? 0) + json.tweets.length,
    stopDate: input.stopDate,
  });
  return [...json.tweets, ...nextTweets];
}

async function fetchTweetsFromUser(
  name: string,
  stop: Date,
): Promise<HeatmapData[]> {
  const cached = await redis.get<HeatmapData[]>(`${name}-tweets`);
  if (cached) {
    console.log(`Using cached tweets for ${name}`);
    return cached;
  }
  console.log(`Cache miss for ${name}, fetching tweets`);
  const allData = await fetchFromSocialData({
    username: name,
    stopDate: stop,
  });

  const tweets = allData;
  const tweetsByDay = tweets.reduce(
    (acc, tweet) => {
      const date = new Date(tweet.tweet_created_at)
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
  await redis.set<HeatmapData[]>(`${name}-tweets`, asArray);
  // await redis.set(`${name}-tweets-raw`, tweets);
  return asArray;
}

import { createStreamableUI } from "ai/rsc";

// @ts-expect-error boo
export async function GetWeather() {
  const weatherUI = createStreamableUI();

  weatherUI.update(<div style={{ color: "gray" }}>Loading...</div>);

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  setTimeout(async () => {
    // wait 3 seconds
    weatherUI.update(<div style={{ color: "red" }}>Still Loading...</div>);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    weatherUI.done(<div>It's a sunny day!</div>);
  }, 1000);

  return weatherUI.value;
}

export default async function Page() {
  const githubName = "RhysSullivan";
  const {
    avatar,
    heatmapData: githubData,
    twitter,
  } = await fetchGithubPage(githubName);
  const tweetsStop = githubData[0]!.day;
  const tweets = await fetchTweetsFromUser(
    "RhysSullivan",
    new Date(tweetsStop),
  );

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
  tweets.forEach((data) => {
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

  const chunked = chunk(dataInOrder, 7);

  const totalTweets = tweets.reduce((acc, tweet) => acc + tweet.value, 0);
  const totalCommits = githubData.reduce(
    (acc, commit) => acc + commit.value,
    0,
  );
  return (
    <div className="flex min-h-full min-w-full flex-grow flex-col items-center justify-center">
      <a
        href={`https://github.com/${githubName}`}
        className="mx-auto w-[1200px]"
      >
        <div className="flex flex-col gap-4">
          <span className="text-lg">{githubName}</span>
          <img
            src={"https://avatars.githubusercontent.com/u/39114868?v=4"}
            alt="avatar"
            className="h-32 w-32"
          />
          <span className="text-lg">
            {totalCommits} commits and {totalTweets} tweets
          </span>
        </div>
      </a>
      <div className="h-[170px] w-[1200px]">
        <Heatmap data={chunked} />
      </div>
      {/* <Suspense>
        <GetWeather />
      </Suspense> */}
    </div>
  );
}
