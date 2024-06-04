import { db } from "../server/db";
import { users } from "../server/db/schema";
import { desc } from "drizzle-orm";
import { ComparisonCard } from "./components.client";
export async function RecentlyComparedSection(props: {
  filterTwitterNames?: string[];
}) {
  try {
    const recentComparisons = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(50)
      .execute();
    return (
      <section className="flex w-full max-w-6xl flex-col items-center justify-center gap-4 rounded-md px-4 py-6 text-center">
        <h2 className="text-2xl font-bold">Recently Compared</h2>
        <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {recentComparisons
            .map((comparison) => {
              if (
                props.filterTwitterNames &&
                props.filterTwitterNames.some(
                  (name) =>
                    comparison.twitterName.toLowerCase() === name.toLowerCase(),
                )
              ) {
                return null;
              }
              return (
                <ComparisonCard key={comparison.twitterId} user={comparison} />
              );
            })
            .filter(Boolean)}
        </div>
      </section>
    );
  } catch (error) {
    console.error(error);
    return (
      <section className="mt-40 flex w-full max-w-6xl flex-col items-center justify-center gap-4 rounded-md px-4 py-6 text-center">
        <h2 className="text-2xl font-bold">Recently Compared</h2>
        <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="text-red-500">Error loading recently compared</div>
        </div>
      </section>
    );
  }
}
