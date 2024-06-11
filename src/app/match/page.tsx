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
import { ViewAnotherMatchCardSuggestion } from "../components.client";
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
  const userB = specificUser ?? suggestions.shift();
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
  return { userA, userB, relative, suggestions, og, url, compareTo };
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
    if (data === "no first user") {
      return <div>Invalid URL {JSON.stringify(props.searchParams)}</div>;
    }
    if (data === "no second user") {
      return <div>Invalid URL {JSON.stringify(props.searchParams)}</div>;
    }
  }

  const { userA, userB, relative, suggestions, og, url, compareTo } = data;
  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-grow flex-col items-center gap-4">
      {!compareTo && (
        <>
          <h1 className="max-w-2xl py-4 text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">
            The best cofounder for {userA.twitterDisplayName} is...
          </h1>
          <BestMatch matchedUser={userB} />
        </>
      )}
      <MatchCard leftUser={userA} matchedUser={userB} relative={relative} />
      <TweetBox
        src={og}
        text={`@${userA.twitterName} and @${userB.twitterName} are a ${
          relative
            ? getMatchPercentRelative(userA, userB)
            : getMatchPercentTotal(userA, userB)
        }% match to be cofounders! \n\n${url}`}
      />
      <div className="pt-32 text-center">
        <h2 className="pb-8 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Compare against another user
        </h2>
        <FindAMatch
          defaultUserAGithub={userA.githubName}
          defaultUserATwitter={userA.twitterName}
        />
      </div>
      <div className="w-full pt-16 text-start">
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
