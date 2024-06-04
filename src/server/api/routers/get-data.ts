
import type { HeatmapData } from "../../../lib/utils";
import { db } from "../../db";
import { TweetCommitData, users } from "../../db/schema";
import { fetchGithubPage } from "../../lib/github";
import { PartialTweet, fetchTweetsFromUser, fetchTwitterProfile } from "../../lib/twitter";


export const getUserDataStreamed = async (input: {
  githubName: string;
  twitterName: string;
  emit: (chunked: TweetCommitData) => void;
  onComplete: (chunked: TweetCommitData) => void;
}) => {
  const { githubName, twitterName } = input;
  const { heatmapData: githubData, metadata } = await fetchGithubPage(githubName);
  const twitterPage = await fetchTwitterProfile(twitterName);
  if (!twitterPage || !metadata) {
    throw new Error("Twitter page not found");
  }
  const tweetsStop = githubData[0]!.day;
  return fetchTweetsFromUser(twitterName, new Date(tweetsStop), (collection) => {
    input.emit(parseCollection(collection, githubData));
  }).then(async (data) => {
    const merged = parseCollection(data, githubData);
    input.onComplete(merged);
    const totalCommits = merged.reduce(
      (acc, data) => acc + data.commits,
      0,
    );
    const totalTweets = merged.reduce(
      (acc, data) => acc + data.tweets,
      0,
    );
    await db.insert(users).values({
      twitterDisplayName: twitterPage.name,
      twitterId: twitterPage.id_str,
      twitterFollowerCount: twitterPage.followers_count,
      githubFollowerCount: metadata.followers,
      commitsMade: totalCommits,
      githubName: githubName,
      twitterInGithubBio: metadata.twitter_username?.toLowerCase() === twitterName.toLowerCase(),
      twitterName: twitterName,
      tweetsSent: totalTweets,
      heatmapData: merged,
    }).onDuplicateKeyUpdate({
      set: {
        twitterDisplayName: twitterPage.name,
        twitterId: twitterPage.id_str,
        twitterFollowerCount: twitterPage.followers_count,
        githubFollowerCount: metadata.followers,
        commitsMade: totalCommits,
        githubName: githubName,
        twitterName: twitterName,
        twitterInGithubBio: metadata.twitter_username?.toLowerCase() === twitterName.toLowerCase(),
        tweetsSent: totalTweets,
        heatmapData: [],
      },

    })
  });
};

function parseCollection(
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
  const [gh, twitterProfile] = await Promise.all([
    fetchGithubPage(githubName),
    fetchTwitterProfile(twitterName),
  ]);
  const user = await db.select().from(users).where(
    and(
      eq(users.githubName, githubName),
      eq(users.twitterName, twitterName)
    )
  ).execute().then(x => x.at(0));
  return {
    ...gh,
    twitterProfile,
    data: user?.heatmapData,
  };
}

export type PageData = {
  isDataLoading: boolean;
  data: TweetCommitData;
};
