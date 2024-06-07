import { type Metadata } from "next";
import { Profile } from "./profile-no-heatmap";
import {
  getCachedUserData,
  toUserSchema,
} from "../../server/api/routers/get-data";
import { Suspense } from "react";
import { BrowseSection } from "../components.server";
import { fetchGithubPage } from "../../server/lib/github";
import { fetchTwitterProfile } from "../../server/lib/twitter";
import { db } from "../../server/db";
import { users } from "../../server/db/schema";

type Props = {
  searchParams:
    | {
        github: string;
        twitter: string;
      }
    | {
        name: string;
      };
};

function parse(props: Props) {
  return "name" in props.searchParams
    ? {
        github: props.searchParams.name.toLowerCase(),
        twitter: props.searchParams.name.toLowerCase(),
      }
    : {
        github: props.searchParams.github.toLowerCase(),
        twitter: props.searchParams.twitter.toLowerCase(),
      };
}

async function getPageDataInternal(props: Props) {
  const { github, twitter } = parse(props);
  const user = await getCachedUserData({
    githubName: github,
    twitterName: twitter,
  });
  if (user) {
    return {
      status: "cached",
      user,
    } as const;
  }
  const [{ totalContributions, metadata: githubMetadata }, twitterProfile] =
    await Promise.all([fetchGithubPage(github), fetchTwitterProfile(twitter)]);
  if (!githubMetadata) {
    return {
      status: `GitHub profile not found. Go to https://github.com/${github} to make sure it exists and is set to public`,
    } as const;
  }
  if (totalContributions === undefined) {
    return {
      status: `GitHub contributions not found. Go to https://github.com/${github} to make sure it exists and is set to public`,
    } as const;
  }
  if (!twitterProfile) {
    return {
      status: `Twitter profile not found. Go to https://twitter.com/${twitter} to make sure it exists`,
    } as const;
  }
  const asUser = toUserSchema({
    githubName: github,
    twitterName: twitter,
    merged: null,
    metadata: githubMetadata,
    totalTweets: twitterProfile.statuses_count,
    totalCommits: totalContributions ?? 0,
    twitterPage: twitterProfile,
  });
  return {
    status: "fetched",
    user: asUser,
  } as const;
}

// unstable cache and react cache don't seem to deduplicate properly
import Dataloader from "dataloader";
import { revalidatePath } from "next/cache";
import { getPageUrl } from "../../lib/utils";
const dataloader = new Dataloader(
  // @ts-expect-error - this is a hack to make the types work
  async (props: Props[]) => {
    return Promise.all(props.map(getPageDataInternal));
  },
  { cacheKeyFn: (props) => JSON.stringify(props) },
);

export async function generateMetadata(props: Props): Promise<Metadata> {
  let github: string;
  let twitter: string;
  try {
    const d = parse(props);
    github = d.github;
    twitter = d.twitter;
  } catch (error) {
    return {};
  }
  const user = await getCachedUserData({
    githubName: github,
    twitterName: twitter,
  });
  if (!user) {
    return {};
  }

  const ogUrl = new URLSearchParams({
    github: user.githubName,
    displayName: user.twitterDisplayName,
    twitter: user.twitterName,
    commits: user.commitsMade.toString(),
    tweets: user.tweetsSent.toString(),
  });
  if (user.twitterAvatarUrl) {
    ogUrl.set("avatar", user.twitterAvatarUrl);
  }
  const ogImageUrl = `https://shiptalkers.dev/api/og/compare?${ogUrl.toString()}`;
  return {
    openGraph: {
      images: [{ url: ogImageUrl }],
      title: `${user.twitterDisplayName} Tweets VS Commits - Shiptalkers.dev`,
      description: `${user.twitterDisplayName} has made ${user.commitsMade} commits and sent ${user.tweetsSent} tweets`,
    },
  };
}
export const maxDuration = 60;
export default async function Page(props: Props) {
  let github: string;
  let twitter: string;
  try {
    const p = parse(props);
    github = p.github;
    twitter = p.twitter;
  } catch (error) {
    return <div>Invalid URL {JSON.stringify(props.searchParams)}</div>;
  }

  try {
    const { user, status } = await dataloader.load(props);
    if (status !== "fetched" && status !== "cached") {
      return <div>{status}</div>;
    }
    if (status === "fetched") {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { createdAt, updatedAt, ...rest } = user;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { heatmapData, ...restForLogging } = rest;
      console.log("Writing to db", restForLogging);
      await db.insert(users).values(rest).onDuplicateKeyUpdate({
        set: restForLogging,
      });
      revalidatePath(
        getPageUrl({ github: user.githubName, twitter: user.twitterName }),
      );
    }
    return (
      <>
        <Profile
          initialData={{
            isDataLoading: false,
            user: user,
          }}
          fetchTweets={false}
          recentlyCompared={
            <Suspense>
              <BrowseSection filterTwitterNames={[twitter]} sort="recent" />
            </Suspense>
          }
        />
      </>
    );
  } catch (error) {
    console.error(`failed to load github for ${github}`, error);
    return (
      <div>
        GitHub profile not found. if {"you're"} really sure it's correct, try
        refreshing the page in like {(Math.random() * 120).toFixed()}seconds
      </div>
    );
  }
}
