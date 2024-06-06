import { revalidatePath } from "next/cache";
import { getPageUrl } from "../../../lib/utils";


// queryParams: github, twitter
export async function POST(req: Request) {
    const parsed = new URL(req.url).searchParams;
    const github = parsed.get("github");
    const twitter = parsed.get("twitter");
    if (!github || !twitter) {
        return new Response("Missing parameters", { status: 400 });
    }
    revalidatePath(getPageUrl({
        github,
        twitter,
    }))
}
