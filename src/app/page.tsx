import { Github, Twitter } from "lucide-react";
import { Hero } from "./components.client";
import { db } from "../server/db";
import { User, users } from "../server/db/schema";
import { desc } from "drizzle-orm";
import { RecentlyComparedSection } from "./components.server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { TwitterAvatar } from "../components/ui/twitter-avatar";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ScrollArea } from "../components/ui/scroll-area";
import Link from "next/link";
import { getPageUrl, isVerifiedUser } from "../lib/utils";

function TopTable(props: { mode: "commits" | "tweets"; users: User[] }) {
  return (
    <div className="pt-4">
      <h2 className="text-center font-bold">
        {props.mode === "tweets" ? "Top Yappers" : "Top Contributors"}
      </h2>
      <ScrollArea className="h-[400px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="text-center">
                {props.mode === "tweets" ? "Tweets Sent" : "Commits Made"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.users.filter(isVerifiedUser).map((user) => (
              <TableRow key={user.twitterId}>
                <TableCell className="w-[300px]">
                  <Link
                    className="flex flex-row items-center gap-2 font-medium hover:underline"
                    href={getPageUrl({
                      github: user.githubName,
                      twitter: user.twitterName,
                    })}
                  >
                    <TwitterAvatar name={user.twitterName} className="size-8" />
                    <span className="ml-2">{user.twitterDisplayName}</span>
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  {props.mode === "tweets"
                    ? user.tweetsSent.toLocaleString()
                    : user.commitsMade.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

export default async function Component() {
  const topTweeters = await db
    .select()
    .from(users)
    .orderBy(desc(users.tweetsSent))
    .limit(50)
    .execute();
  const topCommitters = await db
    .select()
    .from(users)
    .orderBy(desc(users.commitsMade))
    .limit(50)
    .execute();

  return (
    <main className="mx-auto flex max-w-screen-2xl flex-grow flex-col items-center justify-center py-6 xl:pt-[30vh]">
      <div className="flex w-full max-w-2xl items-center justify-center space-x-4 py-4">
        <Github size={64} />
        <h2 className="text-4xl font-bold">/</h2>
        <Twitter size={64} />
      </div>
      <span className="max-w-[600px] text-balance pb-4 text-center text-xl ">
        Find out if the person you're losing an argument to on Twitter actually
        ships code or if it's all just shiptalk
      </span>
      <Hero />
      <div className="flex flex-col justify-center gap-4 px-2 md:flex-row md:gap-16">
        <TopTable mode="tweets" users={topTweeters} />
        <TopTable mode="commits" users={topCommitters} />
      </div>
      <RecentlyComparedSection />
    </main>
  );
}
