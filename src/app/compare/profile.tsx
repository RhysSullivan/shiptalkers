"use client";
import { GithubIcon, TwitterIcon } from "lucide-react";
import { RatioBarChart } from "./bar-chart";
import { Heatmap } from "./heatmap";
import { RatioPie } from "./pie";
import { useState } from "react";
import type { PageData } from "../../server/api/routers/get-data";
import { api } from "../../trpc/react";
import { GithubMetadata } from "../../server/lib/github";
import { HeatmapData } from "../../lib/utils";
import { TwitterUser } from "../../server/lib/twitter.types";

function chunk<T>(array: T[], size: number): T[][] {
  return array.reduce((acc, _, i) => {
    if (i % size === 0) {
      acc.push(array.slice(i, i + size));
    }
    return acc;
  }, [] as T[][]);
}

export function Profile(props: {
  githubName: string;
  twitterName: string;
  metadata: GithubMetadata;
  ghHeatmap: HeatmapData[];
  initialData: PageData | null | undefined;
  twitterProfile: TwitterUser;
  recentlyCompared: React.ReactNode;
}) {
  const { githubName, twitterName, ghHeatmap, twitterProfile } = props;
  const [pageData, setPageData] = useState<PageData | null | undefined>(
    props.initialData,
  );
  api.post.data.useSubscription(
    { github: githubName, twitter: twitterName },
    {
      onData(data) {
        setPageData(data);
      },
      onError(err) {
        console.error(err);
      },
      enabled: !props.initialData,
    },
  );

  const { data, isDataLoading } = pageData ?? {
    data: ghHeatmap.map((x) => ({
      day: x.day,
      commits: x.value,
      tweets: 0,
    })),
    isDataLoading: true,
  };
  const chunked = chunk(data, 7);
  const totalCommits = chunked.reduce(
    (acc, data) => acc + data.reduce((acc, data) => acc + data.commits, 0),
    0,
  );
  const totalTweets = chunked.reduce(
    (acc, data) => acc + data.reduce((acc, data) => acc + data.tweets, 0),
    0,
  );

  const ogUrl = new URLSearchParams({
    github: githubName,
    displayName: twitterProfile.name ?? githubName,
    twtrId: twitterProfile.id_str,
    twitter: twitterName,
    commits: totalCommits.toString(),
    tweets: totalTweets.toString(),
  });
  const ogImageUrl = `/api/og/compare?${ogUrl.toString()}`;
  return (
    <div className="flex min-h-full min-w-full flex-grow flex-col items-center py-8">
      <div className="mx-auto flex w-[1200px] flex-row items-center justify-between gap-4">
        <div className="flex flex-row gap-2">
          <img
            src={`https://unavatar.io/twitter/${twitterName}`}
            width="128"
            height="128"
            alt="avatar"
            className="h-32 w-32 rounded-full"
          />
          <div className="flex flex-col justify-between gap-4 py-4">
            <div className="flex flex-col">
              <div className="flex flex-col">
                <div className="flex flex-row items-center gap-1">
                  <TwitterIcon size={20} />
                  <a
                    className="font-semibold hover:underline"
                    target="_blank"
                    href={`https://twitter.com/${twitterName}`}
                  >
                    {twitterName}
                  </a>
                </div>
                {`${twitterProfile.followers_count.toLocaleString()} followers`}
              </div>
              <div className="flex flex-col">
                <div className="flex flex-row items-center gap-1">
                  <GithubIcon size={20} />
                  <a
                    className="font-semibold hover:underline"
                    target="_blank"
                    href={`
                  https://github.com/${githubName}`}
                  >
                    {githubName}
                  </a>
                </div>
                {`${props.metadata.followers.toLocaleString()} followers`}
              </div>
            </div>
            <span>
              {totalCommits} commits and {totalTweets} tweets
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center">
          <RatioPie commits={totalCommits} tweets={totalTweets} />
        </div>
      </div>
      {isDataLoading &&
        (pageData ? (
          <div className="flex flex-row gap-4 text-center text-2xl font-bold">
            We're streaming in the data now
            {/* spinner */}
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="flex flex-row gap-4 text-center text-2xl font-bold">
            We're waiting for the data stream to start
            {/* spinner */}
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
          </div>
        ))}
      <div className="h-[170px] w-[1200px]">
        <Heatmap data={chunked} />
      </div>
      <div className="w-[1200px]">
        <RatioBarChart
          data={chunked.map((chunk) => ({
            day: `${chunk[0]!.day} - ${chunk.at(-1)!.day}`,
            tweets: chunk.reduce((acc, data) => acc + data.tweets, 0),
            commits: chunk.reduce((acc, data) => acc + data.commits, 0),
          }))}
        />
      </div>
      {!isDataLoading && (
        <>
          <div className="flex flex-col">
            <span>Tweet the result</span>
            <img
              src={ogImageUrl}
              alt="og"
              className="max-w-[600px] border-2"
              key={
                process.env.NODE_ENV === "development"
                  ? new Date().toISOString()
                  : undefined
              }
            />
          </div>
        </>
      )}
      {props.recentlyCompared}
    </div>
  );
}
