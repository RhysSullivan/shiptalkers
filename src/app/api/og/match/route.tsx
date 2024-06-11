/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { GitTweetBars } from "../../../../components/ui/git-tweet-bars";
import {
  getMatchPageUrl,
  getPageUrl,
  getRatioText,
} from "../../../../lib/utils";
import { getMatchPercentRelative, getMatchPercentTotal } from "../../../utils";
export const runtime = "edge";
type ParsedUser = {
  github: string;
  twitter: string;
  commits: number;
  tweets: number;
  avatar: string;
  displayName: string;
};

function isValidUser(user: {
  github: string | null;
  twitter: string | null;
  commits: number;
  tweets: number;
  avatar: string | null;
  displayName: string | null;
}): user is ParsedUser {
  return (
    user.github !== null &&
    user.twitter !== null &&
    user.commits !== null &&
    user.tweets !== null &&
    user.avatar !== null &&
    user.displayName !== null
  );
}

export async function GET(req: Request) {
  // get github, twitter, commits, tweets
  const parsed = new URL(req.url).searchParams;
  const userA = {
    github: parsed.get("githubA"),
    twitter: parsed.get("twitterA"),
    commits: Number(parsed.get("commitsA")),
    tweets: Number(parsed.get("tweetsA")),
    avatar: parsed.get("avatarA"),
    displayName: parsed.get("displayNameA"),
  };
  const userB = {
    github: parsed.get("githubB"),
    twitter: parsed.get("twitterB"),
    commits: Number(parsed.get("commitsB")),
    tweets: Number(parsed.get("tweetsB")),
    avatar: parsed.get("avatarB"),
    displayName: parsed.get("displayNameB"),
  };
  const relative = parsed.get("rel") === "true";
  if (!isValidUser(userA) || !isValidUser(userB)) {
    return new Response("Missing parameters", { status: 400 });
  }
  const compatible = relative
    ? getMatchPercentRelative(
        {
          commitsMade: userA.commits,
          tweetsSent: userA.tweets,
        },
        {
          commitsMade: userB.commits,
          tweetsSent: userB.tweets,
        },
      )
    : getMatchPercentTotal(
        {
          commitsMade: userA.commits,
          tweetsSent: userA.tweets,
        },
        {
          commitsMade: userB.commits,
          tweetsSent: userB.tweets,
        },
      );

  const UserInfo = (props: {
    twitterAvatarUrl: string | null;
    twitter: string;
    displayName: string;
  }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        height: "100%",
        gap: "20px",
      }}
    >
      <span style={{ fontSize: "2em", fontWeight: "bold" }}>
        {props.displayName}
      </span>
      <object
        type="image/png"
        data={
          props.twitterAvatarUrl?.replace("_normal", "") ??
          `https://unavatar.io/x/${props.twitter}`
        }
        width="180"
        height="180"
        style={{
          width: "180px",
          height: "180px",
          borderRadius: "50%",

          clipPath:
            props.twitter == "rauchg"
              ? "polygon(50% 0%, 0% 100%, 100% 100%)" /* adjust percentages as needed */
              : "none",
        }}
      >
        <img
          src={`https://unavatar.io/x/${props.twitter}`}
          alt={`avatar for ${props.twitter}`}
          width="150"
          height="150"
          style={{
            width: "180px",
            height: "180px",
            borderRadius: "50%",

            clipPath:
              props.twitter == "rauchg"
                ? "polygon(50% 0%, 0% 100%, 100% 100%)" /* adjust percentages as needed */
                : "none",
          }}
        />
      </object>
    </div>
  );

  const barHeight = 500;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "white",
          padding: "40px",
          paddingBottom: "70px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            height: "100%",
            gap: "40px",
            paddingTop: "50px",
            marginBottom: "70px",
            maxWidth: "750px",
          }}
        >
          <UserInfo
            twitter={userA.twitter}
            twitterAvatarUrl={userA.avatar}
            displayName={userA.displayName}
          />
          <GitTweetBars
            smallestBarLast
            user={{ commitsMade: userA.commits, tweetsSent: userA.tweets }}
            otherUser={{ commitsMade: userB.commits, tweetsSent: userB.tweets }}
            barHeight={barHeight}
            relative={relative}
            barWidth={50}
          />
        </div>
        <span
          style={{
            fontSize: "2em",
            fontWeight: "bold",
            textAlign: "center",
            maxWidth: "400px",
          }}
        >
          {compatible}% compatible as cofounders
        </span>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            height: "100%",
            gap: "40px",
            paddingTop: "50px",
            marginBottom: "70px",
            maxWidth: "750px",
          }}
        >
          <GitTweetBars
            user={{ commitsMade: userB.commits, tweetsSent: userB.tweets }}
            otherUser={{ commitsMade: userA.commits, tweetsSent: userA.tweets }}
            barHeight={barHeight}
            relative={relative}
            barWidth={50}
          />
          <UserInfo
            twitter={userB.twitter}
            twitterAvatarUrl={userB.avatar}
            displayName={userB.displayName}
          />
        </div>
        <div
          style={{
            position: "absolute",
            left: "40px",
            bottom: "40px",
            color: "gray",
            display: "flex",
            fontSize: "25px",
          }}
        >
          shiptalkers.dev
          {getMatchPageUrl({
            github: userA.github,
            twitter: userA.twitter,
            relative,
            toGithub: userB.github,
            toTwitter: userB.twitter,
          })}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
