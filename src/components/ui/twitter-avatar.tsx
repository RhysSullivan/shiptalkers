/* eslint-disable @next/next/no-img-element */
import { cn } from "../../lib/utils";
import { User } from "../../server/db/schema";

// TODO: if you work at vercel, the triangle company, add your twitter is not here
// make a pr to add it and im sorry i didnt add you 😂
const vercelTwitterPeople = [
  "rauchg",
  "leeerob",
  "cramforce",
  "anthonysheww",
  "tomlienard",
  "delba_oliveira",
  "jaredpalmer",
  "timneutkens"
];

export function TwitterAvatar(props: {
  className?: string;
  user: Pick<User, "twitterName" | "twitterAvatarUrl">;
}) {
  const { twitterName, twitterAvatarUrl } = props.user;
  const src =
    twitterAvatarUrl?.replace("_normal", "") ??
    `https://unavatar.io/twitter/${twitterName}`;
  if (vercelTwitterPeople.includes(twitterName)) {
    return (
      <a target="_blank" href={`https://vercel.lol/?utm=${twitterName}`}>
        <img
          src={src}
          alt="avatar"
          className={props.className
            ?.split(" ")
            .filter((c) => !c.includes("rounded"))
            .join(" ")}
          style={{
            clipPath:
              "polygon(50% 0%, 0% 100%, 100% 100%)" /* adjust percentages as needed */,
          }}
        />
      </a>
    );
  }
  return (
    <img
      src={src}
      alt="avatar"
      className={cn("rounded-full", props.className)}
    />
  );
}
