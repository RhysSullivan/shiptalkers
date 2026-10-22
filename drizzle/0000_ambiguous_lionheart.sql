CREATE TABLE `tweetstocommits_user` (
	`twitterFollowerCount` integer DEFAULT 0 NOT NULL,
	`githubFollowerCount` integer DEFAULT 0 NOT NULL,
	`tweetsSent` integer DEFAULT 0 NOT NULL,
	`commitsMade` integer DEFAULT 0 NOT NULL,
	`twitterId` text,
	`twitterDisplayName` text NOT NULL,
	`githubName` text COLLATE NOCASE NOT NULL,
	`twitterName` text COLLATE NOCASE NOT NULL,
	`twitterAvatarUrl` text,
	`twitterInGithubBio` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()),
	`heatmapData` text,
	PRIMARY KEY(`githubName`, `twitterName`)
);
--> statement-breakpoint
CREATE INDEX `tweetstocommits_user_createdAt_idx` ON `tweetstocommits_user` (`createdAt`);--> statement-breakpoint
CREATE INDEX `tweetstocommits_user_followers_idx` ON `tweetstocommits_user` (`twitterFollowerCount`);--> statement-breakpoint
CREATE INDEX `tweetstocommits_user_commits_idx` ON `tweetstocommits_user` (`commitsMade`);--> statement-breakpoint
CREATE INDEX `tweetstocommits_user_tweets_idx` ON `tweetstocommits_user` (`tweetsSent`);