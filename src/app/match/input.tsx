/* eslint-disable @typescript-eslint/no-unsafe-member-access */
"use client";
import { useRouter } from "next/navigation";
import { Github, HelpCircleIcon, LoaderIcon, Twitter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ChangeEvent, useEffect, useState } from "react";
import { GithubMetadata } from "../../server/lib/github";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { getMatchPageUrl } from "../../lib/utils";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";

// Debounce function
// eslint-disable-next-line @typescript-eslint/ban-types
const debounce = (func: Function, delay: number) => {
  let debounceTimer: NodeJS.Timeout;
  return function (...args: unknown[]) {
    // @ts-expect-error asd
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-this-alias
    const context = this;
    clearTimeout(debounceTimer);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    debounceTimer = setTimeout(() => func.apply(context, args), delay);
  };
};

const fetchGitHubProfile = async (
  username: string,
): Promise<GithubMetadata> => {
  if (username.trim() === "") {
    throw new Error("No username provided");
  }
  const response = await fetch(`https://api.github.com/users/${username}`);
  if (!response.ok) {
    throw new Error("Profile not found");
  }
  return response.json() as Promise<GithubMetadata>;
};

function UsernameInput(props: {
  githubUrl: string;
  setGithubUrl: (value: string) => void;
  header: React.ReactNode;
  required?: boolean;
}) {
  const { githubUrl, setGithubUrl } = props;
  const [debouncedGithubUrl, setDebouncedGithubUrl] =
    useState<string>(githubUrl);
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setGithubUrl(e.target.value);
  };

  const {
    data: profileData,
    isFetching,
    refetch,
  } = useQuery(
    [`githubProfile-${githubUrl}`, debouncedGithubUrl],
    () => fetchGitHubProfile(debouncedGithubUrl),
    {
      enabled: false, // Disable automatic fetching
    },
  );

  const debouncedFetch = debounce(() => {
    setDebouncedGithubUrl(githubUrl);
  }, 500);

  useEffect(() => {
    debouncedFetch();
  }, [githubUrl, debouncedFetch]);

  useEffect(() => {
    if (debouncedGithubUrl.trim() !== "") {
      void refetch();
    }
  }, [debouncedGithubUrl, refetch]);
  return (
    <div className="flex w-full max-w-2xl flex-col items-center justify-center space-y-4">
      {props.header}
      <div className="flex w-full max-w-sm items-center gap-x-2">
        <Github size={24} />
        <Input
          className="w-full min-w-[300px] rounded-lg bg-white/70 backdrop-blur-sm backdrop-saturate-200"
          required={props.required}
          name="github-url"
          placeholder="GitHub Profile Name"
          value={githubUrl}
          onChange={handleInputChange}
        />
        <div className="w-6" />
      </div>
      <div className="flex w-full max-w-sm flex-col items-center space-x-2">
        <div className="flex w-full max-w-sm items-center gap-x-2">
          <Twitter size={24} />
          <Input
            className="w-full min-w-[300px] rounded-lg bg-white/70 backdrop-blur-sm backdrop-saturate-200"
            name="twitter-url"
            required={props.required}
            defaultValue={profileData?.twitter_username ?? ""}
            placeholder="Twitter Profile Name"
          />
          {/* spinner if loading, slow speed */}
          {isFetching ? (
            <LoaderIcon size={24} className="spin-slow animate-spin" />
          ) : (
            <div className="w-6" />
          )}
        </div>
        <div className="h-[15px] w-full">
          {profileData?.twitter_username && (
            <span className="mx-auto w-full text-sm text-gray-500">
              *Autofilled with twitter from GitHub bio
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function FindAMatch() {
  const router = useRouter();
  const [userAGithub, setUserAGithub] = useState<string>("");
  const [userBGithub, setUserBGithub] = useState<string>("");
  return (
    <form
      className="flex flex-col items-center"
      onSubmit={(e) => {
        e.preventDefault();
        // @ts-expect-error asd
        const relativeMatch = !!e.target[2].checked as boolean;
        // @ts-expect-error asd
        const firstGithub = e.target[3].value as string;
        // @ts-expect-error asd
        const firstTwitter = e.target[4].value as string;
        // @ts-expect-error asd
        const maybeSecondGithub = e.target[5].value as string;
        // @ts-expect-error asd
        const maybeSecondTwitter = e.target[6].value as string;

        const firstGithubName = firstGithub.split("/").pop()!.trim();
        const firstTwitterName = firstTwitter.split("/").pop()!.trim();
        const secondGithubName = maybeSecondGithub.split("/").pop()!.trim();
        const secondTwitterName = maybeSecondTwitter.split("/").pop()!.trim();
        if (!firstGithubName || !firstTwitterName) return;
        void router.push(
          getMatchPageUrl({
            github: firstGithubName,
            twitter: firstTwitterName,
            toGithub: secondGithubName,
            toTwitter: secondTwitterName,
            relative: relativeMatch,
          }),
        );
      }}
    >
      <div className="flex items-center gap-4">
        <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger>
              <HelpCircleIcon size={20} />
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px]">
              Use this if you want to compare based on percentage of tweets and
              commits, rather than total. Useful for comparing users with
              different activity levels.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Label htmlFor="relative">Relative Match</Label>
        <Switch id="relative" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UsernameInput
          header={
            <div className="flex flex-col items-center gap-2">
              <span>First User</span>
              <span className="text-sm text-gray-500">Required</span>
            </div>
          }
          githubUrl={userAGithub}
          setGithubUrl={setUserAGithub}
          // required
        />
        <div className="ml-8">
          <UsernameInput
            header={
              <div className="flex flex-col items-center gap-2">
                <span>Second User</span>
                <span className="text-sm text-gray-500">
                  *Optional, leave empty to get best match
                </span>
              </div>
            }
            githubUrl={userBGithub}
            setGithubUrl={setUserBGithub}
          />
        </div>
      </div>

      <Button type="submit" variant={"blue"}>
        Submit
      </Button>
    </form>
  );
}
