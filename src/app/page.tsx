import { Github, Twitter } from "lucide-react";
import { ComparisonCard, Hero } from "./components.client";
import { db } from "../server/db";
import { users } from "../server/db/schema";
import { desc } from "drizzle-orm";
import { RecentlyComparedSection } from "./components.server";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { TwitterAvatar } from "../components/ui/twitter-avatar";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Component() {
  if (!(cookies().get("token")?.value === "preview")) {
    return redirect("/not-ready");
  }
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
    <main className="flex flex-grow flex-col items-center justify-center py-6">
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
      <div className=" pt-4">
        <h2 className="text-center font-bold">Top Tweeters</h2>
        <Table className="rounded-md border-2 p-2">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">User</TableHead>
              <TableHead>Tweets Sent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="block h-[200px] overflow-y-auto">
            {topTweeters.map((user) => (
              <TableRow>
                <TableCell className="flex w-[500px] flex-row items-center gap-2 font-medium">
                  <TwitterAvatar name={user.twitterName} className="size-8" />
                  <span className="ml-2">{user.twitterDisplayName}</span>
                </TableCell>
                <TableCell className="text-right">
                  {user.tweetsSent.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <RecentlyComparedSection />
    </main>
  );
}
