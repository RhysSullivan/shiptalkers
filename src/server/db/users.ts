import { db } from "./index";
import { users } from "./schema";
import { eq, and } from "drizzle-orm";
export async function getUser(props: {
    github: string;
    twitter: string;
}) {
    const { github, twitter } = props;
    return db
        .select()
        .from(users)
        .where(and(eq(users.githubName, github), eq(users.twitterName, twitter)))
        .then((res) => res[0])
}