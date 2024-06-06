import { revalidatePath } from "next/cache";
import { getPageUrl } from "../../../lib/utils";
import { db } from "../../../server/db";
import { users } from "../../../server/db/schema";
import { and, eq } from "drizzle-orm";
import { deleteGithubContribtionsCache, deleteGithubMetadataCache } from "../../../server/lib/github";
import { deleteTwitterProfileCache } from "../../../server/lib/twitter";


// queryParams: github, twitter
export async function POST(req: Request) {
    // check if authed
    const parsed = new URL(req.url).searchParams;
    const github = parsed.get("github");
    const twitter = parsed.get("twitter");
    const token = parsed.get("token");
    const reset = parsed.get("reset");
    if (token !== process.env.INVALIDATE_TOKEN) {
        console.log("Unauthorized", token, process.env.INVALIDATE_TOKEN)
        return new Response("Unauthorized", { status: 401 });
    }
    if (!github || !twitter) {
        return new Response("Missing parameters", { status: 400 });
    }
    if (reset) {
        console.log(`Manually resetting ${github} ${twitter}`)
        // yes i know about Promise.all
        await db.delete(users).where(and(eq(users.twitterName, twitter), eq(users.githubName, github)))
        await deleteGithubContribtionsCache(github)
        await deleteGithubMetadataCache(github)
        await deleteTwitterProfileCache(twitter)
    }
    revalidatePath(getPageUrl({
        github,
        twitter,
    }))
    return Response.json({ revalidated: true, now: Date.now() })
}
