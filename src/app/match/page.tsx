/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * v0 by Vercel.
 * @see https://v0.dev/t/0FjhmAlN5Xv
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import {
  getMatchPercentRelative,
  getMatchPercentTotal,
  parse,
  type Props,
} from "../utils";
import { getUser } from "../../server/db/users";
import { BestMatch, MatchCard } from "./hero";
import { getMatchSuggestionsBasedOnTotal } from "./utils";
import {
  CompareInput,
  ViewAnotherMatchCardSuggestion,
} from "../components.client";
import { Home } from "./home";
import { FindAMatch } from "./input";
import { TweetBox } from "../../components/ui/tweet-box";
import { getMatchPageOgImageUrl, getMatchPageUrl } from "../../lib/utils";
export const revalidate = 3600; // revalidate at most every hour

type AAAA = {
  searchParams:
    | {
        toGithub: string;
        toTwitter: string;
      }
    | {
        toName: string;
      };
};

type SpecificCompareProps = Props &
  AAAA & {
    searchParams: {
      rel?: string;
    };
  };

function parse2ElectricBoogaloo(props: SpecificCompareProps) {
  const hasToName = "toName" in props.searchParams;
  const hasToGithub = "toGithub" in props.searchParams;
  if (!hasToName && !hasToGithub) {
    return;
  }

  return "toName" in props.searchParams
    ? {
        toGithub: props.searchParams.toName.toLowerCase(),
        toTwitter: props.searchParams.toName.toLowerCase(),
      }
    : {
        toGithub: props.searchParams.toGithub.toLowerCase(),
        toTwitter: props.searchParams.toTwitter.toLowerCase(),
      };
}

import DataLoader from "dataloader";
import { Metadata } from "next";

async function getData(props: SpecificCompareProps) {
  if (!props.searchParams || Object.keys(props.searchParams).length === 0) {
    return "home";
  }
  const { github, twitter } = parse(props);
  const compareTo = parse2ElectricBoogaloo(props);

  const relative = props.searchParams.rel
    ? props.searchParams.rel === "true"
    : false;

  const [userA, specificUser] = await Promise.all([
    getUser({ github, twitter }),
    compareTo &&
      getUser({
        github: compareTo.toGithub,
        twitter: compareTo.toTwitter,
      }),
  ]);
  if (!userA) {
    return "no first user";
  }
  const suggestions = await getMatchSuggestionsBasedOnTotal(userA);
  const userB = compareTo ? specificUser : suggestions.shift();
  if (!userB) {
    return "no second user";
  }

  const url = `https://shiptalkers.dev${getMatchPageUrl({
    github: userA.githubName,
    twitter: userA.twitterName,
    relative,
    toGithub: userB.githubName,
    toTwitter: userB.twitterName,
  })}`;
  const og = `https://shiptalkers.dev${getMatchPageOgImageUrl({
    userA,
    userB,
    relative,
  })}`;
  return {
    userA,
    userB,
    relative,
    suggestions,
    og,
    url,
    compareTo,
    github: github,
    twitter: twitter,
    toTwitter: compareTo?.toTwitter,
    toGithub: compareTo?.toGithub,
  };
}

const dataloader = new DataLoader(
  // @ts-expect-error - this is a hack to make the types work
  async (props: SpecificCompareProps[]) => {
    return Promise.all(props.map(getData));
  },
  { cacheKeyFn: (props) => JSON.stringify(props) },
);

export async function generateMetadata(
  props: SpecificCompareProps,
): Promise<Metadata> {
  const data = await dataloader.load(props);
  if (typeof data === "string") {
    if (data == "home") {
      return {
        openGraph: {
          title: `Find a cofounder - Shiptalkers.dev`,
          description: `Find a cofounder based on your GitHub and Twitter activity`,
        },
      };
    }
    return {};
  }
  const { userA, userB, relative, og } = data;
  return {
    openGraph: {
      images: [{ url: og }],
      title: `${userA.twitterDisplayName} and ${userB.twitterDisplayName} Cofounder Compatibility - Shiptalkers.dev`,
      description: `${userA.twitterDisplayName} and ${
        userB.twitterDisplayName
      } are a ${
        relative
          ? getMatchPercentRelative(userA, userB)
          : getMatchPercentTotal(userA, userB)
      }% match to be cofounders!`,
    },
  };
}

