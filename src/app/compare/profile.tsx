"use client";
import { GithubIcon, TwitterIcon } from "lucide-react";
import { RatioBarChart } from "./bar-chart";
import { Heatmap } from "./heatmap";
import { RatioPie } from "./pie";
import { useState } from "react";
import type { PageData } from "../../server/api/routers/get-data";
import { api } from "../../trpc/react";

function chunk<T>(array: T[], size: number): T[][] {
  return array.reduce((acc, _, i) => {
    if (i % size === 0) {
      acc.push(array.slice(i, i + size));
    }
    return acc;
  }, [] as T[][]);
}

export function Profile(props: { githubName: string; twitterName: string }) {
  const { githubName, twitterName } = props;
  const [pageData, setPageData] = useState<PageData | null>(null);
  api.post.data.useSubscription(
    { github: githubName, twitter: twitterName },
    {
      onData(data) {
        setPageData(data);
      },
      onError(err) {
        console.error(err);
      },
    },
  );

  if (!pageData) {
    return;
  }
  const { data, isDataLoading } = pageData;
  const chunked = chunk(data, 7);
  const totalCommits = chunked.reduce(
    (acc, data) => acc + data.reduce((acc, data) => acc + data.commits, 0),
    0,
  );
  const totalTweets = chunked.reduce(
    (acc, data) => acc + data.reduce((acc, data) => acc + data.tweets, 0),
    0,
  );

  return (
    <div className="flex min-h-full min-w-full flex-grow flex-col items-center py-8">
      <div className="mx-auto flex w-[1200px] flex-row items-center justify-between gap-4">
        <div className="flex flex-row gap-2">
          <img
            src={`https://github.com/${githubName}.png`}
            alt="avatar"
            className="h-32 w-32 rounded-full"
          />
          <div className="flex flex-col justify-between gap-2 py-4">
            <div className="flex flex-col">
              <a
                href={`https://twitter.com/${twitterName}`}
                className="flex flex-row items-center gap-1 hover:underline"
                target="_blank"
              >
                <TwitterIcon size={20} />
                {twitterName}
              </a>
              <a
                target="_blank"
                href={`
              https://github.com/${githubName}
              `}
                className="flex flex-row items-center gap-1 hover:underline"
              >
                <GithubIcon size={20} />
                {githubName}
              </a>
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
      {isDataLoading && (
        <div className="flex flex-row gap-4 text-center text-2xl font-bold">
          We're loading in the data, this may take some time
          {/* spinner */}
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
        </div>
      )}
      <div className="h-[170px] w-[1200px]">
        <Heatmap data={chunked} />
      </div>
      <div className="h-[170px] w-[1200px]">
        <RatioBarChart
          data={chunked.map((chunk) => ({
            day: `${chunk[0]!.day} - ${chunk.at(-1)!.day}`,
            tweets: chunk.reduce((acc, data) => acc + data.tweets, 0),
            commits: chunk.reduce((acc, data) => acc + data.commits, 0),
          }))}
        />
      </div>
    </div>
  );
}
