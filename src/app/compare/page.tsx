import { Metadata } from "next";
import { fetchGithubPage } from "../../server/lib/github";
import { Profile } from "./profile";
import { readFromCache } from "../../server/lib/cache";
import { PageData } from "../../server/api/routers/get-data";
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
  const cached = await readFromCache<PageData>(`${twitter}-tweets`);
  const ogUrl = new URLSearchParams({
    github,
    displayName: github,
    twitter,
    commits: (
      cached?.data?.reduce((acc, { commits }) => acc + commits, 0) ?? 0
    ).toString(),
    tweets: (
      cached?.data?.reduce((acc, { tweets }) => acc + tweets, 0) ?? 0
    ).toString(),
  });
  const ogImageUrl = `https://shiptalkers.dev/api/og/compare?${ogUrl.toString()}`;
  return {
    openGraph: {
      images: cached ? [{ url: ogImageUrl }] : [],
    },
  };
}

export default async function Page(props: Props) {
  const { github, twitter } = parse(props);
  const placeholder = await fetchGithubPage(github);

  return <Profile githubName={github} twitterName={twitter} />;
}
