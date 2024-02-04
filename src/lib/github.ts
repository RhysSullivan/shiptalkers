import { parse } from "node-html-parser";
import type { HeatmapData } from "./utils";

export async function fetchGithubPage(name: string) {
    const data = await fetch(
        `https://github.com/${name}?tab=overview&from=2023-01-01`,
    );
    const htmlContent = await data.text();
    const doc = parse(htmlContent);

    const tbody = doc.querySelector("tbody");

    const heatmapData: HeatmapData[] = [];

    if (tbody) {
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
    } else {
        console.error("Tbody not found in the HTML content");
    }
    const avatar = doc.querySelector("img.avatar")?.getAttribute("src");

    // From the above snippet, extract twitter url
    const validTwitter = doc.querySelector("a[href^='https://twitter.com']")?.getAttribute("href");

    return {
        avatar,
        heatmapData,
        twitter: {
            url: validTwitter,
            displayName: validTwitter?.split("/").pop(),
        },
    };
}