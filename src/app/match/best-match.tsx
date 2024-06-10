/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * v0 by Vercel.
 * @see https://v0.dev/t/0FjhmAlN5Xv
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import { ViewAnotherMatchCardSuggestion } from "../components.client";
import { getMatchSuggestionsBasedOnTotal } from "./utils";
import { Hero } from "./hero";
import { getUser } from "../../server/db/users";

export async function BestMatch(props: {
  github: string;
  twitter: string;
  relative: boolean;
}) {
  const searchingUser = await getUser(props);
  if (!searchingUser) {
    console.error("User not found");
    return null;
  }

  const suggestions = await getMatchSuggestionsBasedOnTotal(searchingUser);
  const bestMatch = suggestions.shift();

  if (!bestMatch) {
    console.error("No match found");
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-grow flex-col items-center ">
      <h1 className="max-w-2xl py-4 text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">
        The best cofounder for {searchingUser.twitterDisplayName} is...
      </h1>
      <Hero
        leftUser={searchingUser}
        matchedUser={bestMatch}
        relative={props.relative}
      />
      <div className="grid grid-cols-1 gap-4 pb-48 pt-32 md:grid-cols-3 ">
        {suggestions.map((user) => (
          <ViewAnotherMatchCardSuggestion
            key={user.twitterId}
            suggestedUser={user}
            rootUser={searchingUser}
          />
        ))}
      </div>
    </div>
  );
}
