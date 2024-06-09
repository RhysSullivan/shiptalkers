import { GithubIcon, TwitterIcon } from "lucide-react";
import { TwitterAvatar } from "../../components/ui/twitter-avatar";
import type { HeatmaplessUser } from "../../server/db/schema";
import type { MatchedUser } from "./utils";
import Link from "next/link";
import { cn, getPageUrl } from "../../lib/utils";
import { GitTweetBars } from "../../components/ui/git-tweet-bars";

function Stats(props: { user: HeatmaplessUser; className?: string }) {
  const { user } = props;
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

function Bio(props: { user: HeatmaplessUser; direction: "left" | "right" }) {
  const { user, direction } = props;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4",
        direction === "left" ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div className={cn("flex flex-row gap-8")}>
        {direction === "left" && <Stats user={user} className="items-end" />}
        <div className="shrink-0">
          <TwitterAvatar
            user={user}
            className="size-20 flex-shrink-0 md:size-32"
          />
        </div>
        {direction === "right" && <Stats user={user} />}
      </div>
      <div className="hidden md:block">
        <GitTweetBars
          user={user}
          barHeight={300}
          iconSize={24}
          barWidth={20}
          smallestBarLast={direction === "right"}
        />
      </div>
      <div className="md:hidden">
        <GitTweetBars
          user={user}
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
  matchedUser: MatchedUser;
}) {
  const { leftUser, matchedUser } = props;
  const totalTweets = leftUser.tweetsSent + matchedUser.tweetsSent;
  const totalCommits = leftUser.commitsMade + matchedUser.commitsMade;
  const total = totalTweets + totalCommits;
  const percentTweets = (totalTweets / total) * 100;
  const percentCommits = (totalCommits / total) * 100;
  const isSignificantlyDifferent =
    Math.abs(percentTweets - percentCommits) > 20;
  let text: string;
  if (!isSignificantlyDifferent) {
    const tweeter =
      leftUser.tweetsSent > matchedUser.tweetsSent ? leftUser : matchedUser;
    const committer =
      leftUser.commitsMade > matchedUser.commitsMade ? leftUser : matchedUser;
    text = `${committer.twitterDisplayName} is building it and ${tweeter.twitterDisplayName} is promoting it`;
  } else if (percentTweets > percentCommits) {
    text = `Together they would spend ${percentTweets.toFixed(
      2,
    )}% of their time tweeting and ${percentCommits.toFixed(
      2,
    )}% of their time coding, everyone would know about their product but it would never be shipped`;
  } else {
    text = `Together they would spend ${percentTweets.toFixed(
      2,
    )}% of their time tweeting and ${percentCommits.toFixed(
      2,
    )}% of their time coding, they would build the best product ever, that no one knows about`;
  }
  return (
    <span className="text-center  text-gray-600 dark:text-gray-400">
      {text}
    </span>
  );
}

export function MatchCard(props: {
  leftUser: HeatmaplessUser;
  matchedUser: MatchedUser;
}) {
  const { leftUser, matchedUser } = props;

  return (
    <div className="grid grid-cols-1 items-center justify-center gap-8 pt-16 md:grid-cols-3 md:gap-32">
      <Bio user={leftUser} direction="right" />
      <div className="flex flex-col items-center gap-4">
        <span className="text-center  text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {leftUser.twitterDisplayName} and {matchedUser.twitterDisplayName} are
          {Number(matchedUser.matchPercent) < 80 ? " only " : " "}
          {parseFloat(Number(matchedUser.matchPercent).toFixed(2))}% compatible
          to build a product together
        </span>
        <CompatibilityText leftUser={leftUser} matchedUser={matchedUser} />
      </div>
      <Bio user={matchedUser} direction="left" />
    </div>
  );
}

export function Hero(props: {
  leftUser: HeatmaplessUser;
  matchedUser: MatchedUser;
}) {
  const { leftUser, matchedUser } = props;
  return (
    <>
      <div className="flex flex-row gap-8">
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
      <MatchCard leftUser={leftUser} matchedUser={matchedUser} />
    </>
  );
}
