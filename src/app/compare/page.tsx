import type { HeatmapData } from "~/lib/utils";
import { HeatmapCalendar } from "../_components/heatmap";
import { Redis } from "@upstash/redis";
import { fetchGithubPage } from "~/lib/github";

const redis = new Redis({
  url: process.env.UPSTASH_URL!,
  token: process.env.UPSTASH_TOKEN!,
});
// export const runtime = "edge";

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
}): Promise<Tweet[]> {
  if (input.runs && input.runs > 5) {
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
  });
  console.log(
    `Fetching from snowflake ${input.max_id}, on run ${input.runs}, collected ${input.collectedTweets} tweets`,
  );
  const json = (await res.json()) as SuccessResponse | ErrorResponse;

  if ("status" in json) {
    throw new Error(json.message);
  }

  const oldestSnowflake = json.tweets[json.tweets.length - 1]?.id_str;

  if (!oldestSnowflake) {
    return json.tweets;
  }
  const nextTweets = await fetchFromSocialData({
    username: input.username,
    max_id: oldestSnowflake,
    runs: (input.runs ?? 0) + 1,
    collectedTweets: (input.collectedTweets ?? 0) + json.tweets.length,
  });
  return [...json.tweets, ...nextTweets];
}

async function fetchTweetsFromUser(name: string): Promise<HeatmapData[]> {
  const cached = await redis.get<HeatmapData[]>(`${name}-tweets`);
  if (cached) {
    console.log(`Using cached tweets for ${name}`);
    return cached;
  }
  console.log(`Cache miss for ${name}, fetching tweets`);
  const allData = await fetchFromSocialData({
    username: name,
    max_id: "1742008566487003505",
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
  return asArray;
}

export default async function Page() {
  const githubName = "RhysSullivan";
  const {
    avatar,
    heatmapData: pageData,
    twitter,
  } = await fetchGithubPage(githubName);
  console.log(twitter);
  const tweets = await fetchTweetsFromUser("RhysSullivan");

  const pageDataMap = new Map(pageData.map((d) => [d.day, d.value]));
  const tweetsMap = new Map(tweets.map((d) => [d.day, d.value]));

  const keys = new Set([...pageDataMap.keys(), ...tweetsMap.keys()]);
  const mergedData = new Map<string, number>();
  keys.forEach((key) => {
    const pageValue = pageDataMap.get(key) ?? 0;
    const tweetValue = tweetsMap.get(key) ?? 0;
    mergedData.set(key, pageValue > tweetValue ? pageValue : -tweetValue);
  });

  const mergedAsArray = Array.from(mergedData).map(([day, value]) => {
    return { date: day, count: value };
  });

  const tweetCount = tweets.reduce((acc, tweet) => {
    return acc + tweet.value;
  }, 0);
  const commitCount = pageData.reduce((acc, commit) => {
    return acc + commit.value;
  }, 0);
  return (
    <div>
      <a href={`https://github.com/${githubName}`}>
        <div>
          <span>{githubName}</span>
          <img src={avatar} alt="avatar" />
        </div>
      </a>
      <span>Tweet count: {tweetCount}</span>
      <br />
      <span>Commit count: {commitCount}</span>
      <div className="h-[400px] max-w-[70%]">
        <HeatmapCalendar
          values={mergedAsArray}
          startDate={"2023-01-01"}
          endDate="2023-12-31"
        />
      </div>

      {/* 70% green 30% blue from top left to bottom right */}
      <div
        className="size-[32px]"
        style={{
          background: `linear-gradient(45deg, #1DA1F2 70%, #28a745 30%)`,
        }}
      />
    </div>
  );
}
