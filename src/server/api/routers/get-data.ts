
import type { HeatmapData } from "../../../lib/utils";
import { db } from "../../db";
import { TweetCommitData, User, users } from "../../db/schema";
import { fetchGithubPage } from "../../lib/github";
import { PartialTweet, fetchTweetsFromUser, fetchTwitterProfile } from "../../lib/twitter";

export const errors = ["Github page not found", "Twitter page not found", "Unknown error"] as const;
export const errorSet = new Set(errors);
export type Errors = typeof errors[number];

export function toUserSchema(props: {
  githubName: string;
  twitterName: string;
  metadata: { followers: number; twitter_username: string | null };
  twitterPage: { name: string; id_str: string; followers_count: number };
  merged: TweetCommitData;
}): User {
  const totalCommits = props.merged.reduce(
    (acc, data) => acc + data.commits,
    0,
  );
  const totalTweets = props.merged.reduce(
    (acc, data) => acc + data.tweets,
    0,
  );
  return {
    createdAt: new Date(),
    updatedAt: null,
    twitterDisplayName: props.twitterPage.name ?? props.twitterName,
    twitterId: props.twitterPage.id_str,
    twitterFollowerCount: props.twitterPage.followers_count ?? 0,
    githubFollowerCount: props.metadata.followers ?? 0,
    commitsMade: totalCommits ?? 0,
    githubName: props.githubName,
    twitterInGithubBio: props.metadata.twitter_username?.toLowerCase() === props.twitterName.toLowerCase(),
    twitterName: props.twitterName,
    tweetsSent: totalTweets ?? 0,
    heatmapData: props.merged,
  };
}

export const getUserDataStreamed = async (input: {
  githubName: string;
  twitterName: string;
  emit: (streamed: User) => void;
  onComplete: (streamed: User) => void;
}) => {
  const { githubName, twitterName } = input;
  const { heatmapData: githubData, metadata } = await fetchGithubPage(githubName);
  const twitterPage = await fetchTwitterProfile(twitterName);
  if (!twitterPage || !metadata) {
    throw new Error("Twitter page not found");
  }
  const tweetsStop = githubData[0]!.day;
  return fetchTweetsFromUser(twitterName, new Date(tweetsStop), (collection) => {
    input.emit(
      toUserSchema({
        githubName,
        twitterName,
        merged: parseCollection(collection, githubData),
        metadata,
        twitterPage,
      })
    );
  }).then(async (data) => {
    const merged = parseCollection(data, githubData);
    const asUser = toUserSchema({
      githubName,
      twitterName,
      merged,
      metadata,
      twitterPage,
    });
    input.onComplete(
      asUser
    );

    const { createdAt, updatedAt, ...rest } = asUser;
    const { heatmapData, ...restForLogging } = rest;
    console.log("Writing to db", restForLogging)
    await db.insert(users).values(rest).onDuplicateKeyUpdate({
      set: rest,
    })
  });
};

export function parseCollection(
  tweets: PartialTweet[],
  githubData: HeatmapData[],
): TweetCommitData {
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
import { and, eq } from "drizzle-orm";

export async function getCachedUserData(input: { githubName: string, twitterName: string }) {
  const { githubName, twitterName } = input;
  const user = await db.select().from(users).where(
    and(
      eq(users.githubName, githubName),
      eq(users.twitterName, twitterName)
    )
  ).execute().then(x => x.at(0));
  return user;
}

export type PageData = {
  isDataLoading: boolean;
  user: User;
};
