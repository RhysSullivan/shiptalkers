/* eslint-disable @next/next/no-img-element */
import { cn } from "../../lib/utils";

export function TwitterAvatar(props: { className?: string; name: string }) {
  return (
    <img
      src={`https://unavatar.io/twitter/${props.name}`}
      alt={`Avatar for ${props.name}`}
      className={cn("rounded-full", props.className)}
    />
  );
}
