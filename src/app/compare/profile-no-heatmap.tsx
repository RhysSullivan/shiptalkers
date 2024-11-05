"use client";
import {
  BadgeMinusIcon,
  GithubIcon,
  TwitterIcon,
  VerifiedIcon,
} from "lucide-react";
import { RatioPie } from "./pie";
import type { PageData } from "../../server/api/routers/get-data";
import {
  getMatchPageUrl,
  getPageUrl,
  getRatioText,
  isVerifiedUser,
} from "../../lib/utils";
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
import { LinkButton } from "../../components/ui/link-button";
import ShimmerButton from "../../components/ui/shimmer-button";

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
        </Link>
        ,{" "}
        <Link
          href="https://github.com/RhysSullivan/shiptalkers"
          target="_blank"
          className="text-blue-500 hover:underline"
        >
          star the project
        </Link>{" "}
        on GitHub, and{" "}
        <Link
          href="https://www.youtube.com/watch?v=ljMqoUGnskA"
          target="_blank"
          className="text-blue-500 hover:underline"
        >
          touch grass
        </Link>
      </span>
      <span>We're hitting rate limits so things may take a while</span>
      <span>
        If your profile does not look right, open an issue on{" "}
        <Link
          href="https://github.com/RhysSullivan/shiptalkers"
          target="_blank"
          className="text-blue-500 hover:underline"
        >
          GitHub
        </Link>
      </span>
    </div>
  );
}

export function Profile(props: {
  initialData: Omit<PageData, "twitterPage">;
  recentlyCompared: React.ReactNode;
  fetchTweets: boolean;
}) {
  const { initialData: pageData } = props;
  const {
    githubName,
    twitterName,
    commitsMade,
    githubFollowerCount,
    tweetsSent,
    twitterDisplayName,
    twitterFollowerCount,
  } = pageData.user;

  const totalCommits = commitsMade;
  const totalTweets = tweetsSent;

  const ogUrl = new URLSearchParams({
    github: githubName,
    displayName: twitterDisplayName,
    twitter: twitterName,
    commits: totalCommits.toString(),
    tweets: totalTweets.toString(),
  });
  if (pageData.user.twitterAvatarUrl) {
    ogUrl.set("avatar", pageData.user.twitterAvatarUrl);
  }
  if (pageData.user.updatedAt) {
    ogUrl.set("etag", pageData.user.updatedAt.getTime().toString());
  }
  const ogImageUrl = `/api/og/compare?${ogUrl.toString()}`;
  const pageUrl = `https://shiptalkers.dev${getPageUrl({
    github: githubName,
    twitter: twitterName,
  })}`;
  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-grow flex-col items-center  py-8">
      <div className="flex w-full flex-row items-center justify-between gap-4 md:mx-auto">
        <div className="flex flex-col items-start justify-start gap-2 px-2">
          <TwitterAvatar user={pageData.user} className="size-20 md:size-32" />
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
      <div className="flex w-full flex-row gap-2 py-4 text-start font-semibold">
        <a
          href="https://socialdata.tools/?ref=shiptalkers.dev"
          target="_blank"
          className="flex invisible flex-row gap-2 text-start"
        >
          Powered by <SocialData />
        </a>
      </div>

      <div className="py-4">
        <TweetBox
          github={githubName}
          twitter={twitterName}
          text={`${getRatioText({
            commits: totalCommits,
            displayName: `@${twitterName}`,
            tweets: totalTweets,
          })}\n\n${pageUrl}`}
          src={ogImageUrl}
        />
      </div>
      <div className="py-12">
        <ShimmerButton
          href={getMatchPageUrl({
            github: githubName,
            twitter: twitterName,
          })}
        >
          Find their cofounder
        </ShimmerButton>
      </div>
      {props.recentlyCompared}
    </div>
  );
}
