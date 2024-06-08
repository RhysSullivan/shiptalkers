/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * v0 by Vercel.
 * @see https://v0.dev/t/0FjhmAlN5Xv
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import Link from "next/link";
import { Props, parse } from "../utils";
import { db } from "../../server/db";
import { HeatmaplessUser, users } from "../../server/db/schema";
import { eq, and, gt, sql, desc, asc, or, not } from "drizzle-orm";
import { GitTweetBars } from "../../components/ui/git-tweet-bars";
import { TwitterAvatar } from "../../components/ui/twitter-avatar";
import { cn } from "../../lib/utils";

function Bio(props: { user: HeatmaplessUser; direction: "left" | "right" }) {
  const { user, direction } = props;
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-2",
        direction === "left" ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "flex  gap-8",
          direction === "right" ? "flex-row" : "flex-row-reverse",
        )}
      >
        <TwitterAvatar user={user} className="size-20 md:size-32" />
        <div className="flex flex-col md:w-[300px]">
          <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {user.twitterDisplayName}
          </span>
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
            <span className="text-gray-600 dark:text-gray-400">
              {user.tweetsSent.toLocaleString()} tweets
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">
              {user.twitterFollowerCount.toLocaleString()} followers
            </span>
          </div>
        </div>
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

export default async function Component(props: Props) {
  const { github, twitter } = parse(props);
  const searchingUser = await db
    .select()
    .from(users)
    .where(and(eq(users.githubName, github), eq(users.twitterName, twitter)))
    .then((res) => res[0]);
  if (!searchingUser) {
    console.error("User not found");
    return null;
  }
  // get the inverse of the user's tweets and commits
  const foundUsers = (await db
    // @ts-expect-error idk drizzle
    .select({
      matchPercent: sql`100 - ((ABS(${users.tweetsSent} - ${searchingUser.commitsMade}) + ABS(${users.commitsMade} - ${searchingUser.tweetsSent})) / (${searchingUser.tweetsSent} + ${searchingUser.commitsMade})) * 100`,
      ...users,
    })
    .from(users)
    .where(
      and(
        or(users.twitterInGithubBio, eq(users.twitterName, users.githubName)),
        not(eq(users.githubName, github)),
      ),
    )
    .orderBy(
      sql`ABS(${users.tweetsSent} - ${searchingUser.commitsMade}) + ABS(${users.commitsMade} - ${searchingUser.tweetsSent})`,
    )
    .limit(10)) as (HeatmaplessUser & {
    matchPercent: string;
  })[];

  const foundUser = foundUsers[0];
  if (!foundUser) {
    console.error("No match found");
    return null;
  }
  console.log(typeof foundUser.matchPercent);

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-grow flex-col items-center ">
      <h1 className="max-w-2xl py-4 text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">
        The best cofounder for {searchingUser.twitterDisplayName} is...{" "}
      </h1>
      <div className="flex flex-row gap-8">
        <TwitterAvatar user={foundUser} className="size-32" />
        <div>
          <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {foundUser.twitterDisplayName}
          </span>
          <div className="flex flex-row items-end gap-8">
            <div className="flex flex-col items-start gap-2">
              <div className="flx flex-col items-start gap-2">
                <div className="flex items-center gap-2">
                  <TwitterIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <Link
                    href={`https://twitter.com/${foundUser.twitterName}`}
                    className="text-gray-600 hover:underline dark:text-gray-400"
                    target="_blank"
                    prefetch={false}
                  >
                    Twitter
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    {foundUser.twitterFollowerCount.toLocaleString()} followers
                  </span>
                </div>
              </div>
              <div className="flx flex-col items-start gap-2">
                <div className="flex items-center gap-2">
                  <GithubIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <Link
                    href={`https://github.com/${foundUser.githubName}`}
                    className="text-gray-600 hover:underline dark:text-gray-400"
                    target="_blank"
                    prefetch={false}
                  >
                    GitHub
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    {foundUser.twitterFollowerCount.toLocaleString()} followers
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-center justify-center gap-8 pt-16 md:grid-cols-3 md:gap-32">
        <Bio user={searchingUser} direction="right" />
        <span className="text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">
          It's a {parseFloat(Number(foundUser.matchPercent).toFixed(2))}% match!{" "}
        </span>
        <Bio user={foundUser} direction="left" />
      </div>
    </div>
  );
}

function CodeIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function GitCommitVerticalIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v6" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 15v6" />
    </svg>
  );
}

function GithubIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function TwitterIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}
