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
  collection: Map<string, Tweet>;
  stopDate: Date;
}) {
  if (input.runs && input.runs > 1000) {
    console.log("Too many runs, stopping");
    return;
  }

  let query = `from:${input.username}`;
  if (input.max_id) {
    query += ` max_id:${BigInt(input.max_id) - 1n}`;
  }

  const queryParams = new URLSearchParams({
    query,
    type: "Latest",
  });
  const apiUrl = `https://api.socialdata.tools/twitter/search?${queryParams.toString()}`;
  console.log(queryParams.toString());
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
    console.log(
      tweet.tweet_created_at,
      `https://twitter.com/${input.username}/status/${tweet.id_str}`,
    );
    input.collection.set(tweet.id_str, tweet);
  });
  if (
    !oldestTweet?.id_str ||
    new Date(oldestTweet.tweet_created_at) < input.stopDate ||
    !hasAnyNewTweets
  ) {
    if (!oldestTweet?.id_str) {
      console.log("No more tweets to fetch");
    } else if (new Date(oldestTweet.tweet_created_at) < input.stopDate) {
      console.log(
        `Reached stop date ${input.stopDate.toISOString()} at tweet created at ${
          oldestTweet.tweet_created_at
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
  });
  return;
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
  const collection = new Map<string, Tweet>();
  await fetchFromSocialData({
    username: name,
    stopDate: stop,
    collection,
  });
  const tweets = Array.from(collection.values());
  console.log(tweets.length);

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

import { RatioPie } from "./pie";
import { GithubIcon, TwitterIcon } from "lucide-react";
import { RatioBarChart } from "./bar-chart";

// import { createStreamableUI } from "ai/rsc";
// // @ts-expect-error boo
// export async function GetWeather() {
//   const weatherUI = createStreamableUI();

//   weatherUI.update(<div style={{ color: "gray" }}>Loading...</div>);

//   // eslint-disable-next-line @typescript-eslint/no-misused-promises
//   setTimeout(async () => {
//     // wait 3 seconds
//     weatherUI.update(<div style={{ color: "red" }}>Still Loading...</div>);
//     await new Promise((resolve) => setTimeout(resolve, 3000));
//     weatherUI.done(<div>It's a sunny day!</div>);
//   }, 1000);

//   return weatherUI.value;
// }

export default async function Page(props: {
  searchParams: {
    github: string;
    twitter: string;
  };
}) {
  const { github: githubName, twitter: twitterName } = props.searchParams;
  const {
    avatar,
    heatmapData: githubData,
    twitter,
  } = await fetchGithubPage(githubName);
  const tweetsStop = githubData[0]!.day;
  const tweets = await fetchTweetsFromUser(twitterName, new Date(tweetsStop));

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
    <div className="flex min-h-full min-w-full flex-grow flex-col items-center py-8">
      <div className="mx-auto flex w-[1200px] flex-row items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-lg">{githubName}</span>
          <img
            src={`https://github.com/${githubName}.png`}
            alt="avatar"
            className="h-32 w-32"
          />
          <div className="flex flex-row gap-4">
            <a
              href={`https://twitter.com/${twitterName}`}
              className="flex flex-row items-center gap-2 hover:underline"
            >
              <TwitterIcon size={24} />
              {twitterName}
            </a>
            <a
              href={`
              https://github.com/${githubName}
              `}
              className="flex flex-row items-center gap-2 hover:underline"
            >
              <GithubIcon size={24} />
              {githubName}
            </a>
          </div>
          <span className="text-lg">
            {totalCommits} commits and {totalTweets} tweets
          </span>
        </div>
        <RatioPie commits={totalCommits} tweets={totalTweets} />
      </div>
      <div className="h-[170px] w-[1200px]">
        <Heatmap data={chunked} />
      </div>
      <div className="h-[170px] w-[1200px]">
        <RatioBarChart
          data={chunked.map((chunk) => ({
            day: `${chunk[0]!.day} - ${chunk.at(-1)!.day}`,
            tweets: chunk.reduce((acc, data) => acc + data.tweets, 0),
            commits: chunk.reduce((acc, data) => acc + data.commits, 0),
          }))}
        />
      </div>

      {/* <Suspense>
        <GetWeather />
      </Suspense> */}
    </div>
  );
}
