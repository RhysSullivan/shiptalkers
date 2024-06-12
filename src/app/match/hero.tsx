import { GithubIcon, TwitterIcon } from "lucide-react";
import { TwitterAvatar } from "../../components/ui/twitter-avatar";
import type { HeatmaplessUser } from "../../server/db/schema";
import type { MatchedUser } from "./utils";
import Link from "next/link";
import { cn, getCategory, getPageUrl } from "../../lib/utils";
import { GitTweetBars } from "../../components/ui/git-tweet-bars";
import { getMatchPercentRelative, getMatchPercentTotal } from "../utils";
import { Switch } from "../../components/ui/switch";
import { Label } from "../../components/ui/label";
import { ToggleRelative } from "./toggle-relative";

function Stats(props: { user: HeatmaplessUser; className?: string }) {
  const { user } = props;
  const tagline = getCategory({tweets: user.tweetsSent, commits: user.commitsMade, displayName: user.twitterDisplayName});
  return (
    <div className={cn("flex flex-col md:w-[300px]", props.className)}>
      <Link
        className="text-xl font-semibold text-gray-900 hover:underline dark:text-gray-100"
        href={getPageUrl({
          github: user.githubName,
          twitter: user.twitterName,
        })}
      >
        {user.twitterDisplayName}
      </Link>
      <span className={cn("font-serif text-sm text-blue-400")}>[{tagline}]</span>
      <div className="flex items-center gap-2">
        <TwitterIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        <Link
          href={`https://twitter.com/${user.twitterName}`}
          className="text-gray-600 hover:underline dark:text-gray-400"
          target="_blank"
          prefetch={false}
        >
          Twitter
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <GithubIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        <Link
          href={`https://github.com/${user.githubName}`}
          className="text-gray-600 hover:underline dark:text-gray-400"
          target="_blank"
          prefetch={false}
        >
          GitHub
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-600 dark:text-gray-400">
          {user.tweetsSent.toLocaleString()} tweets
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-600 dark:text-gray-400">
          {user.commitsMade.toLocaleString()} commits
        </span>
      </div>
    </div>
  );
}

function Bio(props: {
  user: HeatmaplessUser;
  direction: "left" | "right";
  otherUser: HeatmaplessUser;
  relative: boolean;
}) {
  const { user, direction, otherUser } = props;
  const total = user.tweetsSent + user.commitsMade;
  const percentTweets = (user.tweetsSent / total) * 100;
  const percentCommits = (user.commitsMade / total) * 100;
  const tagline = getCategory({
    tweets: user.tweetsSent,
    commits: user.commitsMade,
    displayName: user.twitterDisplayName,
  });
  return (
    <div
      className={cn(
        "flex w-full  items-center justify-between gap-4",
        direction === "left" ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div className="flex max-w-[300px]  flex-col">
        <div
          className={cn(
            "flex flex-row gap-8",
            direction === "left" ? "justify-end" : "justify-start",
          )}
        >
          {direction === "left" && <Stats user={user} className="items-end" />}
          <div className="shrink-0">
            <TwitterAvatar
              user={user}
              className="size-20 flex-shrink-0 md:size-32"
            />
          </div>
          {direction === "right" && <Stats user={user} />}
        </div>

        <span
          className={cn(
            " py-2  text-gray-600  ",
            direction === "right" ? "text-start" : "text-end",
          )}
        >
          {user.twitterDisplayName} spends {percentTweets.toFixed()}% of their
          time tweeting and {percentCommits.toFixed()}% of their time coding
        </span>
      </div>
      <div className="hidden  md:block">
        <GitTweetBars
          user={user}
          barHeight={300}
          iconSize={24}
          relative={props.relative}
          barWidth={20}
          otherUser={otherUser}
          smallestBarLast={direction === "right"}
        />
      </div>
      <div className=" md:hidden">
        <GitTweetBars
          user={user}
          otherUser={otherUser}
          relative={props.relative}
          barHeight={100}
          iconSize={24}
          barWidth={20}
          smallestBarLast={direction === "right"}
        />
      </div>
    </div>
  );
}

function CompatibilityText(props: {
  leftUser: HeatmaplessUser;
  matchedUser: HeatmaplessUser;
}) {
  return "";
}

export function MatchCard(props: {
  leftUser: HeatmaplessUser;
  matchedUser: HeatmaplessUser;
  relative: boolean;
}) {
  const { leftUser, matchedUser } = props;
  const matchPercent = props.relative
    ? getMatchPercentRelative(leftUser, matchedUser).toString()
    : getMatchPercentTotal(leftUser, matchedUser).toString();
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 items-center justify-center  gap-8 pt-16 xl:grid-cols-3">
        <Bio
          user={leftUser}
          direction="right"
          otherUser={matchedUser}
          relative={props.relative}
        />
        <div className="flex  flex-col items-center gap-4 px-4">
          <div className="max-w-[300px] text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {leftUser.twitterDisplayName} and {matchedUser.twitterDisplayName}{" "}
            are {parseFloat(Number(matchPercent).toFixed())}% compatible as
            cofounders
          </div>
          <CompatibilityText leftUser={leftUser} matchedUser={matchedUser} />
        </div>
        <Bio
          user={matchedUser}
          direction="left"
          otherUser={leftUser}
          relative={props.relative}
        />
      </div>
      <ToggleRelative relative={props.relative} />
    </div>
  );
}

export function BestMatch(props: { matchedUser: HeatmaplessUser }) {
  const { matchedUser } = props;
  return (
    <>
      <div className="flex flex-row justify-end gap-8">
        <TwitterAvatar user={matchedUser} className="size-32 shrink-0" />
        <div>
          <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {matchedUser.twitterDisplayName}
          </span>
          <div className="flex flex-row items-end gap-8">
            <div className="flex flex-col items-start gap-2">
              <div className="flx flex-col items-start gap-2">
                <div className="flex items-center gap-2">
                  <TwitterIcon className="h-5 w-5 shrink-0 text-gray-600 dark:text-gray-400" />
                  <Link
                    href={`https://twitter.com/${matchedUser.twitterName}`}
                    className="text-gray-600 hover:underline dark:text-gray-400"
                    target="_blank"
                    prefetch={false}
                  >
                    Twitter
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    {matchedUser.twitterFollowerCount.toLocaleString()}{" "}
                    followers
                  </span>
                </div>
              </div>
              <div className="flx flex-col items-start gap-2">
                <div className="flex items-center gap-2">
                  <GithubIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <Link
                    href={`https://github.com/${matchedUser.githubName}`}
                    className="text-gray-600 hover:underline dark:text-gray-400"
                    target="_blank"
                    prefetch={false}
                  >
                    GitHub
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    {matchedUser.githubFollowerCount.toLocaleString()} followers
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
