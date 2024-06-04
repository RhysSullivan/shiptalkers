import { Metadata } from "next";
import { Profile } from "./profile";
import { getCachedUserData } from "../../server/api/routers/get-data";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RecentlyComparedSection } from "../components.server";
import { cookies } from "next/headers";
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
  const { data, twitterProfile } = await getCachedUserData({
    githubName: github,
    twitterName: twitter,
  });

  const ogUrl = new URLSearchParams({
    github,
    displayName: twitterProfile?.name ?? twitter,
    twitter,
    twtrId: twitterProfile?.id_str ?? "",
    commits: (
      data?.reduce((acc, { commits }) => acc + commits, 0) ?? 0
    ).toString(),
    tweets: (
      data?.reduce((acc, { tweets }) => acc + tweets, 0) ?? 0
    ).toString(),
  });
  const ogImageUrl = `https://shiptalkers.dev/api/og/compare?${ogUrl.toString()}`;
  return {
    openGraph: {
      images: data ? [{ url: ogImageUrl }] : [],
    },
  };
}
export const revalidate = 60; // 1 minute

export default async function Page(props: Props) {
  if (!(cookies().get("token")?.value === "preview")) {
    return redirect("/not-ready");
  }
  const { github, twitter } = parse(props);
  const {
    metadata,
    data: cached,
    heatmapData,
    twitterProfile,
  } = await getCachedUserData({ githubName: github, twitterName: twitter });
  if (!metadata || !twitterProfile) return null;
  return (
    <Profile
      githubName={github}
      twitterName={twitter}
      twitterProfile={twitterProfile}
      metadata={metadata}
      ghHeatmap={heatmapData}
      initialData={
        cached && {
          data: cached,
          isDataLoading: false,
        }
      }
      recentlyCompared={
        <div>
          {new Date().toISOString()}
          <Suspense>
            <RecentlyComparedSection filterTwitterNames={[twitter]} />
          </Suspense>
        </div>
      }
    />
  );
}
