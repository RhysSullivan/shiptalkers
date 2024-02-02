import { parse } from "node-html-parser";
import { ClientHeatmap } from "../_components/heatmap";
import { TwitterOpenApi } from "twitter-openapi-typescript";
import fs from "fs";
// export const runtime = "edge";

type HeatmapData = {
  day: string;
  value: number;
};

async function fetchGithubPage(name: string): Promise<HeatmapData[]> {
  const data = await fetch(
    `https://github.com/${name}?tab=overview&from=2024-02-01`,
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
        const level = td.getAttribute("data-level");
        if (date && level) {
          heatmapData.push({
            day: date,
            value: parseInt(level, 10),
          });
        }
      });
    });
  } else {
    console.error("Tbody not found in the HTML content");
  }
  return heatmapData;
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
    urls: any[]; // You may want to define a type for URLs
    hashtags: any[]; // You may want to define a type for hashtags
    symbols: any[]; // You may want to define a type for symbols
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

async function fetchAllTweetsInTimePeriod(): SuccessResponse {
  return JSON.parse(
    // decode from base64
    Buffer.from(
      "ewogICAgIm5leHRfY3Vyc29yIjogIkRBQUNDZ0FDR0MxMkZobUFKeEFLQUFNWUxYWVdHWF9ZOEFnQUJBQUFBQUlMQUFVQUFBRG9SVzFRUXpaM1FVRkJabEV2WjBkS1RqQjJSM0F2UVVGQlFVSk5XVXhUTmtReVFtRm9VWGhuZEZSUmVTOUdhME5PUjBNd1pHOXlTMWh6VTJOWlRGRndZbTB4WTFJMGFHZDBZbWhaYzFkclEzRkhRekJqVVhOU1YxbFNaMWxNVm1sNVYzQnhRVTlDWjNSTWJVaFVWMnREYjBkRE1WRnVWVzFZTUVGeldVeEtZVVJoT1Zwb2IzaG5kRlp0YWtsR2FrTk5SME14V0dkbFQxZFpTRTFaVEZSWU5GTndaVUVyYUdkMFkyaDJiRVl4Umt4SFF6Rk5NaTgzVjFWR2MxbE1UVFp3ZW1oWlFXdDRaM1JXTWtKS2JETkdOMGRETVdGR1RYQllVVVk0V1V4VVVFUnVSbHAzVVZFOVBRZ0FCZ0FBQUFBSUFBY0FBQUFBREFBSUNnQUJHQ3lXZzJ2V1lhTUFBQUEiLAogICAgInR3ZWV0cyI6IFsKICAgICAgICB7CiAgICAgICAgICAgICJ0d2VldF9jcmVhdGVkX2F0IjogIjIwMjMtMTItMTNUMDU6Mzk6MDkuMDAwMDAwWiIsCiAgICAgICAgICAgICJpZF9zdHIiOiAiMTczNDgxMDE2ODA1Mzk1NjcxOSIsCiAgICAgICAgICAgICJ0ZXh0IjogbnVsbCwKICAgICAgICAgICAgImZ1bGxfdGV4dCI6ICJAVGVzbGFIeXBlIFBhY2Ugb2YgUHJvZ3Jlc3MiLAogICAgICAgICAgICAic291cmNlIjogIjxhIGhyZWY9XCJodHRwOlxcL1xcL3R3aXR0ZXIuY29tXFwvZG93bmxvYWRcXC9pcGhvbmVcIiByZWw9XCJub2ZvbGxvd1wiPlR3aXR0ZXIgZm9yIGlQaG9uZTxcXC9hPiIsCiAgICAgICAgICAgICJ0cnVuY2F0ZWQiOiBmYWxzZSwKICAgICAgICAgICAgImluX3JlcGx5X3RvX3N0YXR1c19pZF9zdHIiOiAiMTczNDc3NzA4NDI2ODkyMDk2MCIsCiAgICAgICAgICAgICJpbl9yZXBseV90b191c2VyX2lkX3N0ciI6ICIxMzExNTA2NjIyODIxNDAwNTgxIiwKICAgICAgICAgICAgImluX3JlcGx5X3RvX3NjcmVlbl9uYW1lIjogIlRlc2xhSHlwZSIsCiAgICAgICAgICAgICJ1c2VyIjogewogICAgICAgICAgICAgICAgImlkX3N0ciI6ICI0NDE5NjM5NyIsCiAgICAgICAgICAgICAgICAibmFtZSI6ICJFbG9uIE11c2siLAogICAgICAgICAgICAgICAgInNjcmVlbl9uYW1lIjogImVsb25tdXNrIiwKICAgICAgICAgICAgICAgICJsb2NhdGlvbiI6ICJcXHVkODM1XFx1ZGQ0ZlxcdTAwZDAiLAogICAgICAgICAgICAgICAgInVybCI6IG51bGwsCiAgICAgICAgICAgICAgICAiZGVzY3JpcHRpb24iOiAiIiwKICAgICAgICAgICAgICAgICJwcm90ZWN0ZWQiOiBmYWxzZSwKICAgICAgICAgICAgICAgICJ2ZXJpZmllZCI6IGZhbHNlLAogICAgICAgICAgICAgICAgImZvbGxvd2Vyc19jb3VudCI6IDE2NjIxMzM0OSwKICAgICAgICAgICAgICAgICJmcmllbmRzX2NvdW50IjogNTA2LAogICAgICAgICAgICAgICAgImxpc3RlZF9jb3VudCI6IDE0OTU4NiwKICAgICAgICAgICAgICAgICJmYXZvdXJpdGVzX2NvdW50IjogMzc5NTgsCiAgICAgICAgICAgICAgICAic3RhdHVzZXNfY291bnQiOiAzNDkzNCwKICAgICAgICAgICAgICAgICJjcmVhdGVkX2F0IjogIjIwMDktMDYtMDJUMjA6MTI6MjkuMDAwMDAwWiIsCiAgICAgICAgICAgICAgICAicHJvZmlsZV9iYW5uZXJfdXJsIjogImh0dHBzOlxcL1xcL3Bicy50d2ltZy5jb21cXC9wcm9maWxlX2Jhbm5lcnNcXC80NDE5NjM5N1xcLzE2OTA2MjEzMTIiLAogICAgICAgICAgICAgICAgInByb2ZpbGVfaW1hZ2VfdXJsX2h0dHBzIjogImh0dHBzOlxcL1xcL3Bicy50d2ltZy5jb21cXC9wcm9maWxlX2ltYWdlc1xcLzE2ODMzMjUzODA0NDExMjg5NjBcXC95UnNSUmpHT19ub3JtYWwuanBnIiwKICAgICAgICAgICAgICAgICJjYW5fZG0iOiBmYWxzZQogICAgICAgICAgICB9LAogICAgICAgICAgICAicXVvdGVkX3N0YXR1c19pZF9zdHIiOiBudWxsLAogICAgICAgICAgICAiaXNfcXVvdGVfc3RhdHVzIjogZmFsc2UsCiAgICAgICAgICAgICJxdW90ZWRfc3RhdHVzIjogbnVsbCwKICAgICAgICAgICAgInJldHdlZXRlZF9zdGF0dXMiOiBudWxsLAogICAgICAgICAgICAicXVvdGVfY291bnQiOiAxMSwKICAgICAgICAgICAgInJlcGx5X2NvdW50IjogMTU2LAogICAgICAgICAgICAicmV0d2VldF9jb3VudCI6IDc4LAogICAgICAgICAgICAiZmF2b3JpdGVfY291bnQiOiA5NzcsCiAgICAgICAgICAgICJsYW5nIjogImVuIiwKICAgICAgICAgICAgImVudGl0aWVzIjogewogICAgICAgICAgICAgICAgInVzZXJfbWVudGlvbnMiOiBbCiAgICAgICAgICAgICAgICAgICAgewogICAgICAgICAgICAgICAgICAgICAgICAiaWRfc3RyIjogIjEzMTE1MDY2MjI4MjE0MDA1ODEiLAogICAgICAgICAgICAgICAgICAgICAgICAibmFtZSI6ICJUZXNsYSBIeXBlIiwKICAgICAgICAgICAgICAgICAgICAgICAgInNjcmVlbl9uYW1lIjogIlRlc2xhSHlwZSIsCiAgICAgICAgICAgICAgICAgICAgICAgICJpbmRpY2VzIjogWwogICAgICAgICAgICAgICAgICAgICAgICAgICAgMCwKICAgICAgICAgICAgICAgICAgICAgICAgICAgIDEwCiAgICAgICAgICAgICAgICAgICAgICAgIF0KICAgICAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgICAgICBdLAogICAgICAgICAgICAgICAgInVybHMiOiBbXSwKICAgICAgICAgICAgICAgICJoYXNodGFncyI6IFtdLAogICAgICAgICAgICAgICAgInN5bWJvbHMiOiBbXQogICAgICAgICAgICB9LAogICAgICAgICAgICAidmlld3NfY291bnQiOiAzMjM3NywKICAgICAgICAgICAgImJvb2ttYXJrX2NvdW50IjogMTkKICAgICAgICB9LAogICAgICAgIHsKICAgICAgICAgICAgInR3ZWV0X2NyZWF0ZWRfYXQiOiAiMjAyMy0xMi0xM1QwNTozODoyNi4wMDAwMDBaIiwKICAgICAgICAgICAgImlkX3N0ciI6ICIxNzM0ODA5OTg0Njc0NjkzNDQ2IiwKICAgICAgICAgICAgInRleHQiOiBudWxsLAogICAgICAgICAgICAiZnVsbF90ZXh0IjogIkBhbmFtbW9zdGFyYWMgWWVhaCIsCiAgICAgICAgICAgICJzb3VyY2UiOiAiPGEgaHJlZj1cImh0dHA6XFwvXFwvdHdpdHRlci5jb21cXC9kb3dubG9hZFxcL2lwaG9uZVwiIHJlbD1cIm5vZm9sbG93XCI+VHdpdHRlciBmb3IgaVBob25lPFxcL2E+IiwKICAgICAgICAgICAgInRydW5jYXRlZCI6IGZhbHNlLAogICAgICAgICAgICAiaW5fcmVwbHlfdG9fc3RhdHVzX2lkX3N0ciI6ICIxNzM0ODA5NTYyMjU4Mjc2NjU0IiwKICAgICAgICAgICAgImluX3JlcGx5X3RvX3VzZXJfaWRfc3RyIjogIjI4NTI1NzA2NjQiLAogICAgICAgICAgICAiaW5fcmVwbHlfdG9fc2NyZWVuX25hbWUiOiAiYW5hbW1vc3RhcmFjIiwKICAgICAgICAgICAgInVzZXIiOiB7CiAgICAgICAgICAgICAgICAiaWRfc3RyIjogIjQ0MTk2Mzk3IiwKICAgICAgICAgICAgICAgICJuYW1lIjogIkVsb24gTXVzayIsCiAgICAgICAgICAgICAgICAic2NyZWVuX25hbWUiOiAiZWxvbm11c2siLAogICAgICAgICAgICAgICAgImxvY2F0aW9uIjogIlxcdWQ4MzVcXHVkZDRmXFx1MDBkMCIsCiAgICAgICAgICAgICAgICAidXJsIjogbnVsbCwKICAgICAgICAgICAgICAgICJkZXNjcmlwdGlvbiI6ICIiLAogICAgICAgICAgICAgICAgInByb3RlY3RlZCI6IGZhbHNlLAogICAgICAgICAgICAgICAgInZlcmlmaWVkIjogZmFsc2UsCiAgICAgICAgICAgICAgICAiZm9sbG93ZXJzX2NvdW50IjogMTY2MjEzMzQ5LAogICAgICAgICAgICAgICAgImZyaWVuZHNfY291bnQiOiA1MDYsCiAgICAgICAgICAgICAgICAibGlzdGVkX2NvdW50IjogMTQ5NTg2LAogICAgICAgICAgICAgICAgImZhdm91cml0ZXNfY291bnQiOiAzNzk1OCwKICAgICAgICAgICAgICAgICJzdGF0dXNlc19jb3VudCI6IDM0OTM0LAogICAgICAgICAgICAgICAgImNyZWF0ZWRfYXQiOiAiMjAwOS0wNi0wMlQyMDoxMjoyOS4wMDAwMDBaIiwKICAgICAgICAgICAgICAgICJwcm9maWxlX2Jhbm5lcl91cmwiOiAiaHR0cHM6XFwvXFwvcGJzLnR3aW1nLmNvbVxcL3Byb2ZpbGVfYmFubmVyc1xcLzQ0MTk2Mzk3XFwvMTY5MDYyMTMxMiIsCiAgICAgICAgICAgICAgICAicHJvZmlsZV9pbWFnZV91cmxfaHR0cHMiOiAiaHR0cHM6XFwvXFwvcGJzLnR3aW1nLmNvbVxcL3Byb2ZpbGVfaW1hZ2VzXFwvMTY4MzMyNTM4MDQ0MTEyODk2MFxcL3lSc1JSakdPX25vcm1hbC5qcGciLAogICAgICAgICAgICAgICAgImNhbl9kbSI6IGZhbHNlCiAgICAgICAgICAgIH0sCiAgICAgICAgICAgICJxdW90ZWRfc3RhdHVzX2lkX3N0ciI6IG51bGwsCiAgICAgICAgICAgICJpc19xdW90ZV9zdGF0dXMiOiBmYWxzZSwKICAgICAgICAgICAgInF1b3RlZF9zdGF0dXMiOiBudWxsLAogICAgICAgICAgICAicmV0d2VldGVkX3N0YXR1cyI6IG51bGwsCiAgICAgICAgICAgICJxdW90ZV9jb3VudCI6IDQsCiAgICAgICAgICAgICJyZXBseV9jb3VudCI6IDY0LAogICAgICAgICAgICAicmV0d2VldF9jb3VudCI6IDMwLAogICAgICAgICAgICAiZmF2b3JpdGVfY291bnQiOiA1MTMsCiAgICAgICAgICAgICJsYW5nIjogImVuIiwKICAgICAgICAgICAgImVudGl0aWVzIjogewogICAgICAgICAgICAgICAgInVzZXJfbWVudGlvbnMiOiBbCiAgICAgICAgICAgICAgICAgICAgewogICAgICAgICAgICAgICAgICAgICAgICAiaWRfc3RyIjogIjI4NTI1NzA2NjQiLAogICAgICAgICAgICAgICAgICAgICAgICAibmFtZSI6ICJBbmEgTW9zdGFyYWMiLAogICAgICAgICAgICAgICAgICAgICAgICAic2NyZWVuX25hbWUiOiAiYW5hbW1vc3RhcmFjIiwKICAgICAgICAgICAgICAgICAgICAgICAgImluZGljZXMiOiBbCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLAogICAgICAgICAgICAgICAgICAgICAgICAgICAgMTMKICAgICAgICAgICAgICAgICAgICAgICAgXQogICAgICAgICAgICAgICAgICAgIH0KICAgICAgICAgICAgICAgIF0sCiAgICAgICAgICAgICAgICAidXJscyI6IFtdLAogICAgICAgICAgICAgICAgImhhc2h0YWdzIjogW10sCiAgICAgICAgICAgICAgICAic3ltYm9scyI6IFtdCiAgICAgICAgICAgIH0sCiAgICAgICAgICAgICJ2aWV3c19jb3VudCI6IDI1NTc5LAogICAgICAgICAgICAiYm9va21hcmtfY291bnQiOiAzCiAgICAgICAgfQogICAgXQpd",
      "base64",
    ).toString("utf-8"),
  ) as SuccessResponse;
}

