"use client";
import { useRouter } from "next/navigation";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Github, LoaderIcon, Twitter } from "lucide-react";
import type { User } from "../server/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { ChangeEvent, useEffect, useState } from "react";
import { GithubMetadata } from "../server/lib/github";

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

export function Hero() {
  const router = useRouter();
  const [githubUrl, setGithubUrl] = useState<string>("");
  const [twitterUrl, setTwitterUrl] = useState<string | null>(null);
  const [debouncedGithubUrl, setDebouncedGithubUrl] =
    useState<string>(githubUrl);

  const {
    data: profileData,
    error,
    isFetching,
    refetch,
  } = useQuery(
    ["githubProfile", debouncedGithubUrl],
    () => fetchGitHubProfile(debouncedGithubUrl),
    {
      enabled: false, // Disable automatic fetching
    },
  );
  console.log(isFetching);
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
  console.log(profileData);
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setGithubUrl(e.target.value);
  };
  return (
    <form
      className="flex w-full max-w-2xl flex-col items-center justify-center space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        // @ts-expect-error asd
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const githubUrl = e.target[0].value as string;
        // @ts-expect-error asd
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const twitterUrl = e.target[1].value as string;
        // just get the names of both
        const githubName = githubUrl.split("/").pop();
        const twitterName = twitterUrl.split("/").pop();
        if (githubName == twitterName) {
          void router.push(`/compare?name=${githubName}`);
        } else {
          void router.push(
            `/compare?github=${githubName}&twitter=${twitterName}`,
          );
        }
      }}
    >
      <div className="flex w-full max-w-sm items-center space-x-2">
        <Github size={24} />
        <Input
          className="min-w-[300px] max-w-[300px]"
          required
          name="github-url"
          placeholder="GitHub Profile Name"
          value={githubUrl}
          onChange={handleInputChange}
        />
      </div>
      <div className="flex w-full max-w-sm flex-col items-center space-x-2">
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Twitter size={24} />
          <Input
            className="min-w-[300px] max-w-[300px]"
            name="twitter-url"
            required
            defaultValue={profileData?.twitter_username ?? ""}
            placeholder="Twitter Profile Name"
          />
          {/* spinner if loading, slow speed */}
          {isFetching && (
            <LoaderIcon size={24} className="spin-slow animate-spin" />
          )}
        </div>
        <div className="h-[30px] w-full">
          {profileData?.twitter_username && (
            <span className="mx-auto w-full  text-sm text-gray-500">
              *Autofilled with twitter from GitHub bio
            </span>
          )}
        </div>
      </div>

      <Button className="mt-4" type="submit">
        Submit
      </Button>
    </form>
  );
}

export function ComparisonCard(props: { user: User }) {
  const { user } = props;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        <img
          src={`https://unavatar.io/twitter/${user.twitterName}`}
          width="100"
          height="100"
        />
        <p>Card Content</p>
      </CardContent>
      <CardFooter>
        <p>Card Footer</p>
      </CardFooter>
    </Card>
  );
}
