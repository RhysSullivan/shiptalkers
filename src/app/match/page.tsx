/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * v0 by Vercel.
 * @see https://v0.dev/t/0FjhmAlN5Xv
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import { getMatchPercentRelative, parse, type Props } from "../utils";
import { BestMatch } from "./best-match";
import { getUser } from "../../server/db/users";
import { Hero, MatchCard } from "./hero";
import { getMatchSuggestionsBasedOnTotal } from "./utils";
import { ViewAnotherMatchCardSuggestion } from "../components.client";
import { Home } from "./home";

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

type SpecificCompareProps = Props & AAAA;

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

export default async function Component(
  props: SpecificCompareProps & {
    searchParams: {
      rel?: boolean;
    };
  },
) {
  if (!props.searchParams || Object.keys(props.searchParams).length === 0) {
    return <Home />;
  }
  const { github, twitter } = parse(props);
  const compareTo = parse2ElectricBoogaloo(props);
  const relative = !!props.searchParams.rel;
  if (!compareTo) {
    return <BestMatch github={github} twitter={twitter} relative={relative} />;
  }
  const [userA, userB] = await Promise.all([
    getUser({ github, twitter }),
    getUser({
      github: compareTo.toGithub,
      twitter: compareTo.toTwitter,
    }),
  ]);
  if (!userA || !userB) {
    return null;
  }

  const suggestions = await getMatchSuggestionsBasedOnTotal(userA);
  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-grow flex-col items-center ">
      <MatchCard leftUser={userA} matchedUser={userB} />
      <div className="grid grid-cols-1 gap-4 pb-48 pt-32 md:grid-cols-3 ">
        {suggestions.map((user) => (
          <ViewAnotherMatchCardSuggestion
            key={user.twitterId}
            suggestedUser={user}
            rootUser={userA}
          />
        ))}
      </div>
    </div>
  );
}
