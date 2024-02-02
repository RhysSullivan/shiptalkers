import { parse } from "node-html-parser";
import { ClientHeatmap } from "../_components/heatmap";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_URL!,
  token: process.env.UPSTASH_TOKEN!,
});
// export const runtime = "edge";

type HeatmapData = {
  day: string;
  value: number;
};

async function fetchGithubPage(name: string) {
  const data = await fetch(
    `https://github.com/${name}?tab=overview&from=2023-01-01`,
  );
  // Assuming you have access to the HTML content as a string
  const htmlContent = await data.text();
  const doc = parse(htmlContent);

  // Get the tbody element
  const tbody = doc.querySelector("tbody");

  const heatmapData: HeatmapData[] = [];
  // Check if tbody is found
  if (tbody) {
    // Get all the tr elements inside tbody
    const trElements = tbody.querySelectorAll("tr");

    // Iterate through each tr element
    trElements.forEach((tr) => {
      // Get all the td elements inside each tr
      const tdElements = tr.querySelectorAll("td");

      // Extract and log data from each td
      tdElements.forEach((td) => {
        const date = td.getAttribute("data-date");

        // find in the td elements, the <tool-tip> with the property for=td.id

        const toolTip = tr.querySelector(`[for=${td.id}]`);
        // text can be {number} contributions... or "No contributions"
        const text = toolTip?.text.trim().split(" ")[0];
        if (!text || !date) {
          return;
        }
        const count = !/\D/.test(text) ? parseInt(text) : 0;

        heatmapData.push({
          day: date,
          value: count,
        });
      });
    });
  } else {
    console.error("Tbody not found in the HTML content");
  }
  // find <img src="https://avatars.githubusercontent.com/u/39114868?v=4" alt="" size="32" height="32" width="32" data-view-component="true" class="avatar circle"/>
  const avatar = doc.querySelector("img.avatar")?.getAttribute("src");
  return {
    avatar,
    heatmapData,
  };
}

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
  const { avatar, heatmapData: pageData } = await fetchGithubPage(githubName);
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
    return { day, value };
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
        <ClientHeatmap
          data={mergedAsArray}
          from="2023-01-01"
          to="2023-12-31"
          margin={{ top: 40, right: 40, bottom: 100, left: 40 }}
          dayBorderWidth={2}
        />
      </div>
    </div>
  );
}
