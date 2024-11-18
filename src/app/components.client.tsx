"use client";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Github, LoaderIcon, Twitter } from "lucide-react";
import type { HeatmaplessUser, User } from "../server/db/schema";

import { useQuery } from "@tanstack/react-query";
import { type ChangeEvent, useEffect, useState } from "react";
import { type GithubMetadata } from "../server/lib/github";
import { GitTweetBars } from "../components/ui/git-tweet-bars";
import { TwitterAvatar } from "../components/ui/twitter-avatar";
import { getMatchPageUrl, getPageUrl } from "../lib/utils";
import { getMatchPercentRelative, getMatchPercentTotal } from "./utils";
import { getUserTagline } from "../lib/utils";
import Tag from "../components/custom/Tag";

// Debounce function
// eslint-disable-next-line @typescript-eslint/ban-types
const debounce = (func: Function, delay: number) => {
  let debounceTimer: NodeJS.Timeout;
  return function (...args: unknown[]) {
    // @ts-expect-error asd
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-this-alias
    const context = this;
    clearTimeout(debounceTimer);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    debounceTimer = setTimeout(() => func.apply(context, args), delay);
  };
};

const fetchGitHubProfile = async (
  username: string,
): Promise<GithubMetadata> => {
  if (username.trim() === "") {
    throw new Error("No username provided");
  }
  const response = await fetch(`https://api.github.com/users/${username}`);
  if (!response.ok) {
    throw new Error("Profile not found");
  }
  return response.json() as Promise<GithubMetadata>;
};

export function CompareInput(props: {
  defaultTwitter?: string;
  defaultGithub?: string;
}) {
  const router = useRouter();
  const [githubUrl, setGithubUrl] = useState<string>(props.defaultGithub ?? "");
  const [twitterUrl, setTwitterUrl] = useState<string | null>(null);
  const [debouncedGithubUrl, setDebouncedGithubUrl] =
    useState<string>(githubUrl);

  const {
    data: profileData,
    error,
    isFetching,
    refetch,
  } = useQuery(
    ["githubProfile", debouncedGithubUrl],
    () => fetchGitHubProfile(debouncedGithubUrl),
    {
      enabled: false, // Disable automatic fetching
    },
  );
  console.log(isFetching);
  const debouncedFetch = debounce(() => {
    setDebouncedGithubUrl(githubUrl);
  }, 500);

  useEffect(() => {
    debouncedFetch();
  }, [githubUrl, debouncedFetch]);

  useEffect(() => {
    if (debouncedGithubUrl.trim() !== "") {
      void refetch();
    }
  }, [debouncedGithubUrl, refetch]);
  console.log(profileData);
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setGithubUrl(e.target.value);
  };
  return (
    <form
      className="flex w-full max-w-2xl flex-col items-center justify-center space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        // @ts-expect-error asd
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const githubUrl = e.target[0].value as string;
        // @ts-expect-error asd
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const twitterUrl = e.target[1].value as string;
        // just get the names of both
        const githubName = githubUrl.split("/").pop()!.trim();
        const twitterName = twitterUrl.split("/").pop()!.trim();
        if (!githubName || !twitterName) return;
        void router.push(
          getPageUrl({ github: githubName, twitter: twitterName }),
        );
      }}
    >
      <div className="flex w-full max-w-sm items-center gap-x-2">
        <Github size={24} />
        <Input
          className="w-full min-w-[300px] rounded-lg bg-white/70 backdrop-blur-sm backdrop-saturate-200"
          required
          name="github-url"
          placeholder="GitHub Profile Name"
          value={githubUrl}
          onChange={handleInputChange}
        />
      </div>
      <div className="flex w-full max-w-sm flex-col items-center space-x-2">
        <div className="flex w-full max-w-sm items-center gap-x-2">
          <Twitter size={24} />
          <Input
            className="w-full min-w-[300px] rounded-lg bg-white/70 backdrop-blur-sm backdrop-saturate-200"
            name="twitter-url"
            required
            defaultValue={
              props.defaultTwitter ?? profileData?.twitter_username ?? ""
            }
            placeholder="Twitter Profile Name"
          />
          {/* spinner if loading, slow speed */}
          {isFetching && (
            <LoaderIcon size={24} className="spin-slow animate-spin" />
          )}
        </div>
        <div className="h-[15px] w-full">
          {profileData?.twitter_username && (
            <span className="mx-auto w-full text-sm text-gray-500">
              *Autofilled with twitter from GitHub bio
            </span>
          )}
        </div>
      </div>
      <Button
        className="mt-4 rounded-lg hover:bg-neutral-700 active:translate-y-0.5 active:bg-neutral-500"
        type="submit"
      >
        Submit
      </Button>
    </form>
  );
}

