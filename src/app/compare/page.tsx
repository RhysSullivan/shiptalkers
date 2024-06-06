import { Metadata } from "next";
import { Profile } from "./profile";
import {
  getCachedUserData,
  toUserSchema,
} from "../../server/api/routers/get-data";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BrowseSection } from "../components.server";
import { cookies } from "next/headers";
import { fetchGithubPage } from "../../server/lib/github";
import { fetchTwitterProfile } from "../../server/lib/twitter";
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
export const revalidate = 60; // 1 minute

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
        fetchTweets={false}
        recentlyCompared={
          <Suspense>
            <BrowseSection filterTwitterNames={[twitter]} sort="recent" />
          </Suspense>
        }
      />
    );
  }
  try {
    await fetchGithubPage(github);
  } catch (error) {
    return <div>GitHub profile not found</div>;
  }
  try {
    await fetchTwitterProfile(twitter);
  } catch (error) {
    return <div>Twitter profile not found</div>;
  }
  const [{ heatmapData, metadata: githubMetadata }, twitterProfile] =
    await Promise.all([fetchGithubPage(github), fetchTwitterProfile(twitter)]);
  if (!twitterProfile) {
    return <div>Twitter profile not found</div>;
  }
  if (!githubMetadata) {
    return <div>GitHub profile not found</div>;
  }
  return (
    <Profile
      initialData={{
        isDataLoading: true,
        user: toUserSchema({
          githubName: github,
          merged: heatmapData.map((x) => ({
            day: x.day,
            commits: x.value,
            tweets: 0,
          })),
          metadata: githubMetadata,
          twitterPage: twitterProfile,
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
}