export default async function Component(
  props: SpecificCompareProps & {
    searchParams: {
      rel?: string;
    };
  },
) {
  const data = await dataloader.load(props);
  if (typeof data === "string") {
    if (data === "home") {
      return <Home />;
    }
    const match = parse(props);
    if (data === "no first user") {
      // center in middle of page, 100% width
      return (
        <div className="mx-auto flex w-full max-w-screen-xl flex-grow flex-col items-center justify-center gap-4">
          <h1 className="max-w-2xl py-4 text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {match.github} not found, first try comparing their tweets to
            commits
          </h1>
          <CompareInput
            defaultGithub={match.github}
            defaultTwitter={match.twitter}
          />
        </div>
      );
    }
    if (data === "no second user") {
      const to = parse2ElectricBoogaloo(props);
      return (
        <div className="mx-auto flex w-full max-w-screen-xl flex-grow flex-col items-center justify-center gap-4">
          <h1 className="max-w-2xl py-4 text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {to!.toGithub} not found, first try comparing their tweets to
            commits
          </h1>
          <span>The first user, {match.github} was found however</span>
          <CompareInput
            defaultGithub={to!.toGithub}
            defaultTwitter={to!.toTwitter}
          />
        </div>
      );
    }
  }

  const { userA, userB, relative, suggestions, og, url, compareTo } = data;
  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-grow flex-col items-center gap-4 ">
      {!compareTo && (
        <>
          <h1 className="max-w-2xl py-4 text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">
            The best cofounder for {userA.twitterDisplayName} is...
          </h1>
          <BestMatch matchedUser={userB} />
        </>
      )}
      <MatchCard leftUser={userA} matchedUser={userB} relative={relative} />
      <div className="pt-8 text-center">
        <TweetBox
          src={og}
          text={`@${userA.twitterName} and @${userB.twitterName} are a ${
            relative
              ? getMatchPercentRelative(userA, userB)
              : getMatchPercentTotal(userA, userB)
          }% match to be cofounders! \n\n${url}`}
        />
      </div>
      <div className="pt-32 text-center">
        <h2 className="pb-8 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Compare against another user
        </h2>
        <FindAMatch
          defaultUserAGithub={userA.githubName}
          defaultUserATwitter={userA.twitterName}
        />
      </div>
      <div className="flex flex-col items-center gap-4 py-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Support my other projects!
        </h2>
        <a
          href="https://www.answeroverflow.com/about?rel=shiptalkers"
          target="_blank"
        >
          <div className="w-32 md:w-40">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              xmlSpace="preserve"
              id="Layer_1"
              x="0"
              y="0"
              style={{
                width: "100%",
              }}
              className="fill-black stroke-black dark:fill-white dark:stroke-white"
              viewBox="0 0 889.9 240.3"
            >
              <g id="TEXT">
                <g>
                  <path d="M89.8 107H60l-5.5 15.2h-9.4l24.7-67.9h10.3l24.6 67.9h-9.4L89.8 107zm-2.6-7.3L74.9 65.2 62.5 99.7h24.7zM157.5 73.4c4.1 4 6.1 9.7 6.1 17.1v31.7h-8.8V91.8c0-5.4-1.3-9.5-4-12.3-2.7-2.8-6.3-4.3-11-4.3s-8.4 1.5-11.2 4.4c-2.8 2.9-4.2 7.2-4.2 12.8v29.7h-8.9V68.4h8.9V76c1.8-2.7 4.2-4.9 7.2-6.4s6.4-2.3 10-2.3c6.6.2 11.9 2.1 15.9 6.1zM186.1 120.9c-3.3-1.4-5.9-3.4-7.7-5.9-1.9-2.5-2.9-5.4-3.1-8.7h9.2c.3 2.7 1.5 4.9 3.8 6.6 2.3 1.7 5.2 2.5 8.9 2.5 3.4 0 6.1-.8 8-2.3 2-1.5 2.9-3.4 2.9-5.7 0-2.4-1-4.1-3.1-5.2-2.1-1.1-5.3-2.3-9.7-3.4-4-1-7.2-2.1-9.8-3.2-2.5-1.1-4.7-2.7-6.5-4.8-1.8-2.1-2.7-4.9-2.7-8.4 0-2.7.8-5.3 2.5-7.5 1.6-2.3 4-4.1 7-5.4 3-1.3 6.4-2 10.3-2 5.9 0 10.8 1.5 14.4 4.5 3.7 3 5.6 7.1 5.9 12.4h-8.9c-.2-2.8-1.3-5.1-3.4-6.8-2.1-1.7-4.8-2.5-8.3-2.5-3.2 0-5.8.7-7.6 2.1-1.9 1.4-2.8 3.2-2.8 5.4 0 1.8.6 3.2 1.7 4.4 1.1 1.1 2.6 2.1 4.3 2.7 1.7.7 4.1 1.5 7.2 2.3 3.9 1 7 2.1 9.4 3.1 2.4 1 4.5 2.5 6.2 4.6 1.7 2 2.6 4.7 2.7 7.9 0 2.9-.8 5.6-2.5 7.9-1.6 2.4-3.9 4.2-6.9 5.5-3 1.3-6.4 2-10.2 2-4.2.1-7.9-.7-11.2-2.1zM300.9 68.4l-16.8 53.7H275l-13-42.6-12.9 42.6h-9.2L223 68.4h9.1l12.4 45.1 13.3-45.1h9.1l13 45.2 12.2-45.2h8.8zM358.5 98.6h-42.9c.3 5.3 2.1 9.4 5.4 12.4 3.3 3 7.3 4.5 12 4.5 3.9 0 7.1-.9 9.7-2.7 2.6-1.8 4.4-4.2 5.4-7.2h9.6c-1.4 5.2-4.3 9.4-8.6 12.6-4.3 3.2-9.7 4.9-16.1 4.9-5.1 0-9.7-1.1-13.7-3.4s-7.2-5.5-9.5-9.8c-2.3-4.2-3.4-9.1-3.4-14.7s1.1-10.4 3.3-14.6c2.2-4.2 5.3-7.4 9.4-9.7 4-2.3 8.6-3.4 13.9-3.4 5.1 0 9.6 1.1 13.5 3.3 3.9 2.2 6.9 5.3 9.1 9.2 2.1 3.9 3.2 8.3 3.2 13.2 0 1.7-.1 3.5-.3 5.4zm-11.2-16c-1.5-2.5-3.5-4.3-6.1-5.6-2.6-1.3-5.4-1.9-8.6-1.9-4.5 0-8.4 1.4-11.5 4.3-3.2 2.9-5 6.9-5.4 12h33.9c0-3.4-.8-6.3-2.3-8.8zM386.2 70c2.9-1.7 6.5-2.5 10.6-2.5v9.2h-2.4c-10 0-15 5.4-15 16.3v29.2h-8.9V68.4h8.9v8.7c1.6-3 3.9-5.4 6.8-7.1z" />
                </g>
                <g>
                  <path d="M429.1 120.2c-5.5-3.1-9.9-7.4-13.1-12.8-3.2-5.5-4.8-11.7-4.8-18.6 0-6.8 1.6-13 4.8-18.5 3.2-5.5 7.6-9.8 13.1-12.8 5.5-3.1 11.5-4.6 18.1-4.6 6.6 0 12.7 1.5 18.2 4.6 5.5 3.1 9.8 7.4 13 12.8 3.2 5.5 4.8 11.6 4.8 18.5s-1.6 13.1-4.8 18.6c-3.2 5.5-7.5 9.8-13 12.8-5.5 3.1-11.5 4.6-18.1 4.6-6.6.1-12.7-1.5-18.2-4.6zm29.3-10.8c3.2-1.9 5.7-4.6 7.6-8.2 1.8-3.6 2.7-7.7 2.7-12.4s-.9-8.8-2.7-12.3c-1.8-3.5-4.3-6.2-7.6-8.1-3.2-1.9-6.9-2.8-11.2-2.8-4.2 0-8 .9-11.2 2.8-3.3 1.9-5.8 4.6-7.6 8.1-1.8 3.5-2.7 7.6-2.7 12.3 0 4.7.9 8.8 2.7 12.4 1.8 3.6 4.3 6.3 7.6 8.2 3.3 1.9 7 2.9 11.2 2.9 4.3 0 8-1 11.2-2.9zM514.9 111.2 529 68.4h15l-20.6 55.8h-17.1l-20.5-55.8h15.1l14 42.8zM601.5 100.5h-40.8c.3 4 1.7 7.2 4.2 9.5s5.5 3.4 9.2 3.4c5.2 0 9-2.2 11.2-6.7h15.2c-1.6 5.4-4.7 9.8-9.3 13.2-4.6 3.5-10.2 5.2-16.8 5.2-5.4 0-10.2-1.2-14.5-3.6-4.3-2.4-7.6-5.8-10-10.1-2.4-4.4-3.6-9.4-3.6-15.1 0-5.8 1.2-10.8 3.5-15.2 2.3-4.4 5.6-7.7 9.9-10.1 4.2-2.3 9.1-3.5 14.6-3.5 5.3 0 10.1 1.1 14.2 3.4 4.2 2.3 7.5 5.5 9.8 9.7 2.3 4.2 3.5 9 3.5 14.5.1 2-.1 3.8-.3 5.4zM587.3 91c-.1-3.6-1.4-6.5-3.9-8.7-2.6-2.2-5.7-3.3-9.4-3.3-3.5 0-6.4 1.1-8.8 3.2-2.4 2.1-3.8 5.1-4.4 8.8h26.5z" />
                </g>
                <g>
                  <path d="M628.9 70.1c2.9-1.7 6.3-2.5 10-2.5v14.8h-3.7c-4.4 0-7.8 1-10 3.1s-3.4 5.7-3.4 10.9v27.8h-14.1V68.4h14.1V77c1.8-2.9 4.2-5.3 7.1-6.9zM675 79.9h-9.8v44.2h-14.3V79.9h-6.3V68.4h6.3v-2.8c0-6.8 1.9-11.9 5.8-15.1 3.9-3.2 9.8-4.7 17.6-4.5v11.9c-3.4-.1-5.8.5-7.2 1.7-1.3 1.2-2 3.4-2 6.5v2.3h9.8v11.5z" />
                </g>
                <g>
                  <path d="M695.9 49.6v74.5h-14.1V49.6h14.1zM718.1 121.5c-4.3-2.4-7.7-5.8-10.1-10.1-2.5-4.4-3.7-9.4-3.7-15.1 0-5.7 1.3-10.7 3.8-15.1s6-7.7 10.3-10.1c4.4-2.4 9.2-3.6 14.6-3.6s10.2 1.2 14.6 3.6c4.4 2.4 7.8 5.8 10.3 10.1 2.5 4.4 3.8 9.4 3.8 15.1 0 5.7-1.3 10.7-3.9 15.1-2.6 4.4-6.1 7.7-10.5 10.1-4.4 2.4-9.3 3.6-14.8 3.6-5.3 0-10.1-1.2-14.4-3.6zm21.7-10.6c2.2-1.2 4-3.1 5.4-5.6 1.3-2.5 2-5.5 2-9.1 0-5.3-1.4-9.4-4.2-12.2-2.8-2.9-6.2-4.3-10.2-4.3s-7.4 1.4-10.1 4.3c-2.7 2.9-4.1 6.9-4.1 12.2 0 5.3 1.3 9.4 4 12.2 2.7 2.9 6 4.3 10 4.3 2.5.1 4.9-.6 7.2-1.8zM847.4 68.4l-16.3 55.8h-15.2l-10.2-39-10.2 39h-15.3l-16.4-55.8h14.3l9.9 42.5 10.7-42.5h14.9l10.5 42.4 9.9-42.4h13.4z" />
                </g>
                <path d="M648.6 75.2h6.2v24.5h-6.2z" style={{ fill: "none" }} />
              </g>
              <path
                id="Layer_4"
                d="M420.7 135v16.8c0 3.4-1.1 6.8-3.3 9.5-3.6 4.6-8.4 8-13.8 10-3 1.1-6.2 1.7-9.4 1.7H162c-3 0-6 .9-8.5 2.6l-88 58.3c-.2.1-.3 0-.3-.2l.7-61.1H32.5c-4.6 0-9.3-.8-13.6-2.5-3.8-1.4-7.1-3.9-9.6-7.2-1.8-2.4-2.7-5.2-2.7-8.1V29.4c0-4.2 1.2-8.4 3.4-12l.5-.8c2.3-3.7 5.8-6.4 9.8-7.9l.7-.2c3.9-1.3 7.9-2 12-2h363.1c2.6 0 5.3.3 7.8.9l1.9.5c4.3 1.1 8.2 3.6 10.9 7.2 2.4 3.2 3.8 7.1 3.8 11.2l.1 12.2"
                style={{ strokeMiterlimit: 10, strokeWidth: 13, fill: "none" }}
              />
            </svg>
          </div>
        </a>
        <div className="max-w-[500px] text-center text-gray-900 dark:text-gray-100">
          Got a Discord server you want to see on the web and appearing in
          search results? Add Answer Overflow!
        </div>
      </div>
      <div className="w-full pt-8 text-start">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          View more matches
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 pb-48  md:grid-cols-3 ">
        {suggestions.map((user) => (
          <ViewAnotherMatchCardSuggestion
            key={user.twitterId}
            suggestedUser={user}
            relative={relative}
            rootUser={userA}
          />
        ))}
      </div>
    </div>
  );
}
