import { type Metadata } from "next";
import { Profile } from "./profile";
import {
  getCachedUserData,
  parseCollection,
  toUserSchema,
} from "../../server/api/routers/get-data";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BrowseSection } from "../components.server";
import { fetchGithubPage } from "../../server/lib/github";
import {
  getCachedTweets,
  getCachedTwitterProfile,
} from "../../server/lib/twitter";
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
export const revalidate = 60 * 60; // 1 hour

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { github, twitter } = parse(props);
  if (github == twitter && !("name" in props.searchParams)) {
    redirect(`/compare?name=${github}`);
  }
  const user = await getCachedUserData({
    githubName: github,
    twitterName: twitter,
  });

  if (!user) {
    return {};
  }

  const ogUrl = new URLSearchParams({
    github,
    displayName: user.twitterDisplayName,
    twitter,
    commits: user.commitsMade.toString(),
    tweets: user.tweetsSent.toString(),
  });
  const ogImageUrl = `https://shiptalkers.dev/api/og/compare?${ogUrl.toString()}`;
  return {
    openGraph: {
      images: [{ url: ogImageUrl }],
    },
  };
}

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
  const user = await getCachedUserData({
    githubName: github,
    twitterName: twitter,
  });
  if (user) {
    return (
      <Profile
        initialData={{ isDataLoading: false, user }}
        fetchTweets={process.env.NODE_ENV === "development" ? true : false}
        recentlyCompared={
          <Suspense>
            <BrowseSection filterTwitterNames={[twitter]} sort="recent" />
          </Suspense>
        }
      />
    );
  }
  try {
    const { heatmapData, metadata: githubMetadata } =
      await fetchGithubPage(github);
    if (!heatmapData || !githubMetadata) {
      return <div>GitHub profile not found</div>;
    }
    // some are partially loaded and we can hydrate with cached tweets for better UX
    const [cachedTweets, cachedProfile] = await Promise.all([
      getCachedTweets(twitter),
      getCachedTwitterProfile(twitter),
    ]);
    return (
      <Profile
        initialData={{
          isDataLoading: true,
          user: toUserSchema({
            githubName: github,
            merged: parseCollection(cachedTweets ?? [], heatmapData),
            metadata: githubMetadata,
            twitterPage: cachedProfile ?? {
              followers_count: 0,
              id_str: "0",
              name: twitter,
            },
            twitterName: twitter,
          }),
        }}
        fetchTweets={true}
        recentlyCompared={
          <Suspense>
            <BrowseSection filterTwitterNames={[twitter]} sort="recent" />
          </Suspense>
        }
      />
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
