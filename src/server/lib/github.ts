import { parse } from "node-html-parser";
import type { HeatmapData } from "../../lib/utils";
import { readFromCache, writeToCache } from "./cache";



async function fetchGithubHeatmap(name: string): Promise<HeatmapData[]> {
    const cached = await readFromCache<HeatmapData[]>(`${name}-heatmap-github`);
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
            next: {
                revalidate: 60 * 10
            }
        }
    );
    console.log(data.status, data.statusText, url)
    const htmlContent = await data.text();
    const doc = parse(htmlContent);
    const tbody = doc.querySelector("tbody");
    const heatmapData: HeatmapData[] = [];
    if (!tbody) {
        console.error(`Tbody not found in the HTML content for ${name}`)
        throw new Error("Tbody not found in the HTML content");
    }

    // Get all the tr elements inside tbody
    const trElements = tbody.querySelectorAll("tr");

    // Iterate through each tr element
    trElements.forEach((tr) => {
        // Get all the td elements inside each tr
        const tdElements = tr.querySelectorAll("td");

        // Extract and log data from each td
        tdElements.forEach((td) => {
            const date = td.getAttribute("data-date");

            // find in the td elements, the <tool-tip> with the property for=td.id

            const toolTip = tr.querySelector(`[for=${td.id}]`);
            // text can be {number} contributions... or "No contributions"
            const text = toolTip?.text.trim().split(" ")[0];
            if (!text || !date) {
                return;
            }
            const count = !/\D/.test(text) ? parseInt(text) : 0;

            heatmapData.push({
                day: date,
                value: count,
            });
        });
    });
    await writeToCache(`${name}-heatmap-github`, heatmapData);
    return heatmapData;
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
    const data = await fetch(`https://api.github.com/users/${name}`, {
        cache: "force-cache",
    });
    if (!data.ok) {
        console.error(`Failed to fetch Github metadata for ${name} ${data.status}`);
        return;
    } else {
        const json = await data.json() as Promise<GithubMetadata>;
        await writeToCache(`${name}-metadata-github`, json);
        return json;
    }
}

export async function fetchGithubPage(name: string) {
    const [heatmapData, metadata] = await Promise.all([
        fetchGithubHeatmap(name),
        fetchGithubMetadata(name),
    ]);
    return {
        heatmapData,
        metadata,
    };
}