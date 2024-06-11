import { Github, HeartIcon, Twitter } from "lucide-react";
import { FindAMatch } from "./input";
import { Tweet } from "react-tweet";
import { db } from "../../server/db";
import { users } from "../../server/db/schema";
import { desc, gt } from "drizzle-orm";
import { getMatchPageUrl, isVerifiedUser } from "../../lib/utils";
import { TwitterAvatar } from "../../components/ui/twitter-avatar";
export async function Home() {
  const recentComparisons = await db
    .select()
    .from(users)
    .where(gt(users.commitsMade, 500))
    .orderBy(desc(users.twitterFollowerCount))
    .limit(200)
    .execute()
    .then((x) => x.filter(isVerifiedUser));
  return (
    <main className="mx-auto flex w-full max-w-screen-2xl flex-grow flex-col items-center justify-center overflow-x-hidden py-6 xl:pt-[calc(30vh-3.25rem)]">
      {/* bg-[linear-gradient(90deg,#8884_1px,transparent_0),linear-gradient(180deg,#8884_1px,transparent_0)] */}
      <div className="absolute left-1/2 top-1/2 -z-10 hidden h-32 w-96 -translate-x-[calc(50%+16rem)] -translate-y-full -rotate-45 rounded-full bg-pink-500/20 blur-[128px] md:block" />
      <div className="absolute left-1/2 top-1/2 -z-10 hidden h-32 w-96 -translate-x-1/2 -translate-y-full -rotate-45 rounded-full bg-purple-500/20 blur-[128px] md:block" />
      <div className="absolute left-1/2 top-1/2 -z-10 hidden h-32 w-96 -translate-x-[calc(50%-16rem)] -translate-y-full -rotate-45 rounded-full bg-blue-500/20 blur-[128px] md:block" />
      <div className="absolute left-0 top-0 -z-20 hidden h-full w-full bg-[radial-gradient(black_1px,_transparent_0)] bg-[length:40px_40px] [mask-image:linear-gradient(165deg,red,transparent_69%)] md:block" />
      <div className="flex w-full max-w-2xl items-center justify-center gap-4 py-4">
        <Github size={64} />
        <HeartIcon size={32} />
        <Twitter size={64} />
      </div>
      <span className="max-w-[600px] text-balance pb-4 text-center opacity-70">
        Matching yappers to shippers
      </span>
      <FindAMatch />
      <div className="flex flex-col justify-center gap-4 px-2 md:flex-row md:gap-16"></div>
      <div className="flex  flex-col items-center py-16">
        <span className=" text-center text-lg font-semibold">
          Support the launch!
        </span>
        <Tweet id={"1800585506096558567"} />
      </div>
      <section className="flex w-full max-w-6xl flex-col items-center justify-center gap-4 rounded-md px-4 py-6 text-center">
        <h2 className="text-2xl font-bold">{"Explore popular cofounders"}</h2>
        <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {recentComparisons
            .map((user) => {
              return (
                <a
                  className="flex flex-row items-center justify-between rounded-md border-2 bg-white p-4 drop-shadow-sm transition-all hover:scale-105 hover:border-blue-500 hover:shadow-lg"
                  href={getMatchPageUrl({
                    github: user.githubName,
                    twitter: user.twitterName,
                  })}
                >
                  <div className="flex flex-row items-start justify-center gap-4">
                    <TwitterAvatar user={user} className="size-24 min-w-24" />
                    <div className="flex h-full flex-col justify-start gap-2 text-start">
                      <h3 className="line-clamp-2 h-full max-w-56 text-wrap text-lg font-bold leading-5">
                        {user.twitterDisplayName}
                      </h3>
                      <div className="flex flex-row items-end justify-between gap-4">
                        <div className="flex h-full flex-col items-start justify-start text-start">
                          <span className="text-sm text-gray-500">
                            @{user.twitterName}
                          </span>
                          <span className="text-sm text-gray-500">
                            {user.twitterFollowerCount.toLocaleString()}{" "}
                            followers
                          </span>
                          <span className="text-sm text-gray-500">
                            {user.tweetsSent.toLocaleString()} tweets
                          </span>
                          <span className="text-sm text-gray-500">
                            {user.commitsMade.toLocaleString()} commits
                          </span>
                        </div>
                        <div className="-mb-4 flex h-full flex-col items-center justify-end pl-4"></div>
                      </div>
                    </div>
                  </div>
                </a>
              );
            })
            .filter(Boolean)}
        </div>
      </section>
    </main>
  );
}
