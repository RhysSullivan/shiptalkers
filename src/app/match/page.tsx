/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * v0 by Vercel.
 * @see https://v0.dev/t/0FjhmAlN5Xv
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import { getMatchPercent, parse, type Props } from "../utils";
import { BestMatch } from "./best-match";
import { getUser } from "../../server/db/users";
import { Hero, MatchCard } from "./hero";
import { getMatchSuggestions } from "./utils";
import { ViewAnotherMatchCardSuggestion } from "../components.client";

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

export default async function Component(props: SpecificCompareProps) {
  const { github, twitter } = parse(props);
  const compareTo = parse2ElectricBoogaloo(props);
  if (!compareTo) {
    return <BestMatch github={github} twitter={twitter} />;
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

  const suggestions = await getMatchSuggestions({ forUser: userA });
  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-grow flex-col items-center ">
      <MatchCard
        leftUser={userA}
        matchedUser={{
          ...userB,
          matchPercent: getMatchPercent(userA, userB).toString(),
        }}
      />
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
