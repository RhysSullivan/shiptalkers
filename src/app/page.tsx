import { Github, Twitter } from "lucide-react";
import { ComparisonCard, Hero } from "./components";
import { db } from "../server/db";
import { users } from "../server/db/schema";
import { desc } from "drizzle-orm";

export default async function Component() {
  const recentComparisons = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(50)
    .execute();
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

      <section className="mt-40 flex w-full max-w-6xl flex-col items-center justify-center gap-4 rounded-md px-4 py-6 text-center">
        <h2 className="text-2xl font-bold">Recently Compared</h2>
        <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {recentComparisons.map((comparison) => {
            return (
              <ComparisonCard key={comparison.twitterId} user={comparison} />
            );
          })}
        </div>
      </section>
    </main>
  );
}
