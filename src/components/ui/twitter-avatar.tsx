/* eslint-disable @next/next/no-img-element */
import { cn } from "../../lib/utils";

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
];

export function TwitterAvatar(props: { className?: string; name: string }) {
  if (vercelTwitterPeople.includes(props.name)) {
    return (
      <a target="_blank" href={`https://vercel.lol/?utm=${props.name}`}>
        <img
          src={`https://unavatar.io/twitter/rauchg`}
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
      src={`https://unavatar.io/twitter/${props.name}`}
      alt="avatar"
      className={cn("rounded-full", props.className)}
    />
  );
}
