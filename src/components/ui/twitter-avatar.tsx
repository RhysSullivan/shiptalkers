/* eslint-disable @next/next/no-img-element */
import { cn } from "../../lib/utils";

export function TwitterAvatar(props: { className?: string; name: string }) {
  if (props.name === "rauchg") {
    return (
      <img
        src={`https://unavatar.io/twitter/${props.name}`}
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