export function ComparisonCard(props: { user: HeatmaplessUser }) {
  const { user } = props;
  const tagLine = getUserTagline({
    tweets: user.tweetsSent,
    commits: user.commitsMade,
    displayName: user.twitterDisplayName,
    twitterFollowerCount: user.twitterFollowerCount,
  });
  return (
    <a
      className="flex flex-row items-center justify-between rounded-md border-2 bg-white p-4 drop-shadow-sm transition-all hover:scale-105 hover:border-blue-500 hover:shadow-lg"
      href={getPageUrl({
        github: user.githubName,
        twitter: user.twitterName,
      })}
    >
      <div className="flex flex-row items-start justify-center gap-4">
        <TwitterAvatar user={user} className="size-24 min-w-24" />
        <div className="flex h-full flex-col justify-start gap-2 text-start">
          <h3 className="line-clamp-2 flex h-full max-w-56 items-center gap-2  text-lg font-bold leading-5">
            {user.twitterDisplayName}
          </h3>
          <Tag tagline={tagLine} />
          <div className="flex flex-row items-end justify-between gap-4">
            <div className="flex h-full flex-col items-start justify-start text-start">
              <span className="text-sm text-gray-500">@{user.twitterName}</span>
              <span className="text-sm text-gray-500">
                {user.twitterFollowerCount.toLocaleString()} followers
              </span>
              <span className="text-sm text-gray-500">
                {user.tweetsSent.toLocaleString()} tweets
              </span>
              <span className="text-sm text-gray-500">
                {user.commitsMade.toLocaleString()} commits
              </span>
            </div>
            <div className="-mb-4 flex h-full flex-col items-center justify-end pl-4">
              <GitTweetBars
                user={user}
                barHeight={60}
                iconSize={24}
                barWidth={20}
              />
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}

export function ViewAnotherMatchCardSuggestion(props: {
  rootUser: HeatmaplessUser;
  suggestedUser: HeatmaplessUser;
  relative: boolean;
}) {
  const { suggestedUser, rootUser } = props;
  const tagline = getUserTagline({
    tweets: suggestedUser.tweetsSent,
    commits: suggestedUser.commitsMade,
    displayName: suggestedUser.twitterDisplayName,
    twitterFollowerCount: suggestedUser.twitterFollowerCount,
  });
  return (
    <a
      className="flex flex-row items-center justify-between rounded-md border-2  p-4 drop-shadow-sm transition-all hover:scale-105 hover:border-blue-500 hover:shadow-lg"
      href={getMatchPageUrl({
        toGithub: suggestedUser.githubName,
        toTwitter: suggestedUser.twitterName,
        github: rootUser.githubName,
        twitter: rootUser.twitterName,
        relative: props.relative,
      })}
    >
      <div className="flex flex-row items-center justify-center gap-4">
        <TwitterAvatar user={suggestedUser} className="size-24 min-w-24" />
        <div className="flex h-full flex-col justify-start gap-2 text-start">
          <h3 className="line-clamp-2 flex h-full max-w-56 flex-col gap-1 text-wrap text-lg font-bold leading-5">
            {suggestedUser.twitterDisplayName}
            <Tag tagline={tagline} />
          </h3>
          <div className="flex flex-row items-end justify-between gap-4">
            <div className="flex h-full flex-col items-start justify-start text-start">
              <span className="text-sm text-gray-500">
                @{suggestedUser.twitterName}
              </span>
              <span className="text-sm text-gray-500">
                {suggestedUser.twitterFollowerCount.toLocaleString()} followers
              </span>
              <span className="text-sm text-gray-500">
                {suggestedUser.tweetsSent.toLocaleString()} tweets
              </span>
              <span className="text-sm text-gray-500">
                {suggestedUser.commitsMade.toLocaleString()} commits
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex h-full flex-col items-center justify-center text-lg font-semibold">
        {props.relative
          ? getMatchPercentRelative(
              props.rootUser,
              props.suggestedUser,
            ).toString()
          : getMatchPercentTotal(
              props.rootUser,
              props.suggestedUser,
            ).toString()}
        % match
      </div>
    </a>
  );
}

// if we're on /match, return to /match
// otherwise, return to /
export function DynamicHomeUrl() {
  const pathname = usePathname();

  return (
    <a href={pathname.includes("/match?") ? "/match" : "/"}>
      <h1 className="text-2xl font-bold">Shiptalkers</h1>
    </a>
  );
}
