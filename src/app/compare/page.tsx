import { Metadata } from "next";
import { fetchGithubPage } from "../../server/lib/github";
import { Profile } from "./profile";
import { readFromCache } from "../../server/lib/cache";
import { PageData, getCachedUserData } from "../../server/api/routers/get-data";
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
    ? { github: props.searchParams.name, twitter: props.searchParams.name }
    : props.searchParams;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { github, twitter } = parse(props);
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

export default async function Page(props: Props) {
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
    />
  );
}
