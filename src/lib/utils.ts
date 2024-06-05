import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { User } from "../server/db/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type HeatmapData = {
  day: string;
  value: number;
};

export function getRatioText(input: {
  tweets: number;
  commits: number;
  displayName: string;
}) {
  const { tweets, commits, displayName } = input;
  const percentageTweets = Math.abs((tweets / commits) * 100 - 100).toFixed();
  const percentageCommits = Math.abs((commits / tweets) * 100 - 100).toFixed();
  const txt =
    percentageCommits == percentageTweets
      ? `${displayName} spends equal time tweeting and coding`
      : tweets > commits
        ? `${displayName} spends ${percentageTweets}% more time tweeting than coding`
        : `${displayName} spends ${percentageCommits}% more time coding than tweeting`;
  return txt;
}

export function getPageUrl(input: {
  github: string;
  twitter: string;
}) {
  const lwrGh = input.github.toLowerCase();
  const lwrTw = input.twitter.toLowerCase();
  if (lwrGh === lwrTw) {
    return `/compare?name=${lwrGh}`
  }
  return `/compare?github=${lwrGh}&twitter=${lwrTw}`
}

// Verified users are users who have their Twitter handle in their GitHub bio, or have the same Twitter and GitHub handle
export function isVerifiedUser(user: User) {
  return user.twitterInGithubBio || user.twitterName === user.githubName;
}