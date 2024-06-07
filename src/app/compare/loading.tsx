"use client";
import { GithubIcon, TwitterIcon } from "lucide-react";
import { SocialData } from "../../components/ui/socialdata";
import Link from "next/link";
import { Skeleton } from "../../components/ui/skeleton";

function StreamingCTAs() {
  return (
    <div className="flex w-full flex-col justify-start py-2">
      <div className="flex flex-row gap-4 text-center text-xl  font-semibold">
        We're streaming in the data now
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
      </div>
      <span>
        While you wait you can{" "}
        <Link
          href="https://twitter.com/intent/follow?screen_name=RhysSullivan"
          className="text-blue-500 hover:underline"
          target="_blank"
        >
          follow me on Twitter
        </Link>
        ,{" "}
        <Link
          href="https://github.com/RhysSullivan/shiptalkers"
          target="_blank"
          className="text-blue-500 hover:underline"
        >
          star the project
        </Link>{" "}
        on GitHub, and{" "}
        <Link
          href="https://www.youtube.com/watch?v=ljMqoUGnskA"
          target="_blank"
          className="text-blue-500 hover:underline"
        >
          touch grass
        </Link>
      </span>
      <span>We're hitting rate limits so things may take a while</span>
      <span>
        If your profile does not look right, open an issue on{" "}
        <Link
          href="https://github.com/RhysSullivan/shiptalkers"
          target="_blank"
          className="text-blue-500 hover:underline"
        >
          GitHub
        </Link>
      </span>
    </div>
  );
}
type Props = {
  searchParams:
    | {
        github: string;
        twitter: string;
      }
    | {
        name: string;
      };
};

function parse(props: Props) {
  return "name" in props.searchParams
    ? {
        github: props.searchParams.name.toLowerCase(),
        twitter: props.searchParams.name.toLowerCase(),
      }
    : {
        github: props.searchParams.github.toLowerCase(),
        twitter: props.searchParams.twitter.toLowerCase(),
      };
}

export default function Loading(props: Props) {
  console.log(props);
  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-grow flex-col items-center  py-8">
      <div className="flex w-full flex-row items-center justify-between gap-4 md:mx-auto">
        <div className="flex flex-col items-start justify-start gap-2 px-2">
          <Skeleton className="size-20 rounded-full md:size-32" />
          <div className="flex flex-col justify-between gap-4 py-4">
            <div className="flex flex-col">
              <div className="flex flex-col">
                <div className="flex flex-row items-center gap-1">
                  <TwitterIcon size={20} />
                  <Skeleton className="h-2 w-10"></Skeleton>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex flex-row items-center gap-1">
                  <GithubIcon size={20} />
                  <Skeleton className="h-2 w-10"></Skeleton>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start justify-start gap-2 px-2">
          <Skeleton className="size-22 rounded-full md:size-32" />

          <div className="flex flex-col justify-between gap-4 py-4">
            <div className="flex flex-col">
              <div className="flex flex-row items-center gap-1">
                <TwitterIcon size={20} />
                <Skeleton className="h-2 w-10"></Skeleton>
              </div>

              <div className="flex flex-row items-center gap-1">
                <GithubIcon size={20} />
                <Skeleton className="h-2 w-10"></Skeleton>
              </div>
            </div>
          </div>
        </div>
      </div>
      <StreamingCTAs />
      <div className="flex w-full flex-row gap-2 py-4 text-start font-semibold">
        <a
          href="https://socialdata.tools/?ref=shiptalkers.dev"
          target="_blank"
          className="flex flex-row gap-2 text-start"
        >
          Powered by <SocialData />
        </a>
      </div>
    </div>
  );
}
