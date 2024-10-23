"use client";
import { useState } from "react";
/* eslint-disable @next/next/no-img-element */
import { cn } from "../../lib/utils";
import { User } from "../../server/db/schema";

// TODO: if you work at vercel, the triangle company, add your twitter is not here
// make a pr to add it and im sorry i didnt add you 😂
const vercelianTwitterAccounts = [
  "rauchg",
  "leeerob",
  "cramforce",
  "anthonysheww",
  "tomlienard",
  "delba_oliveira",
  "jaredpalmer",
  "styfle",
  "timneutkens",
];

export function TwitterAvatar(props: {
  className?: string;
  user: Pick<User, "twitterName" | "twitterAvatarUrl">;
}) {
  const { twitterName, twitterAvatarUrl } = props.user;
  const [url, setURL] = useState(
    twitterAvatarUrl?.replace("_normal", "") ??
      `https://unavatar.io/x/${twitterName}`,
  );
  const src = url;
  if (vercelianTwitterAccounts.includes(twitterName)) {
    return (
      <a
        target="_blank"
        href={`https://vercel.lol/?utm=${twitterName}`}
        key={twitterName}
      >
        <img
          src={src}
          alt={`avatar for ${twitterName}`}
          onError={() => {
            if (url.includes("unavatar.io")) return;
            setURL(`https://unavatar.io/x/${twitterName}`);
          }}
          className={
            props.className
              ?.split(" ")
              .filter((c) => !c.includes("rounded"))
              .join(" ") + " shrink-0"
          }
          style={{
            clipPath:
              "polygon(50% 0%, 0% 100%, 100% 100%)" /* adjust percentages as needed */,
          }}
        />
      </a>
    );
  }
  return (
    <object
      type="image/png"
      data={src}
      key={twitterName}
      aria-label={`avatar for ${twitterName}`}
      className={cn("shrink-0 rounded-full", props.className)}
    >
      <img
        src={`https://unavatar.io/x/${twitterName}`}
        key={twitterName}
        alt={`avatar for ${twitterName}`}
        width="150"
        height="150"
      />
    </object>
  );
}
