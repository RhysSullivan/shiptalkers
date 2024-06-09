"use client";
import { GithubIcon, TwitterIcon } from "lucide-react";
import { SocialData } from "../../components/ui/socialdata";
import { Skeleton } from "../../components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-grow flex-col  py-8">
      <div className="flex w-full flex-row items-center justify-between gap-4 md:mx-auto">
        <div className="flex flex-col items-start justify-start gap-2 px-2">
          <Skeleton className="size-20 rounded-full md:size-32" />
          <div className="flex flex-col justify-between gap-4 py-4">
            <div className="flex flex-col">
              <div className="flex flex-col">
                <div className="flex flex-row items-center gap-1">
                  <TwitterIcon size={20} />
                  <Skeleton className="h-2 w-20"></Skeleton>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex flex-row items-center gap-1">
                  <GithubIcon size={20} />
                  <Skeleton className="h-2 w-20"></Skeleton>
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
                <Skeleton className="h-2 w-20"></Skeleton>
              </div>

              <div className="flex flex-row items-center gap-1">
                <GithubIcon size={20} />
                <Skeleton className="h-2 w-20"></Skeleton>
              </div>
            </div>
          </div>
        </div>
      </div>
      <span>We're loading in the data now, this can take up to a minute</span>
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
