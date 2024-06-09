import { Github, Twitter } from "lucide-react";
import { Hero } from "./components.client";
import { db } from "../server/db";
import { HeatmaplessUser, users } from "../server/db/schema";
import { desc, gt } from "drizzle-orm";
import { BrowseSection } from "./components.server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { TwitterAvatar } from "../components/ui/twitter-avatar";
import { ScrollArea } from "../components/ui/scroll-area";
import Link from "next/link";
import { getPageUrl, isVerifiedUser } from "../lib/utils";
import { Tweet } from "react-tweet";
import { Button } from "../components/ui/button";

export const revalidate = 600; // 10 minutes

function TopTable(props: {
  mode: "commits" | "tweets";
  users: HeatmaplessUser[];
}) {
  return (
    <div className="pt-4">
      <h2 className="text-center font-bold">
        {props.mode === "tweets" ? "Top Yappers" : "Top Contributors"}
      </h2>
      <ScrollArea className="h-[400px] rounded-md border bg-gradient-to-b from-neutral-100 to-white">
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
                  <div className="flex flex-row items-center gap-2 font-medium">
                    <TwitterAvatar user={user} className="size-8" />
                    <Link
                      href={getPageUrl({
                        github: user.githubName,
                        twitter: user.twitterName,
                      })}
                      className="ml-2 hover:underline"
                    >
                      {user.twitterDisplayName}
                    </Link>
                  </div>
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
    .where(gt(users.commitsMade, 1000))
    .orderBy(desc(users.tweetsSent))
    .limit(200)
    .execute();
  const topCommitters = await db
    .select()
    .from(users)
    .orderBy(desc(users.commitsMade))
    .limit(200)
    .execute();

  return (
    <main className="mx-auto flex w-full max-w-screen-2xl flex-grow flex-col items-center justify-center overflow-x-hidden py-6 xl:pt-[calc(30vh-3.25rem)]">
      {/* bg-[linear-gradient(90deg,#8884_1px,transparent_0),linear-gradient(180deg,#8884_1px,transparent_0)] */}
      <div className="absolute left-1/2 top-1/2 -z-10 hidden h-32 w-96 -translate-x-[calc(50%+16rem)] -translate-y-full -rotate-45 rounded-full bg-pink-500/20 blur-[128px] md:block" />
      <div className="absolute left-1/2 top-1/2 -z-10 hidden h-32 w-96 -translate-x-1/2 -translate-y-full -rotate-45 rounded-full bg-purple-500/20 blur-[128px] md:block" />
      <div className="absolute left-1/2 top-1/2 -z-10 hidden h-32 w-96 -translate-x-[calc(50%-16rem)] -translate-y-full -rotate-45 rounded-full bg-blue-500/20 blur-[128px] md:block" />
      <div className="absolute left-0 top-0 -z-20 hidden h-full w-full bg-[radial-gradient(black_1px,_transparent_0)] bg-[length:40px_40px] [mask-image:linear-gradient(165deg,red,transparent_69%)] md:block" />
      <div className="flex w-full max-w-2xl items-center justify-center gap-4 py-4">
        <Github size={64} />
        <h2 className="-ml-1.5 text-4xl font-bold">/</h2>
        <Twitter size={64} />
      </div>

      <div className="flex flex-col gap-4 py-4">
        <span className="text-balance text-center">🌟 New! 🌟</span>
        <Button asChild variant={"blue"} className="rounded-lg">
          <Link href={"/match"}>Find a cofounder</Link>
        </Button>
      </div>

      <span className="max-w-[600px] text-balance pb-4 text-center opacity-70">
        Find out if the person you're losing an argument to on Twitter actually
        ships code or if it's all just shiptalk
      </span>
      <Hero />
      <div className="flex flex-col justify-center gap-4 px-2 md:flex-row md:gap-16">
        <TopTable mode="tweets" users={topTweeters} />
        <TopTable mode="commits" users={topCommitters} />
      </div>
      <div className="flex  flex-col items-center pt-10">
        <span className="text-center text-lg font-semibold">
          Support the launch!
        </span>
        <Tweet id={"1798512543574708731"} />
      </div>
      <BrowseSection sort="popular" />
    </main>
  );
}
