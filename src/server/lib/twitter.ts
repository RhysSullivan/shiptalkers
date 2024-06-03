import { TwitterUser } from "../api/routers/types";

export async function fetchTwitterProfile(name: string) {
    const userInfo = await fetch(`https://api.socialdata.tools/twitter/user/${name}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${process.env.SOCIAL_DATA_API_KEY}`,
            Accept: "application/json",
        },
        cache: "force-cache",
    })
    return userInfo.json() as Promise<TwitterUser | undefined>;
}