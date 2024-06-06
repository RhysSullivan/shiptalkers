import { revalidatePath } from "next/cache";
import { getPageUrl } from "../../../lib/utils";


// queryParams: github, twitter
export async function POST(req: Request) {
    // check if authed
    const parsed = new URL(req.url).searchParams;
    const github = parsed.get("github");
    const twitter = parsed.get("twitter");
    const token = parsed.get("token");
    if (token !== process.env.INVALIDATE_TOKEN) {
        console.log("Unauthorized", token, process.env.INVALIDATE_TOKEN)
        return new Response("Unauthorized", { status: 401 });
    }
    if (!github || !twitter) {
        return new Response("Missing parameters", { status: 400 });
    }
    revalidatePath(getPageUrl({
        github,
        twitter,
    }))
    return Response.json({ revalidated: true, now: Date.now() })
}
