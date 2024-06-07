import { parse } from "node-html-parser";
import { deleteFromCache, readFromCache, writeToCache } from "./cache";



async function fetchTotalContributions(name: string) {
    const cached = await readFromCache<number>(`${name}-github-total-contributions-all-time-v2`);
    if (cached) {
        return cached;
    }
    const url = `https://github.com/${name}?action=show&controller=profiles&tab=contributions&user_id=${name}`;
    const data = await fetch(url,
        {
            headers: {
                connection: "keep-alive",
                "X-Requested-With": "XMLHttpRequest",
            },
        }
    );

    if (!data.ok) {
        console.error(`Failed to fetch Github contributions for ${name} ${data.status} ${url} ${data.statusText}`);
        return;
    }

    const htmlContent = await data.text();
    const doc = parse(htmlContent);
    const yearLinks = doc.querySelectorAll("a[id*='year-link']");

    const years = new Set(Array.from(yearLinks).map(link => link.id.replace('year-link-', '')));

    // TODO: CAN WE RUN IN PARALLEL W/ OUT HITTING RATE LIMIT?

    let total = 0;
    for await (const year of years) {
        const queryParams = new URLSearchParams({
            from: `${year}-01-01`,
            to: `${year}-12-31`,
        });
        const result = await fetch(`https://github.com/users/${name}/contributions?${queryParams.toString()}`);
        if (!result.ok) {
            console.error(`Failed to fetch Github contributions for ${name} ${result.status} ${url} ${result.statusText}`);
            return;
        }
        const content = await result.text();
        const doc2 = parse(content);
        const h2 = doc2.querySelector("h2");
        const match = h2?.innerText.trim().split(" ").at(0)?.replace(',', '')
        if (match) {
            total += parseInt(match);
        } else {
            console.error(`Failed to parse total contributions for ${name}`)
        }
    }
    await writeToCache(`${name}-github-total-contributions-all-time-v2`, total);
    return total;
}

export async function deleteGithubContribtionsCache(name: string) {
    return await deleteFromCache(`${name}-github-total-contributions-all-time-v2`);
}

export type GithubMetadata = {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
    name: string;
    company: string | null;
    blog: string;
    location: string | null;
    email: string | null;
    hireable: boolean | null;
    bio: string | null;
    twitter_username: string | null;
    public_repos: number;
    public_gists: number;
    followers: number;
    following: number;
    created_at: string;
    updated_at: string;
};

async function fetchGithubMetadata(name: string): Promise<GithubMetadata | undefined> {
    const cached = await readFromCache<GithubMetadata>(`${name}-metadata-github`);
    if (cached && !('json' in cached) && 'login' in cached) {
        return cached;
    }
    const data = await fetch(`https://api.github.com/users/${name}`);
    if (!data.ok) {
        console.error(`Failed to fetch Github metadata for ${name} ${data.status}`);
        return;
    } else {
        const json = await data.json() as Promise<GithubMetadata>;
        await writeToCache(`${name}-metadata-github`, json);
        return json;
    }
}

export async function deleteGithubMetadataCache(name: string) {
    return await deleteFromCache(`${name}-metadata-github`);
}

export async function fetchGithubPage(name: string) {
    const [totalContributions, metadata] = await Promise.all([
        fetchTotalContributions(name),
        fetchGithubMetadata(name),
    ]);
    return {
        totalContributions,
        metadata,
    };
}