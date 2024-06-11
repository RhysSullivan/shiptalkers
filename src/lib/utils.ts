import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { HeatmaplessUser, type User } from "../server/db/schema";

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
  toGithub?: string;
  toTwitter?: string;
  relative?: boolean;
}) {
  const lwrGh = input.github.toLowerCase();
  const lwrTw = input.twitter.toLowerCase();;
  const query = new URLSearchParams();
  if (lwrGh === lwrTw) {
    query.set("name", lwrGh);
  }
  else {
    query.set("github", lwrGh);
    query.set("twitter", lwrTw);
  }
  if (input.toGithub && input.toTwitter && input.toGithub.length > 0 && input.toTwitter.length > 0) {
    if (input.toGithub.toLowerCase() === input.toTwitter.toLowerCase()) {
      query.set("toName", input.toGithub);
    } else {
      query.set("toGithub", input.toGithub);
      query.set("toTwitter", input.toTwitter);
    }
  }
  if (input.relative) {
    query.set("rel", "true");
  }
  return `/match?${query.toString()}`
}


export function getMatchPageOgImageUrl(args: {
  userA: HeatmaplessUser;
  userB: HeatmaplessUser;
  relative: boolean;
}) {
  const { userA, userB } = args;
  const queryParams = new URLSearchParams({
    githubA: userA.githubName,
    tweetsA: userA.tweetsSent.toString(),
    commitsA: userA.commitsMade.toString(),
    twitterA: userA.twitterName,
    avatarA: userA.twitterAvatarUrl ?? "",
    displayNameA: userA.twitterDisplayName,
    githubB: userB.githubName,
    tweetsB: userB.tweetsSent.toString(),
    commitsB: userB.commitsMade.toString(),
    twitterB: userB.twitterName,
    avatarB: userB.twitterAvatarUrl ?? "",
    displayNameB: userB.twitterDisplayName,
    rel: args.relative ? "true" : "false",
  });
  return `/api/og/match?${queryParams.toString()}`;
}


// Verified users are users who have their Twitter handle in their GitHub bio, or have the same Twitter and GitHub handle
export function isVerifiedUser(user: Pick<User, "twitterInGithubBio" | "twitterName" | "githubName">): boolean {
  return user.twitterInGithubBio || user.twitterName === user.githubName;
}