async function fetchFromSocialData(input: { restId: string; cursor?: string }) {
  const apiUrl = `https://api.socialdata.tools/twitter/user/${
    input.restId
  }/tweets-and-replies${input.cursor ? `?cursor=${input.cursor}` : ""}`;

  const res = await fetch(apiUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.SOCIAL_DATA_API_KEY}`,
      Accept: "application/json",
    },
  });
  const json = (await res.json()) as SuccessResponse | ErrorResponse;

  if ("status" in json) {
    throw new Error(json.message);
  }
  return json;
}

async function fetchAllSocialData(input: {
  restId: string;
  after: `${number}-${number}-${number}`;
}) {
  const allData: Tweet[] = [];
  let lastOldestTweetDate: Date | undefined = undefined;
  let cursor: string | undefined =
    "DAABCgABGFUH3Ds__3gKAAIYLLJr1Ztx4ggAAwAAAAIAAA";
  do {
    console.log(
      `Collected ${allData.length} tweets so far. Fetching more before ${
        lastOldestTweetDate?.toISOString() ?? ""
      } and after ${input.after} with cursor ${cursor}`,
    );
    const data = await fetchFromSocialData({ restId: input.restId, cursor });
    console.log(data);
    allData.push(
      ...data.tweets.filter(
        (tweet) => new Date(tweet.tweet_created_at) > new Date(input.after),
      ),
    );
    const oldestTweet = data.tweets[data.tweets.length - 1];
    if (!oldestTweet) {
      break;
    }
    lastOldestTweetDate = new Date(oldestTweet.tweet_created_at);
    if (lastOldestTweetDate < new Date(input.after)) {
      break;
    }
    cursor = data.next_cursor;
  } while (cursor);
  return allData;
}

async function fetchTweetsFromUser(name: string): Promise<HeatmapData[]> {
  const twitApi = new TwitterOpenApi();
  const client = await twitApi.getGuestClient();

  const screenNameLookup = await client
    .getUserApi()
    .getUserByScreenName({ screenName: name });
  const restId = screenNameLookup.data.user?.restId;
  if (!restId) {
    throw new Error("User not found");
  }

  // tweet_created_at is in format of: 2024-02-02T04:06:14.000000Z
  // filter to only user.id == restId
  const allData = await fetchAllSocialData({
    restId,
    after: "2023-12-15",
  });
  const tweets = allData.filter((tweet) => tweet.user.id_str === restId);
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
  return Object.keys(tweetsByDay).map((day) => ({
    day,
    value: tweetsByDay[day]!,
  }));
}

export default async function Page() {
  const pageData = await fetchGithubPage("RhysSullivan");
  const tweets = await fetchTweetsFromUser("RhysSullivan");
  return (
    <div>
      <h2>Tweet count: 0</h2>
      <div className="h-[400px]">
        <ClientHeatmap
          data={pageData}
          from="2023-01-01"
          to="2023-12-31"
          emptyColor="#eeeeee"
          colors={[
            // github colors
            "#eeeeee",
            "#d6e685",
            "#8cc665",
            "#44a340",
            "#1e6823",
          ]}
          margin={{ top: 40, right: 40, bottom: 100, left: 40 }}
          dayBorderWidth={2}
          dayBorderColor="#ffffff"
          legends={[
            {
              anchor: "bottom-right",
              direction: "row",
              justify: false,
              itemCount: 4,
              itemWidth: 42,
              itemHeight: 36,
              itemsSpacing: 14,
              itemDirection: "right-to-left",
              translateX: -60,
              translateY: -60,
              symbolSize: 20,
            },
          ]}
        />
      </div>
    </div>
  );
}
