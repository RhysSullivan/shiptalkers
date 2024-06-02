import { Redis } from "@upstash/redis";
import { HeatmapData } from "../../../lib/utils";
import { fetchGithubPage } from "../../../lib/github";

const redis = new Redis({
  url: process.env.UPSTASH_URL!,
  token: process.env.UPSTASH_TOKEN!,
});

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
  callback: (collection: Map<string, Tweet>) => void;
}) {
  if (input.runs && input.runs > 10000) {
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
  input.callback(input.collection);
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

function parseCollection(
  collection: Map<string, Tweet>,
  githubData: HeatmapData[],
) {
  const tweets = Array.from(collection.values());

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

async function fetchTweetsFromUser(
  name: string,
  stop: Date,
  callback: (collection: Map<string, Tweet>) => void,
) {
  console.log(`Cache miss for ${name}, fetching tweets`);
  const collection = new Map<string, Tweet>();
  await fetchFromSocialData({
    username: name,
    stopDate: stop,
    collection,
    callback,
  });
  return collection;
}

export type TweetCommitData = {
  day: string;
  commits: number;
  tweets: number;
}[];

export const getData = async (input: {
  githubName: string;
  twitterName: string;
  emit: (chunked: TweetCommitData) => void;
  onComplete: (chunked: TweetCommitData) => void;
}) => {
  const { githubName, twitterName } = input;
  const { heatmapData: githubData } = await fetchGithubPage(githubName);
  const tweetsStop = githubData[0]!.day;

  void fetchTweetsFromUser(twitterName, new Date(tweetsStop), (collection) => {
    input.emit(parseCollection(collection, githubData));
  }).then(async (data) => {
    input.onComplete(parseCollection(data, githubData));
    await redis.set<PageData>(`${githubName}-${twitterName}-page-data`, {
      isDataLoading: false,
      data: parseCollection(data, githubData),
    });
  });
};
export type PageData = {
  isDataLoading: boolean;
  data: TweetCommitData;
};
export function getCachedData(key: string) {
  return redis.get<PageData>(`${key}-page-data`);
}
