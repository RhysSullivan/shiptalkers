"use client";
import {
  BadgeMinusIcon,
  GithubIcon,
  TwitterIcon,
  VerifiedIcon,
} from "lucide-react";
import { RatioBarChart } from "./bar-chart";
import { Heatmap } from "./heatmap";
import { RatioPie } from "./pie";
import { useState } from "react";
import type { PageData } from "../../server/api/routers/get-data";
import { api } from "../../trpc/react";
import { getPageUrl, getRatioText, isVerifiedUser } from "../../lib/utils";
import { SocialData } from "../../components/ui/socialdata";
import { TwitterAvatar } from "../../components/ui/twitter-avatar";
import { TweetBox } from "../../components/ui/tweet-box";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import Link from "next/link";

function chunk<T>(array: T[], size: number): T[][] {
  return array.reduce((acc, _, i) => {
    if (i % size === 0) {
      acc.push(array.slice(i, i + size));
    }
    return acc;
  }, [] as T[][]);
}

function StreamingCTAs() {
  return (
    <div className="flex w-full flex-col justify-start py-2">
      <div className="flex flex-row gap-4 text-center text-xl  font-semibold">
        We're streaming in the data now
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
      </div>
      <span>
        While you wait you can{" "}
        <Link
          href="https://twitter.com/intent/follow?screen_name=RhysSullivan"
          className="text-blue-500 hover:underline"
          target="_blank"
        >
          follow me on Twitter
        </Link>{" "}
        and{" "}
        <Link
          href="https://github.com/RhysSullivan/shiptalkers"
          target="_blank"
          className="text-blue-500 hover:underline"
        >
          star the project
        </Link>{" "}
        on GitHub
      </span>
    </div>
  );
}

export function Profile(props: {
  initialData: PageData;
  recentlyCompared: React.ReactNode;
  fetchTweets: boolean;
}) {
  const [pageData, setPageData] = useState<PageData>(props.initialData);
  const {
    githubName,
    twitterName,
    commitsMade,
    githubFollowerCount,
    heatmapData,
    tweetsSent,
    twitterDisplayName,
    twitterId,
    twitterFollowerCount,
  } = pageData.user;

  api.post.data.useSubscription(
    { github: githubName, twitter: twitterName },
    {
      onData(data) {
        setPageData(data);
      },
      onError(err) {
        console.error(err);
      },
      enabled: props.fetchTweets,
    },
  );

  const isDataLoading = pageData?.isDataLoading ?? true;

  const chunked = chunk(heatmapData, 7);
  const totalCommits = commitsMade;
  const totalTweets = tweetsSent;

  const ogUrl = new URLSearchParams({
    github: githubName,
    displayName: twitterDisplayName,
    twtrId: twitterId,
    twitter: twitterName,
    commits: totalCommits.toString(),
    tweets: totalTweets.toString(),
  });
  const ogImageUrl = `/api/og/compare?${ogUrl.toString()}`;
  const pageUrl = `https://shiptalkers.dev${getPageUrl({
    github: githubName,
    twitter: twitterName,
  })}`;
  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-grow flex-col items-center justify-center py-8">
      <div className="flex w-full flex-row items-center justify-between gap-4 md:mx-auto">
        <div className="flex flex-col items-start justify-start gap-2 px-2">
          <TwitterAvatar name={twitterName} className="size-20 md:size-32" />
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
                {`${twitterFollowerCount.toLocaleString()} followers`}
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
                {`${githubFollowerCount.toLocaleString()} followers`}
              </div>

              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger className="flex flex-row items-center gap-1">
                    {isVerifiedUser(pageData.user) ? (
                      <>
                        <VerifiedIcon size={20} /> Verified
                      </>
                    ) : (
                      <>
                        <BadgeMinusIcon size={20} /> Not Verified
                      </>
                    )}
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[260px]">
                    Verified users have their Twitter in their GitHub bio, or
                    have the same handle on both platforms.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start justify-start gap-2 px-2">
          <div className="size-22 md:size-32">
            <RatioPie commits={totalCommits} tweets={totalTweets} />
          </div>
          <div className="flex flex-col justify-between gap-4 py-4">
            <div className="flex flex-col">
              <div className="flex flex-row items-center gap-1">
                <TwitterIcon size={20} />
                {`${totalTweets.toLocaleString()} tweets`}
              </div>

              <div className="flex flex-row items-center gap-1">
                <GithubIcon size={20} />
                {`${totalCommits.toLocaleString()} commits`}
              </div>
            </div>
          </div>
        </div>
      </div>
      {isDataLoading && <StreamingCTAs />}
      <div className="mx-auto flex w-full max-w-[90vw] justify-start overflow-x-auto xl:justify-center">
        <Heatmap data={chunked} />
      </div>
      <a
        className="flex w-full flex-row gap-2 py-4 text-start font-semibold"
        target="_blank"
        href="https://socialdata.tools/?ref=shiptalkers.dev"
      >
        Powered by <SocialData />
      </a>
      <div className="max-w-[90vw] overflow-x-auto">
        <div className="w-[1280px]">
          <RatioBarChart
            data={chunked.map((chunk) => ({
              day: `${chunk[0]!.day} - ${chunk.at(-1)!.day}`,
              tweets: chunk.reduce((acc, data) => acc + data.tweets, 0),
              commits: chunk.reduce((acc, data) => acc + data.commits, 0),
            }))}
          />
        </div>
      </div>
      {!isDataLoading && (
        <div className="py-4">
          <TweetBox
            text={`${getRatioText({
              commits: totalCommits,
              displayName: `@${twitterName}`,
              tweets: totalTweets,
            })}\n\n${pageUrl}`}
            src={
              isDataLoading
                ? "https://generated.vusercontent.net/placeholder.svg"
                : ogImageUrl
            }
          />
        </div>
      )}
      {props.recentlyCompared}
    </div>
  );
}
