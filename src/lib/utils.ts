import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { type User } from "../server/db/schema";

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

  // edge cases
  if (tweets === 0 && commits === 0) {
    return `${displayName} is a mysterious creature`;
  }
  if (tweets === 0) {
    return `${displayName} is locked into coding`;
  }
  if (commits === 0) {
    return `${displayName} is a Twitter addict`;
  }
  if (tweets === commits) {
    return `${displayName}'s life is perfectly balanced, as all things should be`;
  }

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

export function getMatchPageUrl(input: {
  github: string;
  twitter: string;
  toGithub: string;
  toTwitter: string;
}) {
  const lwrGh = input.github.toLowerCase();
  const lwrTw = input.twitter.toLowerCase();
  const lwrToGh = input.toGithub.toLowerCase();
  const lwrToTw = input.toTwitter.toLowerCase();
  return `/match?github=${lwrToGh}&twitter=${lwrToTw}&toGithub=${lwrGh}&toTwitter=${lwrTw}`
}

// Verified users are users who have their Twitter handle in their GitHub bio, or have the same Twitter and GitHub handle
export function isVerifiedUser(user: Pick<User, "twitterInGithubBio" | "twitterName" | "githubName">): boolean {
  return user.twitterInGithubBio || user.twitterName === user.githubName;
}
